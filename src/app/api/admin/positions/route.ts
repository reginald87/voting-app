import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const positions = await prisma.position.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { aspirants: true } } },
  });
  return NextResponse.json({ positions });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const description = body.description ? String(body.description).trim() : null;
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  const max = await prisma.position.aggregate({ _max: { order: true } });
  const position = await prisma.position.create({
    data: { title, description, order: (max._max.order ?? 0) + 1 },
  });
  return NextResponse.json({ ok: true, position });
}

export async function PUT(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const title = body.title ? String(body.title).trim() : undefined;
  const description =
    body.description !== undefined ? String(body.description).trim() : undefined;
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const position = await prisma.position.update({
    where: { id },
    data: { ...(title ? { title } : {}), ...(description !== undefined ? { description } : {}) },
  });
  return NextResponse.json({ ok: true, position });
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  await prisma.position.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
