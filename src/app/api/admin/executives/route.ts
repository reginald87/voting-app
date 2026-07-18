import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

function extFor(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/webp") return ".webp";
  return "";
}

export async function GET() {
  await requireAdmin();
  const execs = await prisma.executive.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ executives: execs });
}

export async function POST(req: Request) {
  await requireAdmin();
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || "").trim();
  const name = get("name");
  const position = get("position");
  const department = get("department");
  const level = get("level");
  const year = get("year");

  if (!name || !position) {
    return NextResponse.json({ error: "Name and position are required." }, { status: 400 });
  }

  let photoUrl: string | null = null;
  const file = f.get("photoUrl");
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    if (!ALLOWED.includes((file as any).type)) {
      return NextResponse.json({ error: "Photo must be PNG, JPG or WEBP." }, { status: 400 });
    }
    const buf = Buffer.from(await (file as any).arrayBuffer());
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Photo is too large (max 2MB)." }, { status: 400 });
    }
    const ext = extFor((file as any).type);
    const fname = `${randomUUID()}${ext}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fname), buf);
    photoUrl = `/uploads/${fname}`;
  }

  const max = await prisma.executive.aggregate({ _max: { order: true } });
  const exec = await prisma.executive.create({
    data: {
      name,
      position,
      department: department || "—",
      level: level || "—",
      year: year || "—",
      photoUrl,
      order: (max._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json({ ok: true, executive: exec });
}

export async function PUT(req: Request) {
  await requireAdmin();
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || "").trim();
  const id = Number(get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const data: any = {};
  if (f.get("name") !== null) data.name = get("name");
  if (f.get("position") !== null) data.position = get("position");
  if (f.get("department") !== null) data.department = get("department") || "—";
  if (f.get("level") !== null) data.level = get("level") || "—";
  if (f.get("year") !== null) data.year = get("year") || "—";

  const file = f.get("photoUrl");
  if (file && typeof file === "object" && "arrayBuffer" in file) {
    const buf = Buffer.from(await (file as any).arrayBuffer());
    const ext = extFor((file as any).type);
    const fname = `${randomUUID()}${ext}`;
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fname), buf);
    data.photoUrl = `/uploads/${fname}`;
  }

  const exec = await prisma.executive.update({ where: { id }, data });
  return NextResponse.json({ ok: true, executive: exec });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  await prisma.executive.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
