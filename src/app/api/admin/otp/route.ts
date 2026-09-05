import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrAccreditorApi } from "@/lib/session";
import { issueOtpAdmin } from "@/lib/otp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const principal = await requireAdminOrAccreditorApi();
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const voterId = Number(body.voterId);
  const matNumber = String(body.matNumber || "").trim().toUpperCase();
  if (!Number.isInteger(voterId) || !matNumber) {
    return NextResponse.json({ error: "Missing voter details." }, { status: 400 });
  }

  const voter = await prisma.voter.findUnique({
    where: { id: voterId },
    select: { id: true, matNumber: true, firstName: true, lastName: true },
  });
  if (!voter) {
    return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  }

  const { code, expiresAt } = await issueOtpAdmin(voter.id);
  return NextResponse.json({
    ok: true,
    code,
    expiresAt: expiresAt.toISOString(),
    matNumber: voter.matNumber,
    name: `${voter.firstName} ${voter.lastName}`,
  });
}