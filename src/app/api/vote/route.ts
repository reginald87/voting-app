import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVoter } from "@/lib/session";
import { getVotingStatus } from "@/lib/election";

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

  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position) {
    return NextResponse.json({ error: "Unknown position." }, { status: 400 });
  }

  const existing = await prisma.vote.findUnique({
    where: { voterId_positionId: { voterId: voter.id, positionId } },
    include: { position: true, aspirant: true },
  });
  if (existing) {
    if (existing.abstained) {
      return NextResponse.json(
        {
          alreadyVoted: true,
          error: `You have already abstained in "${existing.position.title}". You cannot change this.`,
        },
        { status: 409 }
      );
    }
    const candidateName = existing.aspirant
      ? `${existing.aspirant.firstName} ${existing.aspirant.lastName}`
      : "a candidate";
    return NextResponse.json(
      {
        alreadyVoted: true,
        error: `You have already voted in "${existing.position.title}" for ${candidateName}. You cannot vote again in this category.`,
      },
      { status: 409 }
    );
  }

  if (abstain) {
    await prisma.vote.create({
      data: { voterId: voter.id, positionId, aspirantId: null, abstained: true },
    });
    return NextResponse.json({
      ok: true,
      positionTitle: position.title,
      abstained: true,
    });
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

  await prisma.vote.create({
    data: { voterId: voter.id, positionId, aspirantId: aspirant.id },
  });

  return NextResponse.json({
    ok: true,
    positionTitle: aspirant.position.title,
    candidate: `${aspirant.firstName} ${aspirant.lastName}`,
  });
}
