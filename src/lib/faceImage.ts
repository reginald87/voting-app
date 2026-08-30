import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Persist a JPEG data URL (a client-captured face crop) into /public/uploads
 * and return the public URL. Returns null if the input is not a valid image
 * data URL. Existing files with the same name are intentionally overwritten so
 * repeated re-enrollment doesn't accumulate stale images for a voter.
 */
export async function saveFaceImage(
  dataUrl: string | null | undefined
): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const buf = Buffer.from(match[2], "base64");
  if (!buf.length) return null;

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `face-${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(join(dir, name), buf);
  return `/uploads/${name}`;
}
