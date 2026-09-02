import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const accreditor = await prisma.accreditor.findUnique({ where: { id } });
  if (!accreditor) {
    return NextResponse.json({ error: "Accreditor not found." }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const newActive = Boolean(body.active);
  const updated = await prisma.accreditor.update({
    where: { id },
    data: { active: newActive },
    select: { id: true, email: true, name: true, active: true, createdAt: true },
  });

  await logAudit({
    actor: "admin",
    actorName: admin.name,
    action: newActive ? "activate_accreditor" : "deactivate_accreditor",
    target: `accreditor:${id}`,
    detail: `${accreditor.name} (${accreditor.email})`,
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true, accreditor: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const accreditor = await prisma.accreditor.findUnique({ where: { id } });
  if (!accreditor) {
    return NextResponse.json({ error: "Accreditor not found." }, { status: 404 });
  }

  await prisma.accreditor.delete({ where: { id } });

  await logAudit({
    actor: "admin",
    actorName: admin.name,
    action: "delete_accreditor",
    target: `accreditor:${id}`,
    detail: `${accreditor.name} (${accreditor.email})`,
    ip: getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}
