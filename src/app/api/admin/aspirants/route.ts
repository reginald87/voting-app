import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

function extFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  return "";
}

async function savePhoto(file: unknown): Promise<string | null> {
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return null;
  const f = file as any;
  if (!ALLOWED.includes(f.type)) {
    throw new Error("Photo must be PNG, JPG or WEBP.");
  }
  const buf = Buffer.from(await f.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    throw new Error("Photo is too large (max 2MB).");
  }
  const ext = extFor(f.type);
  const fname = `${randomUUID()}${ext}`;
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fname), buf);
  return `/uploads/${fname}`;
}

export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const positionId = searchParams.get("positionId");
  const where = positionId ? { positionId: Number(positionId) } : undefined;
  const aspirants = await prisma.aspirant.findMany({
    where,
    orderBy: { order: "asc" },
    include: { position: true },
  });
  return NextResponse.json({ aspirants });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || "").trim();
  const positionId = Number(get("positionId"));
  const firstName = get("firstName");
  const lastName = get("lastName");
  const department = get("department");
  const level = get("level");
  const manifesto = f.get("manifesto") ? String(f.get("manifesto")) : null;

  if (!Number.isInteger(positionId) || !firstName || !lastName || !department || !level) {
    return NextResponse.json(
      { error: "Position, name, department and level are required." },
      { status: 400 }
    );
  }

  let photoUrl: string | null = null;
  try {
    photoUrl = await savePhoto(f.get("photoUrl"));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid photo." }, { status: 400 });
  }

  const max = await prisma.aspirant.aggregate({
    where: { positionId },
    _max: { order: true },
  });
  const aspirant = await prisma.aspirant.create({
    data: {
      positionId,
      firstName,
      lastName,
      department,
      level,
      manifesto,
      photoUrl,
      order: (max._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ ok: true, aspirant });
}

export async function PUT(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || "").trim();
  const id = Number(get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const data: any = {};
  if (f.get("firstName") !== null) data.firstName = get("firstName");
  if (f.get("lastName") !== null) data.lastName = get("lastName");
  if (f.get("department") !== null) data.department = get("department");
  if (f.get("level") !== null) data.level = get("level");
  if (f.get("manifesto") !== null) data.manifesto = f.get("manifesto") ? String(f.get("manifesto")) : null;
  if (f.get("positionId") !== null) data.positionId = Number(get("positionId"));

  try {
    const photoUrl = await savePhoto(f.get("photoUrl"));
    if (photoUrl) data.photoUrl = photoUrl;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid photo." }, { status: 400 });
  }

  const aspirant = await prisma.aspirant.update({ where: { id }, data });
  return NextResponse.json({ ok: true, aspirant });
}

export async function DELETE(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  await prisma.aspirant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
