import { connectDB } from "@/lib/db/mongodb";
import { Message } from "@/lib/db/models";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/branches?pairId=xxx
 * Get all branches (alternative responses) for a specific message pair
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pairId = searchParams.get("pairId");

    if (!pairId) {
      return NextResponse.json({ error: "Pair ID required" }, { status: 400 });
    }

    await connectDB();

    // Get the parent message
    const parentMessage: any = await Message.findById(pairId).lean();
    
    if (!parentMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Get all branches
    const branches = await Message.find({
      _id: { $in: parentMessage.branches || [] }
    }).sort({ createdAt: 1 }).lean();

    // Include the parent as the first branch
    const allBranches = [parentMessage, ...branches];

    // Format each branch as user/assistant pair
    const formattedBranches = allBranches.map((branch: any) => ({
      pairId: branch._id,
      user: {
        _id: `${branch._id}-user`,
        role: 'user',
        content: branch.query,
        createdAt: branch.createdAt,
        pairId: branch._id,
      },
      assistant: {
        _id: `${branch._id}-assistant`,
        role: 'assistant',
        content: branch.response,
        createdAt: branch.createdAt,
        pairId: branch._id,
      }
    }));

    return NextResponse.json({ branches: formattedBranches });
  } catch (error: any) {
    console.error("Get branches error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
