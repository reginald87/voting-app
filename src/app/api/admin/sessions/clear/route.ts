import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }

  const { count } = await prisma.session.deleteMany({});

  return NextResponse.json({
    ok: true,
    cleared: count,
    message: `Signed out ${count} active session(s). Everyone must log in again to vote.`,
  });
}
