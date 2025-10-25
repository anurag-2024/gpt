import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { connectDB } from "@/lib/db/mongodb";
import { Message, Conversation } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { searchMemories, addMemories } from "@/lib/mem0/client";
import type { ChatRequestBody } from "@/types/backend";

// Mark as Node.js runtime for streaming
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/chat
 * Stream AI responses using Vercel AI SDK
 * 
 * Features:
 * - Streaming responses
 * - Context window management
 * - Query-response pairs stored together
 * - Message branching with parent IDs
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Gemini API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables");
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    // Parse request body
    const { messages, conversationId, model = "gemini-2.5-flash", parentMessageId = null, files = [], isTemporaryChat = false }: ChatRequestBody = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // Check if the latest message has image attachments - use vision model
    const lastMessage = messages[messages.length - 1];
    // Check for attachments in both the message and the body
    const attachmentsFromMessage = lastMessage?.experimental_attachments || [];
    const attachmentsFromBody = files || [];
    const allAttachments = attachmentsFromMessage.length > 0 ? attachmentsFromMessage : attachmentsFromBody;
    
    const hasImages = allAttachments.some((att: any) => 
      (att.contentType || att.type)?.startsWith("image/")
    );
    const selectedModel = hasImages ? "gemini-2.5-flash" : model;
  
    // Connect to MongoDB
    await connectDB();

    // Get or create conversation (skip if temporary chat)
    let conversation;
    if (!isTemporaryChat) {
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.userId !== userId) {
          return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }
      } else {
        // Create new conversation
        conversation = await Conversation.create({
          userId,
          title: messages[0]?.content.substring(0, 50) || "New Chat",
          model,
        });
      }
    }

    // Get user's query (last user message)
    const userQuery = messages[messages.length - 1].content;
    
    // Get files from either the message attachments or the body
    const userFiles = allAttachments.map((att: any) => ({
      url: att.url,
      type: att.contentType || att.type,
      name: att.name,
      size: att.size || 0,
    }));
    
    // Calculate depth based on parent message - needed for image generation too
    let depth = 0;
    if (parentMessageId) {
      const parentMsg = await Message.findById(parentMessageId);
      if (parentMsg) {
        depth = parentMsg.depth + 1;
      }
    }
    
    // 🎨 Detect image generation request
    const imageGenKeywords = [
      "generate an image",
      "create an image",
      "draw an image",
      "make an image",
      "generate image",
      "create image",
      "draw image",
      "make image",
      "show me an image",
      "generate a picture",
      "create a picture",
      "draw a picture",
      "make a picture",
      "visualize",
      "illustrate",
    ];
    
    const isImageGenRequest = imageGenKeywords.some(keyword => 
      userQuery.toLowerCase().includes(keyword)
    );
    
    // If this is an image generation request, handle it specially
    if (isImageGenRequest) {
      
      try {
        // Extract the prompt (remove the trigger phrase)
        let imagePrompt = userQuery;
        for (const keyword of imageGenKeywords) {
          imagePrompt = imagePrompt.replace(new RegExp(keyword, "gi"), "").trim();
        }
        
        // If prompt is empty after removal, use the full query
        if (!imagePrompt || imagePrompt.length < 5) {
          imagePrompt = userQuery;
        }
        
        // Call image generation API
        const imageGenResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": req.headers.get("cookie") || "",
          },
          body: JSON.stringify({ prompt: imagePrompt }),
        });
        
        if (!imageGenResponse.ok) {
          throw new Error("Image generation failed");
        }
        
        const imageGenResult = await imageGenResponse.json();
        // Save the user message and assistant response with image
        if (!isTemporaryChat && conversation) {
          const messageData: any = {
            conversationId: conversation._id,
            query: userQuery,
            response: `I've generated an image based on your request.`,
            tokenCount: estimateTokens(userQuery),
            parentMessageId: parentMessageId || null,
            depth: depth,
            branches: [],
            generatedImages: [{
              url: imageGenResult.image.url,
              publicId: imageGenResult.image.publicId,
              caption: imageGenResult.image.caption,
              prompt: imageGenResult.image.originalPrompt,
            }],
          };
          
          const savedMessage = await Message.create(messageData);
            // console.log("✅ Message with generated image saved:", savedMessage._id);
            
          // Update parent message's branches array
          if (parentMessageId) {
            await Message.findByIdAndUpdate(parentMessageId, {
              $addToSet: { branches: savedMessage._id }
            });
          }
          
          // Update conversation metadata
          await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessageAt: new Date(),
          });
        }
        
        // Return a streaming response with the image info (text only, image will be shown via generatedImages field)
        return new Response(
          `0:"I've generated an image based on your request."\nd:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`,
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Vercel-AI-Data-Stream": "v1",
            },
          }
        );
        
      } catch (imageError: any) {
        console.error("❌ Image generation error:", imageError);
        // Fall through to normal chat if image generation fails
      }
    }
    
    // 🧠 Retrieve relevant memories from Mem0 (skip if temporary chat)
    let contextFromMemory = "";
    if (!isTemporaryChat) {
      try {
        const relevantMemories = await searchMemories(userId, userQuery, conversationId);
        
        if (relevantMemories && relevantMemories.length > 0) {
          contextFromMemory = "\n\n[Context from memory]:\n" + 
            relevantMemories
              .map((m: any) => `- ${m.memory}`)
              .join("\n");
        }
      } catch (memError) {
      }
    } else {
      console.log(" Skipping memory retrieval for temporary chat");
    }
    
    // If we have files, create a modified messages array with attachments
    let messagesForGemini = messages;
    if (userFiles.length > 0 && !lastMessage.experimental_attachments) {
      // Convert files to data URLs for experimental_attachments
      const attachmentsForGemini = await Promise.all(
        userFiles.map(async (f: any) => {
          try {
            const response = await fetch(f.url);
            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${f.type};base64,${base64}`;
          
            return {
              name: f.name,
              contentType: f.type,
              url: dataUrl,
            };
          } catch (error) {
            return null;
          }
        })
      );
      
      const validAttachments = attachmentsForGemini.filter(a => a !== null);
      
      if (validAttachments.length > 0) {
        // Use experimental_attachments instead of content array
        messagesForGemini = messages.slice(0, -1).concat({
          ...lastMessage,
          experimental_attachments: validAttachments,
        });
      }
    }

    // Update depth calculation (already done above, just need to update branches)
    if (parentMessageId) {
      // Add this message ID to parent's branches array
      await Message.findByIdAndUpdate(parentMessageId, {
        $addToSet: { branches: null } // Will be updated later with new message ID
      });
    }

    // Trim messages for context window - this preserves experimental_attachments
    let trimmedMessages = trimMessagesForContext(messagesForGemini, 120000);
    
    // 🧠 Inject memory context into the conversation
    if (contextFromMemory) {
      // Add system message with context at the beginning
      const systemMessage = {
        role: "system" as const,
        content: `You are a helpful AI assistant. Use the following context from previous conversations to provide more personalized and contextual responses:${contextFromMemory}\n\nProvide helpful, accurate responses based on the user's query and the context provided.`,
      };
      
      // Insert system message at the beginning if no system message exists
      const hasSystemMessage = trimmedMessages.some(m => m.role === "system");
      if (!hasSystemMessage) {
        trimmedMessages = [systemMessage, ...trimmedMessages];
      } else {
        // Append context to existing system message
        const systemIdx = trimmedMessages.findIndex(m => m.role === "system");
        trimmedMessages[systemIdx].content += contextFromMemory;
      }
    }
    
    
    try {
      let fullResponseText = '';
      let hasStartedStreaming = false;
      
      
      const result = streamText({
        model: google(selectedModel),
        messages: trimmedMessages,
        temperature: 0.7,
        maxTokens: 8192,
        onChunk({ chunk }) {
          
          // Send SSE event on first chunk to immediately hide typing indicator
          if (!hasStartedStreaming) {
            hasStartedStreaming = true;
          }
        },
        async onFinish({ text, usage, finishReason }) {
          
          fullResponseText = text;
          
          // Skip database and memory operations for temporary chats
          if (isTemporaryChat) {
            return;
          }
          
          try {
            // Prepare files in the correct format for MongoDB
            const filesToSave = userFiles.length > 0 ? userFiles.map((f: any) => {
              // Ensure we return a plain object, not a Proxy or anything weird
              return {
                url: String(f.url),
                type: String(f.type),
                name: String(f.name),
                size: Number(f.size) || 0,
              };
            }) : [];
            
            // Save query-response pair as a single message
            const messageData: any = {
              conversationId: conversation!._id,
              query: userQuery,
              response: text,
              tokenCount: usage?.totalTokens || estimateTokens(userQuery + text),
              parentMessageId: parentMessageId || null,
              depth: depth,
              branches: [],
            };
            
            // Only add files if we have any
            if (filesToSave.length > 0) {
              messageData.files = filesToSave;
            }
            
            const savedMessage = await Message.create(messageData);

            if (parentMessageId) {
              await Message.findByIdAndUpdate(parentMessageId, {
                $addToSet: { branches: savedMessage._id }
              });
            }

            // Update conversation metadata
            await Conversation.findByIdAndUpdate(conversation!._id, {
              lastMessageAt: new Date(),
              totalTokens: (conversation!.totalTokens || 0) + (usage?.totalTokens || 0),
            });
            
            // 🧠 Store memories in Mem0 for future context
            try {
              await addMemories(userId, conversation!._id.toString(), [
                { role: "user", content: userQuery },
                { role: "assistant", content: text },
              ]);
            } catch (memError) {
              
            }
            
          } catch (error) {
            console.error("❌ Error saving message:", error);
          }
        },
      });
    
      // Return the data stream response
      const response = result.toDataStreamResponse();
      
      console.log("✅ Response created and returning to client")
      
      return response;
      
    } catch (streamError: any) {
      
      return new Response(
        JSON.stringify({ error: streamError.message || "Gemini API error" }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Estimate token count (rough approximation)
 * For production, use tiktoken library
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trim messages to fit within context window
 * Keeps system message + most recent messages
 */
function trimMessagesForContext(messages: any[], maxTokens: number) {
  const systemMessages = messages.filter((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  let totalTokens = 0;
  const trimmed = [];

  // Always include system messages
  for (const msg of systemMessages) {
    const tokens = estimateTokens(msg.content);
    totalTokens += tokens;
    trimmed.push(msg);
  }

  // Add messages from newest to oldest until we hit limit
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const msg = otherMessages[i];
    const tokens = estimateTokens(msg.content);

    if (totalTokens + tokens > maxTokens) {
      break;
    }

    totalTokens += tokens;
    trimmed.unshift(msg);
  }

  return trimmed;
}
