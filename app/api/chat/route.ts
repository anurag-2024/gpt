import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { connectDB } from "@/lib/db/mongodb";
import { Message, Conversation } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { searchMemories, addMemories } from "@/lib/mem0/client";

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
    console.log("✅ Gemini API Key exists:", !!apiKey)

    // Parse request body
    const { messages, conversationId, model = "gemini-2.5-flash", parentMessageId = null, files = [], isTemporaryChat = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    console.log("Received chat request:", { 
      conversationId, 
      model, 
      messageCount: messages.length,
      parentMessageId,
      filesInBody: files.length,
      isTemporaryChat
    })

    // Check if the latest message has image attachments - use vision model
    const lastMessage = messages[messages.length - 1];
    console.log("Last message structure:", JSON.stringify(lastMessage, null, 2))
    
    // Check for attachments in both the message and the body
    const attachmentsFromMessage = lastMessage?.experimental_attachments || [];
    const attachmentsFromBody = files || [];
    const allAttachments = attachmentsFromMessage.length > 0 ? attachmentsFromMessage : attachmentsFromBody;
    
    const hasImages = allAttachments.some((att: any) => 
      (att.contentType || att.type)?.startsWith("image/")
    );
    const selectedModel = hasImages ? "gemini-2.5-flash" : model;
    
    console.log("Total attachments found:", allAttachments.length)

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
    
    console.log("User query:", userQuery.substring(0, 100))
    console.log("User files:", userFiles.length)
    
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
          console.log("🧠 Added", relevantMemories.length, "memories as context");
        }
      } catch (memError) {
        console.error("⚠️ Mem0 error (non-blocking):", memError);
        // Don't fail the request if memory retrieval fails
      }
    } else {
      console.log("🔒 Skipping memory retrieval for temporary chat");
    }
    
    // If we have files, create a modified messages array with attachments
    let messagesForGemini = messages;
    if (userFiles.length > 0 && !lastMessage.experimental_attachments) {
      // Convert files to data URLs for experimental_attachments
      const attachmentsForGemini = await Promise.all(
        userFiles.map(async (f: any) => {
          try {
            console.log("📥 Downloading file:", f.url, "Type:", f.type)
            const response = await fetch(f.url);
            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${f.type};base64,${base64}`;
            
            console.log("✅ File converted to data URL, base64 length:", base64.length)
            
            return {
              name: f.name,
              contentType: f.type,
              url: dataUrl,
            };
          } catch (error) {
            console.error("❌ Error processing file:", error);
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
        console.log("✅ Added", validAttachments.length, "attachment(s) via experimental_attachments")
      }
    }

    // Calculate depth based on parent message
    let depth = 0;
    if (parentMessageId) {
      const parentMsg = await Message.findById(parentMessageId);
      if (parentMsg) {
        depth = parentMsg.depth + 1;
        // Add this message ID to parent's branches array
        await Message.findByIdAndUpdate(parentMessageId, {
          $addToSet: { branches: null } // Will be updated later with new message ID
        });
      }
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
    
    console.log("About to call streamText...")
    console.log("🤖 Gemini model:", selectedModel)
    console.log("📎 Trimmed messages count:", trimmedMessages.length)
    console.log("📎 Last message has attachments:", !!trimmedMessages[trimmedMessages.length - 1]?.experimental_attachments)
    
    try {
      let fullResponseText = '';
      
      console.log("📋 Final message content type:", typeof trimmedMessages[trimmedMessages.length - 1]?.content)
      console.log("📋 Full last message structure:", JSON.stringify(trimmedMessages[trimmedMessages.length - 1], null, 2).substring(0, 500))
      
      const result = streamText({
        model: google(selectedModel),
        messages: trimmedMessages,
        temperature: 0.7,
        maxTokens: 8192,
        onChunk({ chunk }) {
          console.log("📦 Chunk received:", chunk.type)
        },
        async onFinish({ text, usage, finishReason }) {
          console.log("🎉 OnFinish called!")
          console.log("📊 Text length:", text?.length)
          console.log("📊 Finish reason:", finishReason)
          fullResponseText = text;
          
          // Skip database and memory operations for temporary chats
          if (isTemporaryChat) {
            console.log("� Skipping DB/memory storage for temporary chat");
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
            
            console.log("📎 Files to save:", filesToSave.length, "Type:", typeof filesToSave, "Is array:", Array.isArray(filesToSave))
            if (filesToSave.length > 0) {
              console.log("📎 First file:", JSON.stringify(filesToSave[0]))
            }
            
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

            console.log("✅ Query-response pair saved to DB:", savedMessage._id)
            console.log("✅ Files saved:", filesToSave.length)

            // Update parent message's branches array
            if (parentMessageId) {
              await Message.findByIdAndUpdate(parentMessageId, {
                $addToSet: { branches: savedMessage._id }
              });
              console.log("✅ Parent message branches updated")
            }

            // Update conversation metadata
            await Conversation.findByIdAndUpdate(conversation!._id, {
              lastMessageAt: new Date(),
              totalTokens: (conversation!.totalTokens || 0) + (usage?.totalTokens || 0),
            });
            
            console.log("✅ Conversation metadata updated")
            
            // 🧠 Store memories in Mem0 for future context
            try {
              await addMemories(userId, conversation!._id.toString(), [
                { role: "user", content: userQuery },
                { role: "assistant", content: text },
              ]);
              console.log("🧠 Memories stored in Mem0");
            } catch (memError) {
              console.error("⚠️ Mem0 storage error (non-blocking):", memError);
              // Don't fail the request if memory storage fails
            }
            
          } catch (error) {
            console.error("❌ Error saving message:", error);
            console.error("❌ Error details:", error instanceof Error ? error.message : error);
            console.error("❌ Error stack:", error instanceof Error ? error.stack : '');
            // Don't throw - let the stream complete successfully even if save fails
          }
        },
      });
      
      console.log("✅ streamText result created, returning response...")
      
      // Return the data stream response
      const response = result.toDataStreamResponse();
      
      console.log("✅ Response created and returning to client")
      
      return response;
      
    } catch (streamError: any) {
      console.error("❌ Gemini streaming error:", streamError);
      console.error("❌ Error stack:", streamError.stack);
      
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
