import { connectDB } from "@/lib/db/mongodb";
import { Conversation, Message } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const conversations = await Conversation.find({ userId, archived: false })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, model = "gpt-4-turbo" } = await req.json();

    await connectDB();

    const conversation = await Conversation.create({
      userId,
      title: title || "New Chat",
      model,
    });

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create conversation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversations
 * Update a conversation (rename)
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, title } = await req.json();

    if (!conversationId || !title) {
      return NextResponse.json({ error: "Conversation ID and title required" }, { status: 400 });
    }

    await connectDB();

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    conversation.title = title;
    await conversation.save();

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Update conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update conversation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations
 * Delete a conversation
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("id");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    await connectDB();

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || conversation.userId !== userId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Delete conversation and all its messages
    await Conversation.findByIdAndDelete(conversationId);
    await Message.deleteMany({ conversationId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
