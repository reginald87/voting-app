import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { createVoterSession } from "@/lib/session";
import { faceEnabled, matchFace } from "@/lib/face";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const matNumber = String(body.matNumber || "").trim();
  const code = String(body.code || "").trim();
  const faceTemplate = typeof body.faceTemplate === "string" ? body.faceTemplate : null;

  if (!matNumber || !code) {
    return NextResponse.json(
      { error: "Matriculation number and code are required." },
      { status: 400 }
    );
  }

  const voter = await prisma.voter.findUnique({ where: { matNumber } });
  if (!voter) {
    return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  }

  const result = await verifyOtp(voter.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  if (await faceEnabled()) {
    // Only enforce face matching if the voter actually enrolled a template.
    // Voters without an enrolled face are not locked out (scaffold policy).
    if (voter.faceEnrolled) {
      const face = await matchFace(voter.id, faceTemplate || "");
      if (!face.ok) {
        return NextResponse.json(
          { error: face.reason || "Face verification failed." },
          { status: 401 }
        );
      }
    }
  }

  await createVoterSession(voter.id);
  return NextResponse.json({ ok: true });
}
