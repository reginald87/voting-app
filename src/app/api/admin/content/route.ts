import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { requireAdminApi } from "@/lib/session";
import { updateSiteContent } from "@/lib/content";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"];

function extFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  if (type === "image/x-icon" || type === "image/vnd.microsoft.icon") return ".ico";
  return "";
}

async function saveUpload(file: any): Promise<string | null> {
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return null;
  if (!ALLOWED.includes(file.type)) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return null;
  const ext = extFor(file.type);
  const name = `${randomUUID()}${ext}`;
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);
  return `/uploads/${name}`;
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentType = req.headers.get("content-type") || "";
  let fields: Record<string, any> = {};

  if (contentType.includes("multipart/form-data")) {
    const f = await req.formData();
    for (const [k, v] of f.entries()) fields[k] = v;
  } else {
    fields = await req.json().catch(() => ({}));
  }

  const data: Record<string, any> = {};
  const textFields = [
    "deanName",
    "deanMessage",
    "heroTitle",
    "heroSubtitle",
    "heroCtaPrimary",
    "heroCtaSecondary",
    "peaceTitle",
    "peaceBody",
    "footerText",
  ];
  for (const k of textFields) {
    if (fields[k] !== undefined) data[k] = String(fields[k]);
  }
  if (fields.faceRecognition !== undefined) {
    data.faceRecognition = fields.faceRecognition === true ||
      fields.faceRecognition === "true" ||
      fields.faceRecognition === "on";
  }

  for (const key of ["uniLogo", "sugLogo", "favicon", "deanPhoto"]) {
    const file = fields[key];
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const url = await saveUpload(file);
      if (url) {
        const map: Record<string, string> = {
          uniLogo: "uniLogoUrl",
          sugLogo: "sugLogoUrl",
          favicon: "faviconUrl",
          deanPhoto: "deanPhotoUrl",
        };
        data[map[key]] = url;
      }
    }
  }

  const content = await updateSiteContent(data);
  return NextResponse.json({ ok: true, content });
}
