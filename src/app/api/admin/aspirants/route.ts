import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  await requireAdmin();
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
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const positionId = Number(body.positionId);
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const department = String(body.department || "").trim();
  const level = String(body.level || "").trim();
  const manifesto = body.manifesto ? String(body.manifesto) : null;
  const photoUrl = body.photoUrl ? String(body.photoUrl).trim() : null;

  if (!Number.isInteger(positionId) || !firstName || !lastName || !department || !level) {
    return NextResponse.json(
      { error: "Position, name, department and level are required." },
      { status: 400 }
    );
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
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const data: any = {};
  if (body.firstName !== undefined) data.firstName = String(body.firstName).trim();
  if (body.lastName !== undefined) data.lastName = String(body.lastName).trim();
  if (body.department !== undefined) data.department = String(body.department).trim();
  if (body.level !== undefined) data.level = String(body.level).trim();
  if (body.manifesto !== undefined) data.manifesto = String(body.manifesto);
  if (body.photoUrl !== undefined)
    data.photoUrl = body.photoUrl ? String(body.photoUrl).trim() : null;
  if (body.positionId !== undefined) data.positionId = Number(body.positionId);
  const aspirant = await prisma.aspirant.update({ where: { id }, data });
  return NextResponse.json({ ok: true, aspirant });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  await prisma.aspirant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
