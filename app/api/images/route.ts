import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/db/mongodb";
import { Image } from "@/lib/db/models";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.max(0, parseInt(limitParam, 10)) : 0;

    let query = Image.find({ userId }).sort({ createdAt: -1 });
    if (limit > 0) query = query.limit(limit);

    const images = await query.lean();

    return NextResponse.json(images);
  } catch (error: any) {
    console.error("/api/images error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load images" }, { status: 500 });
  }
}
