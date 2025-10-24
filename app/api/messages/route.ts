import { connectDB } from "@/lib/db/mongodb";
import { Message } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/messages?conversationId=xxx
 * Get all messages for a specific conversation
 * Returns query-response pairs flattened into separate user/assistant messages for UI
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    await connectDB();

    // Get query-response pairs
    const messagePairs = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    // Flatten into user/assistant messages for the UI
    const messages: any[] = [];
    messagePairs.forEach((pair: any) => {
      // Add user message
      messages.push({
        _id: `${pair._id}-user`,
        role: 'user',
        content: pair.query,
        createdAt: pair.createdAt,
        pairId: pair._id, // Reference to the query-response pair
        parentMessageId: pair.parentMessageId,
        branches: pair.branches || [],
        depth: pair.depth || 0,
        files: pair.files || [], // Include files
      });
      // Add assistant message
      messages.push({
        _id: `${pair._id}-assistant`,
        role: 'assistant',
        content: pair.response,
        createdAt: pair.createdAt,
        pairId: pair._id, // Reference to the query-response pair
        parentMessageId: pair.parentMessageId,
        branches: pair.branches || [],
        depth: pair.depth || 0,
      });
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages
 * Edit a message
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, content } = await req.json();

    if (!messageId || !content) {
      return NextResponse.json({ error: "Message ID and content required" }, { status: 400 });
    }

    await connectDB();

    const message = await Message.findById(messageId);

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Store original content
    if (!message.isEdited) {
      message.originalContent = message.content;
      message.isEdited = true;
    }

    message.content = content;
    message.tokenCount = Math.ceil(content.length / 4);
    await message.save();

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Edit message error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to edit message" },
      { status: 500 }
    );
  }
}
