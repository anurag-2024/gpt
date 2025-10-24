import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/upload
 * Upload files to Cloudinary
 * 
 * Supports:
 * - Images (PNG, JPG, GIF, WEBP)
 * - Documents (PDF, DOCX, TXT)
 * 
 * Returns secure URLs for uploaded files
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

      // Determine resource type
      const resourceType = file.type.startsWith("image/") ? "image" : "raw";

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64, {
        resource_type: resourceType,
        folder: `galaxy-ai/${userId}`,
        use_filename: true,
        unique_filename: true,
      });

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        name: file.name,
        type: file.type,
        size: file.size,
        format: result.format,
      });
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Delete file from Cloudinary
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { publicId } = await req.json();

    if (!publicId) {
      return NextResponse.json({ error: "Public ID required" }, { status: 400 });
    }

    // Verify the file belongs to the user
    if (!publicId.startsWith(`galaxy-ai/${userId}/`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}
