import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";
import { connectDB } from "@/lib/db/mongodb";
import { Image } from "@/lib/db/models";
import type { ImageGenerationBody } from "@/types/backend";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/generate-image
 * Generate an image using Pollinations.ai (free, no API key needed), upload to Cloudinary, and save to DB
 * 
 * Request body:
 * - prompt: string (image description)
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt }: ImageGenerationBody = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid prompt. Please provide a description for the image." },
        { status: 400 }
      );
    }

    console.log("🎨 Generating image with Pollinations.ai, prompt:", prompt.substring(0, 100));

    // Use Pollinations.ai - free image generation API
    // It uses Flux models under the hood
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
    
    console.log("📥 Fetching generated image from Pollinations.ai...");
    
    // Fetch the generated image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Galaxy-AI-ChatGPT-Clone/1.0',
      },
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("❌ Pollinations API error:", imageResponse.status, errorText);
      throw new Error(`Image generation failed: ${imageResponse.status}`);
    }

    console.log("✅ Image fetched successfully");

    // Convert to buffer and then base64
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;

    // Upload to Cloudinary
    console.log("☁️ Uploading to Cloudinary...");
    const cloudinaryResult = await cloudinary.uploader.upload(base64Image, {
      resource_type: "image",
      folder: `galaxy-ai/user_${userId}/generated`,
      use_filename: false,
      unique_filename: true,
    });

    console.log("✅ Uploaded to Cloudinary:", cloudinaryResult.secure_url);

    // Connect to MongoDB and save image metadata
    await connectDB();

    const savedImage = await Image.create({
      userId,
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      caption: prompt.substring(0, 200),
      metadata: {
        originalPrompt: prompt,
        model: "flux-via-pollinations",
        format: cloudinaryResult.format,
        aspectRatio: "1:1",
      },
    });

    console.log("✅ Image metadata saved to DB:", savedImage._id);

    return NextResponse.json({
      success: true,
      image: {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        caption: prompt,
        originalPrompt: prompt,
        id: savedImage._id.toString(),
      },
    });
  } catch (error: any) {
    console.error("❌ Image generation error:", error);
    
    // Handle specific errors
    if (error?.status === 400) {
      return NextResponse.json(
        { error: error.message || "Invalid request to image generation API" },
        { status: 400 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
