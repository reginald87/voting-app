import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getVoter } from "@/lib/session";
import { LEVELS } from "@/lib/constants";

const MAX_BYTES = 2 * 1024 * 1024;

function parseDataUrl(dataUrl: string) {
  const m = /^data:(image\/(png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const type = m[1];
  const ext = type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
  const buf = Buffer.from(m[3], "base64");
  return { type, ext, buf };
}

export async function PATCH(req: Request) {
  const voter = await getVoter();
  if (!voter) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // Only these fields are editable. email, matNumber, sugReceipt and
  // sugReceiptUrl are intentionally NOT accepted here.
  const firstName = String(body.firstName ?? voter.firstName ?? "").trim();
  const lastName = String(body.lastName ?? voter.lastName ?? "").trim();
  const department = String(body.department ?? voter.department ?? "").trim();
  const level = String(body.level ?? voter.level ?? "").trim();
  const avatarDataUrl = body.avatarDataUrl && typeof body.avatarDataUrl === "string" ? body.avatarDataUrl : null;
  const removeAvatar = body.removeAvatar === true;

  if (!firstName || !lastName || !department || !level) {
    return NextResponse.json({ error: "Name, department and level are required." }, { status: 400 });
  }
  if (!department) {
    return NextResponse.json({ error: "Department is required." }, { status: 400 });
  }
  if (!LEVELS.includes(level)) {
    return NextResponse.json({ error: "Invalid level." }, { status: 400 });
  }

  let avatarUrl: string | null = voter.avatarUrl ?? null;
  if (removeAvatar) {
    avatarUrl = null;
  } else if (avatarDataUrl) {
    const parsed = parseDataUrl(avatarDataUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Avatar must be a PNG, JPG or WEBP image." }, { status: 400 });
    }
    if (parsed.buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Avatar image is too large (max 2MB)." }, { status: 400 });
    }
    const name = `${randomUUID()}${parsed.ext}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), parsed.buf);
    avatarUrl = `/uploads/${name}`;
  }

  const updated = await prisma.voter.update({
    where: { id: voter.id },
    data: { firstName, lastName, department, level, avatarUrl },
  });

  return NextResponse.json({
    ok: true,
    voter: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      department: updated.department,
      level: updated.level,
      avatarUrl: updated.avatarUrl,
    },
  });
}
