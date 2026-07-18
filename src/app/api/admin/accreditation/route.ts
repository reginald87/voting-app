import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status"); // "", "accredited", "pending"

  const where: any = {};
  if (q) {
    where.OR = [
      { matNumber: { contains: q } },
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
    ];
  }
  if (status === "accredited") where.accredited = true;
  if (status === "pending") where.accredited = false;

  const voters = await prisma.voter.findMany({
    where,
    orderBy: [{ accredited: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      matNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      department: true,
      level: true,
      sugReceipt: true,
      sugReceiptUrl: true,
      accredited: true,
      _count: { select: { votes: true } },
    },
  });

  const total = await prisma.voter.count();
  const accredited = await prisma.voter.count({ where: { accredited: true } });

  return NextResponse.json({ voters, total, accredited });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const voterId = Number(body.voterId);
  const accredited = Boolean(body.accredited);
  if (!Number.isInteger(voterId)) {
    return NextResponse.json({ error: "Invalid voter." }, { status: 400 });
  }
  const voter = await prisma.voter.update({
    where: { id: voterId },
    data: { accredited },
    select: {
      id: true,
      matNumber: true,
      email: true,
      firstName: true,
      lastName: true,
      department: true,
      level: true,
      sugReceipt: true,
      sugReceiptUrl: true,
      accredited: true,
      _count: { select: { votes: true } },
    },
  });
  return NextResponse.json({ ok: true, voter });
}
