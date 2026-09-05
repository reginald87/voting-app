import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { createVoterSession } from "@/lib/session";
import { getClientIp } from "@/lib/ip";
import { faceEnabled, enrollFace, matchFace, DuplicateFaceError } from "@/lib/face";
import { proofHashFromRaw } from "@/lib/biometric";
import { saveFaceImage } from "@/lib/faceImage";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const matNumber = String(body.matNumber || "").trim().toUpperCase();
  const code = String(body.code || "").trim();
  // Accept both stringified JSON and raw arrays — the client serialises the
  // descriptor as a JSON array inside the request body, while the register
  // route sends it as a stringified array inside FormData.
  const rawFace = body.faceTemplate ?? null;
  const faceTemplate =
    typeof rawFace === "string"
      ? rawFace
      : Array.isArray(rawFace)
        ? JSON.stringify(rawFace)
        : null;

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

  let otpResult;
  try {
    otpResult = await verifyOtp(voter.id, code);
  } catch {
    return NextResponse.json(
      { error: "Verification could not be completed. Please try again." },
      { status: 503 }
    );
  }
  if (!otpResult.ok) {
    return NextResponse.json({ error: otpResult.reason }, { status: 401 });
  }

  let faceProof: string | null = null;
  if (await faceEnabled()) {
    // A live face capture is required to log in.
    if (!faceTemplate) {
      return NextResponse.json(
        { error: "Camera access is required to verify your identity." },
        { status: 400 }
      );
    }
    // Enroll only the FIRST time; afterwards just verify. Once enrolled the
    // template is kept forever and is what must match again at vote time.
    // The OTP step already proved identity/email ownership, so a first-time
    // enrollment here is trusted as the voter's own face.
    if (!voter.faceEnrolled) {
      try {
        const enroll = await enrollFace(voter.id, faceTemplate);
        if (enroll.status === "review" && enroll.match) {
          console.warn(
            `[verify-otp] ambiguous face duplicate (${voter.matNumber}, voter#${voter.id}): ` +
              `distance ${enroll.match.distance.toFixed(3)} vs voter#${enroll.match.voterId} ` +
              `(${enroll.match.matNumber}, ${enroll.match.name}). Flagged for admin review.`
          );
        }
        // Persist a browsable crop of the registered face for the admin panel.
        const imageUrl = await saveFaceImage(body.faceImage);
        if (imageUrl) {
          await prisma.voter.update({
            where: { id: voter.id },
            data: { faceImageUrl: imageUrl },
          });
        }
      } catch (err) {
        if (err instanceof DuplicateFaceError) {
          console.warn(
            `[verify-otp] duplicate face BLOCKED (${matNumber}): ` +
              `distance ${err.match?.distance?.toFixed(3)} vs voter#${err.match?.voterId} ` +
              `(${err.match?.matNumber}, ${err.match?.name}).`
          );
          return NextResponse.json(
            {
              error:
                "This face is already registered to a different voter account. If this is your face, please sign in with that account's matriculation number. Otherwise contact an election officer.",
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Your face could not be registered. Please try again." },
          { status: 503 }
        );
      }
    } else {
      const face = await matchFace(voter.id, faceTemplate);
      if (!face.ok) {
        return NextResponse.json(
          { error: face.reason || "Face did not match. Please try again." },
          { status: 401 }
        );
      }
    }
    // Store a salted hash of the presented descriptor as an audit proof — the
    // DB never holds a reusable raw biometric vector.
    faceProof = proofHashFromRaw(faceTemplate);
  }

  try {
    const clientIp = getClientIp(req);
    await createVoterSession(voter.id, faceProof, clientIp);
  } catch {
    return NextResponse.json(
      { error: "Could not start your session. Please try again." },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}
