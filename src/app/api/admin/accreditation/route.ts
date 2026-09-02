import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, requireAccreditorApi } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";

export async function GET(req: Request) {
  const admin = await requireAdminApi();
  const accreditor = admin ? null : await requireAccreditorApi();
  if (!admin && !accreditor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status"); // "", "accredited", "pending"
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

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

  const [voters, total, accredited] = await Promise.all([
    prisma.voter.findMany({
      where,
      orderBy: [{ accredited: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
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
    }),
    prisma.voter.count({ where }),
    prisma.voter.count({ where: { accredited: true } }),
  ]);

  return NextResponse.json({
    voters,
    total,
    accredited,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  const accreditor = admin ? null : await requireAccreditorApi();
  if (!admin && !accreditor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = admin
    ? { actor: "admin", actorName: admin.name }
    : { actor: `accreditor:${accreditor!.id}`, actorName: accreditor!.name };

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

  await logAudit({
    ...actor,
    action: accredited ? "accredit" : "revoke",
    target: `voter:${voterId}`,
    detail: `${voter.firstName} ${voter.lastName} (${voter.matNumber})`,
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true, voter });
}
