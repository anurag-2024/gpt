import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
  "text/plain", // .txt
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Magic numbers for file type validation (first few bytes)
const FILE_SIGNATURES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/jpg": [0xFF, 0xD8, 0xFF],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP format)
  "application/msword": [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // DOC file signature
  "text/plain": [], // No specific signature for plain text
};

/**
 * Validate file signature (magic numbers) to detect file type spoofing
 */
function validateFileSignature(buffer: Buffer, declaredType: string): boolean {
  const signature = FILE_SIGNATURES[declaredType];
  if (!signature) return true; // Skip validation for unknown types
  
  // Check if buffer starts with the expected signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Check if file appears to be corrupted
 */
function isFileCorrupted(buffer: Buffer, fileType: string): boolean {
  // Basic corruption detection
  if (buffer.length < 100) {
    // Text files can be smaller
    if (fileType === "text/plain" && buffer.length >= 1) return false;
    return true;
  }
  
  // Check for null bytes at the start (common corruption indicator)
  const firstBytes = buffer.slice(0, 10);
  const allZeros = firstBytes.every(byte => byte === 0);
  if (allZeros) return true;
  
  // For images, check if we can find basic structure
  if (fileType.startsWith("image/")) {
    // PNG should have IHDR chunk
    if (fileType === "image/png" && !buffer.includes(Buffer.from("IHDR"))) {
      return true;
    }
    // JPEG should have markers
    if (fileType.includes("jpeg") || fileType.includes("jpg")) {
      if (!buffer.includes(Buffer.from([0xFF, 0xD8]))) return true;
    }
  }
  
  // For PDFs, check basic structure
  if (fileType === "application/pdf") {
    const hasPDFHeader = buffer.slice(0, 5).toString() === "%PDF-";
    const hasEOF = buffer.includes(Buffer.from("%%EOF"));
    if (!hasPDFHeader || !hasEOF) return true;
  }
  
  // For DOCX (ZIP-based format), verify it's a valid ZIP
  if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    // Check for ZIP signature and central directory
    const hasZipSignature = buffer[0] === 0x50 && buffer[1] === 0x4B;
    if (!hasZipSignature) return true;
  }
  
  // For text files, check if it contains valid text
  if (fileType === "text/plain") {
    try {
      const text = buffer.toString("utf-8");
      // Check if it's mostly printable ASCII/UTF-8
      const printableRatio = (text.match(/[\x20-\x7E\n\r\t]/g) || []).length / text.length;
      if (printableRatio < 0.7) return true; // Less than 70% printable = likely corrupted
    } catch {
      return true;
    }
  }
  
  return false;
}

/**
 * Sanitize filename to prevent path traversal and injection attacks
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscore
    .replace(/\.{2,}/g, "_") // Prevent directory traversal
    .substring(0, 100); // Limit length
}

/**
 * POST /api/upload
 * Upload files to Cloudinary with comprehensive validation
 * 
 * Security features:
 * - File type validation (magic number check)
 * - File size limits (10MB max)
 * - Corruption detection
 * - Filename sanitization
 * - MIME type verification
 * 
 * Supports:
 * - Images (PNG, JPG, GIF, WEBP)
 * - Documents (PDF, DOCX, DOC, TXT)
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

    // Limit number of files per request
    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 files allowed per upload" },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        errors.push("Invalid file object");
        continue;
      }

      try {
        // 1. Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: File type '${file.type}' not allowed. Only images (PNG, JPG, GIF, WEBP) and documents (PDF, DOCX, TXT) are supported.`);
          continue;
        }

        // 2. Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`);
          continue;
        }

        // 3. Check minimum file size
        if (file.size < 1) {
          errors.push(`${file.name}: File is empty`);
          continue;
        }
        
        // Text files can be very small, others need minimum size
        if (file.type !== "text/plain" && file.size < 100) {
          errors.push(`${file.name}: File is too small (possible corruption)`);
          continue;
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 4. Validate file signature (magic numbers)
        if (!validateFileSignature(buffer, file.type)) {
          errors.push(`${file.name}: File signature doesn't match declared type. Possible file type spoofing detected.`);
          continue;
        }

        // 5. Check for file corruption
        if (isFileCorrupted(buffer, file.type)) {
          errors.push(`${file.name}: File appears to be corrupted or invalid`);
          continue;
        }

        // 6. Sanitize filename
        const sanitizedName = sanitizeFilename(file.name);

        // 7. Convert to base64 for Cloudinary
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

        // Determine resource type
        const resourceType = file.type.startsWith("image/") ? "image" : "raw";

        
        // 8. Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64, {
          resource_type: resourceType,
          folder: `galaxy-ai/user_${userId}`,
          use_filename: true,
          unique_filename: true,
          public_id: sanitizedName.replace(/\.[^/.]+$/, ""), // Remove extension
        });

        uploadedFiles.push({
          url: result.secure_url,
          publicId: result.public_id,
          name: file.name,
          type: file.type,
          size: file.size,
          format: result.format,
        });

      } catch (fileError: any) {
        errors.push(`${file.name}: ${fileError.message || "Upload failed"}`);
      }
    }

    // Return response with uploaded files and any errors
    if (uploadedFiles.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: "All files failed validation", details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: uploadedFiles.length > 0
        ? `Successfully uploaded ${uploadedFiles.length} file(s)`
        : undefined,
    });

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
