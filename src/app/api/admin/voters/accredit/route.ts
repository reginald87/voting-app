import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const accredited = Boolean(body.accredited);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  const voter = await prisma.voter.findUnique({ where: { id } });
  if (!voter) {
    return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  }
  const updated = await prisma.voter.update({
    where: { id },
    data: { accredited },
  });
  return NextResponse.json({ ok: true, accredited: updated.accredited });
}
