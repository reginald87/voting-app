import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync, readFileSync } from "fs";
import { join, extname, normalize } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const rel = normalize(params.slug.join("/")).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(UPLOAD_DIR, rel);

  // Prevent path traversal outside the uploads directory.
  if (
    !filePath.startsWith(UPLOAD_DIR) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const type = TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
  const buf = readFileSync(filePath);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
