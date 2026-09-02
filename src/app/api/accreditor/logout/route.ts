import { NextResponse } from "next/server";
import { destroyAccreditorSession, getAccreditor } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/ip";

export async function POST(req: Request) {
  const accreditor = await getAccreditor();
  if (accreditor) {
    await logAudit({
      actor: `accreditor:${accreditor.id}`,
      actorName: accreditor.name,
      action: "accreditor_logout",
      ip: getClientIp(req),
    });
  }
  await destroyAccreditorSession();
  return NextResponse.json({ ok: true });
}
