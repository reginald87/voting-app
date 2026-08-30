import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoter, destroyVoterSession } from "@/lib/session";
import { getVotingStatus } from "@/lib/election";
import { withWriteLock } from "@/lib/voteQueue";
import { getClientIp } from "@/lib/ip";
import { faceEnabled, matchFace } from "@/lib/face";
import { proofHashFromRaw } from "@/lib/biometric";
import { saveFaceImage } from "@/lib/faceImage";

const PRISMA_UNIQUE_ERR = "P2002";

export async function POST(req: Request) {
  const voter = await getVoter();
  if (!voter) {
    return NextResponse.json({ error: "You must sign in to vote." }, { status: 401 });
  }
  if (!voter.accredited) {
    return NextResponse.json(
      { error: "You are not accredited yet. Please see the electoral commission." },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);

  const status = await getVotingStatus();
  if (!status.open) {
    return NextResponse.json(
      { error: status.reason || "Voting is currently closed." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const positionId = Number(body.positionId);
  const abstain = Boolean(body.abstain);
  const aspirantIdRaw = body.aspirantId;
  const aspirantId =
    aspirantIdRaw === null || aspirantIdRaw === undefined
      ? null
      : Number(aspirantIdRaw);

  if (!Number.isInteger(positionId)) {
    return NextResponse.json({ error: "Invalid vote payload." }, { status: 400 });
  }
  if (!abstain && (aspirantId === null || !Number.isInteger(aspirantId))) {
    return NextResponse.json({ error: "Invalid vote payload." }, { status: 400 });
  }

  const rawFace = body.faceTemplate ?? null;
  const faceTemplate =
    typeof rawFace === "string"
      ? rawFace
      : Array.isArray(rawFace)
        ? JSON.stringify(rawFace)
        : rawFace;

  // Face is a hard requirement at vote time when face mode is active, to stop
  // a stolen email+OTP session from casting a vote without the voter's face.
  let faceProof: string | null = null;
  let faceImageUrl: string | null = null;
  if (await faceEnabled()) {
    if (!voter.faceEnrolled) {
      return NextResponse.json(
        { error: "You have not enrolled a face yet. Please contact the electoral commission to complete verification." },
        { status: 401 }
      );
    }
    const face = await matchFace(voter.id, faceTemplate);
    if (!face.ok) {
      return NextResponse.json(
        { error: face.reason || "Face verification failed. Please retry with your face in view of the camera." },
        { status: 401 }
      );
    }
    // Store a salted hash of the presented descriptor as vote proof — the DB
    // never holds a reusable raw biometric vector.
    faceProof = proofHashFromRaw(faceTemplate);
    // Persist a browsable crop of the vote-time face for the admin panel, so
    // an admin can see who actually cast each vote.
    try {
      faceImageUrl = await saveFaceImage(body.faceImage);
    } catch {
      faceImageUrl = null;
    }
  }

  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position) {
    return NextResponse.json({ error: "Unknown position." }, { status: 400 });
  }

  if (abstain) {
    return finalizeVote(voter.id, positionId, position.title, null, true, null, ip, faceProof, faceImageUrl);
  }

  const aspirant = await prisma.aspirant.findUnique({
    where: { id: aspirantId! },
    include: { position: true },
  });
  if (!aspirant || aspirant.positionId !== positionId) {
    return NextResponse.json(
      { error: "That candidate is not contesting this position." },
      { status: 400 }
    );
  }

  return finalizeVote(
    voter.id,
    positionId,
    position.title,
    aspirant.id,
    false,
    `${aspirant.firstName} ${aspirant.lastName}`,
    ip,
    faceProof,
    faceImageUrl
  );
} 

async function finalizeVote(
  voterId: number,
  positionId: number,
  positionTitle: string,
  aspirantId: number | null,
  abstain: boolean,
  candidateName: string | null,
  ip: string | null,
  faceProof: string | null,
  faceImageUrl: string | null
): Promise<NextResponse> {
  try {
    const vote = await withWriteLock(() =>
      prisma.$transaction(
        async (tx) => {
          const existing = await tx.vote.findUnique({
            where: { voterId_positionId: { voterId, positionId } },
            include: { position: true, aspirant: true },
          });
          if (existing) {
            return { conflict: existing as any };
          }
          return tx.vote.create({
            data: {
              voterId,
              positionId,
              aspirantId,
              abstained: abstain,
              ip,
              faceProof,
              faceImageUrl,
              faceVerifiedAt: faceProof ? new Date() : null,
            },
          });
        },
        {
          // Under heavy concurrency the serialized write queue + SQLite's
          // busy_timeout (30s) can legitimately hold a transaction open far
          // longer than Prisma's default 5s interactive timeout. If a queued
          // transaction exceeds 5s it is killed with P2028 BEFORE committing,
          // silently dropping the vote. Raise the timeout to match the DB-level
          // wait so queued writers aren't killed mid-flight.
          timeout: 30000,
        }
      )
    );

    if ("conflict" in (vote ?? {})) {
      const existing = (vote as any).conflict;
      const votedFor = existing.aspirant
        ? `${existing.aspirant.firstName} ${existing.aspirant.lastName}`
        : "a candidate";
      return NextResponse.json(
        {
          alreadyVoted: true,
          error:
            existing.abstained
              ? `You have already abstained in "${existing.position.title}". You cannot change this.`
              : `You have already voted in "${existing.position.title}" for ${votedFor}. You cannot vote again in this category.`,
        },
        { status: 409 }
      );
    }

    let allPositionsVoted = false;
    try {
      const [voteCount, positionCount] = await Promise.all([
        prisma.vote.count({ where: { voterId } }),
        prisma.position.count(),
      ]);
      allPositionsVoted = voteCount >= positionCount && positionCount > 0;
    } catch (err) {
      console.error("[vote] completed check failed:", err);
    }

    if (allPositionsVoted) {
      await destroyVoterSession();
    }

    return NextResponse.json({
      ok: true,
      positionTitle,
      abstained: abstain,
      candidate: candidateName,
      completed: allPositionsVoted,
    });
  } catch (err: any) {
    // The unique constraint is the DB-level backstop against a concurrent
    // double-submit racing past the check above. Turn it into a graceful 409.
    if (
      err &&
      (err.code === PRISMA_UNIQUE_ERR ||
        err.message?.includes("Unique constraint"))
    ) {
      return NextResponse.json(
        {
          alreadyVoted: true,
          error:
            "Your vote in this category was already recorded. You cannot vote again.",
        },
        { status: 409 }
      );
    }
    console.error("[vote] record failed:", err?.code, err?.message, JSON.stringify(err?.meta));
    return NextResponse.json(
      { error: "Your vote could not be recorded. Please try again." },
      { status: 500 }
    );
  }
}
