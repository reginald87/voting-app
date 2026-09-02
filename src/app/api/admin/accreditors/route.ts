import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const [accreditors, total] = await Promise.all([
    prisma.accreditor.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
      },
    }),
    prisma.accreditor.count(),
  ]);

  return NextResponse.json({
    accreditors,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const exists = await prisma.accreditor.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "An accreditor with this email already exists." }, { status: 409 });
  }

  const accreditor = await prisma.accreditor.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
    },
    select: { id: true, email: true, name: true, active: true, createdAt: true },
  });

  await logAudit({
    actor: "admin",
    actorName: admin.name,
    action: "create_accreditor",
    target: `accreditor:${accreditor.id}`,
    detail: `${accreditor.name} (${accreditor.email})`,
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true, accreditor });
}
