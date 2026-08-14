import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";

export const dynamic = "force-dynamic";

// List voters (searchable, paginated). Returns a light shape plus the number
// of votes each voter has cast, so the UI can warn before deletion.
export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where = q
    ? {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { matNumber: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {};

  const [voters, total] = await Promise.all([
    prisma.voter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matNumber: true,
        email: true,
        department: true,
        level: true,
        accredited: true,
        faceEnrolled: true,
        createdAt: true,
        _count: { select: { votes: true } },
      },
    }),
    prisma.voter.count({ where }),
  ]);

  return NextResponse.json({
    voters: voters.map((v) => ({
      id: v.id,
      firstName: v.firstName,
      lastName: v.lastName,
      matNumber: v.matNumber,
      email: v.email,
      department: v.department,
      level: v.level,
      accredited: v.accredited,
      faceEnrolled: v.faceEnrolled,
      createdAt: v.createdAt,
      voteCount: v._count.votes,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function DELETE(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const voter = await prisma.voter.findUnique({ where: { id } });
  if (!voter) {
    return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  }
  // Cascade removes the voter's sessions, OTPs and votes (schema onDelete).
  await prisma.voter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
