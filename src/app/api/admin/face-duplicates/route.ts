import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// List voters whose face was enrolled inside the "ambiguous duplicate" band
// (close to another voter's face, but not certain) and has not been reviewed.
// Each flag links back to the enrolled voter it was compared against, so an
// officer can compare both face photos and resolve.
export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const flags = await prisma.voter.findMany({
    where: {
      faceEnrolled: true,
      faceDuplicateOfId: { not: null },
      faceDuplicateReviewed: false,
    },
    select: {
      id: true,
      matNumber: true,
      firstName: true,
      lastName: true,
      faceImageUrl: true,
      faceDuplicateOfId: true,
      faceDuplicateDistance: true,
      faceDuplicateFlaggedAt: true,
      faceDuplicateOf: {
        select: {
          id: true,
          matNumber: true,
          firstName: true,
          lastName: true,
          faceImageUrl: true,
          faceEnrolled: true,
        },
      },
    },
    orderBy: { faceDuplicateFlaggedAt: "desc" },
  });

  return NextResponse.json({ flags });
}

// Re-check a flag after admin review. Optionally the officer can allow or
// block the flagged voter's enrolment: "allow" clears the flag (it was a
// lookalike / capture variance); "block" un-enrols the face so the voter must
// start over. Both write an audit trail.
export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const verdict = String(body.verdict || "allow");
  const note = body.note ? String(body.note).trim() : null;
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }
  if (verdict !== "allow" && verdict !== "block") {
    return NextResponse.json({ error: "Verdict must be allow or block." }, { status: 400 });
  }

  const voter = await prisma.voter.findUnique({
    where: { id },
    select: {
      matNumber: true,
      firstName: true,
      lastName: true,
      faceEnrolled: true,
      faceDuplicateOfId: true,
      faceDuplicateDistance: true,
    },
  });
  if (!voter || !voter.faceDuplicateOfId) {
    return NextResponse.json({ error: "No pending face flag for this voter." }, { status: 404 });
  }

  if (verdict === "block") {
    await prisma.voter.update({
      where: { id },
      data: {
        faceTemplate: null,
        faceSalt: null,
        faceHash: null,
        faceEnrolled: false,
        faceRegisteredAt: null,
        faceDuplicateOfId: null,
        faceDuplicateDistance: null,
        faceDuplicateFlaggedAt: null,
        faceDuplicateReviewed: false,
      },
    });
  } else {
    await prisma.voter.update({
      where: { id },
      data: { faceDuplicateReviewed: true },
    });
  }

  await logAudit({
    actor: `admin:${admin.id}`,
    actorName: admin.name,
    action: verdict === "block" ? "face.duplicate.block" : "face.duplicate.allow",
    target: `${voter.matNumber} (voter #${id})`,
    detail: `distance ${voter.faceDuplicateDistance?.toFixed(3) ?? "?"} vs voter #${voter.faceDuplicateOfId}${
      note ? `; ${note}` : ""
    }`,
    ip: null,
  });

  return NextResponse.json({ ok: true });
}