import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAccreditorSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const accreditor = await prisma.accreditor.findUnique({ where: { email } });
  if (!accreditor) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!accreditor.active) {
    return NextResponse.json({ error: "Account has been deactivated." }, { status: 403 });
  }

  const ok = await bcrypt.compare(password, accreditor.password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await createAccreditorSession(accreditor.id);

  await logAudit({
    actor: `accreditor:${accreditor.id}`,
    actorName: accreditor.name,
    action: "accreditor_login",
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
