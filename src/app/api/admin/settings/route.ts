import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// Admin submits local wall-clock time in WAT (UTC+1). Interpret it as UTC+1
// explicitly so the stored instant is correct regardless of the server's
// configured timezone.
const WAT_OFFSET_MIN = 60;

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const naive = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(naive)) {
    const d = new Date(naive);
    return isNaN(d.getTime()) ? null : d;
  }
  const asUtc = new Date(`${naive}:00Z`);
  if (isNaN(asUtc.getTime())) return null;
  // WAT is UTC+1, so a WAT wall-clock instant is one hour behind UTC.
  return new Date(asUtc.getTime() - WAT_OFFSET_MIN * 60000);
}

export async function GET() {
  await requireAdmin();
  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const votingOpen = Boolean(body.votingOpen);
  const votingStart = toDate(body.votingStart);
  const votingEnd = toDate(body.votingEnd);

  const registrationOpen = Boolean(body.registrationOpen);
  const registrationStart = toDate(body.registrationStart);
  const registrationEnd = toDate(body.registrationEnd);

  const accreditationOpen = Boolean(body.accreditationOpen);
  const accreditationStart = toDate(body.accreditationStart);
  const accreditationEnd = toDate(body.accreditationEnd);

  if (votingStart && votingEnd && votingEnd <= votingStart) {
    return NextResponse.json(
      { error: "Voting end must be after the start." },
      { status: 400 }
    );
  }
  if (
    registrationStart &&
    registrationEnd &&
    registrationEnd <= registrationStart
  ) {
    return NextResponse.json(
      { error: "Registration end must be after the start." },
      { status: 400 }
    );
  }
  if (
    accreditationStart &&
    accreditationEnd &&
    accreditationEnd <= accreditationStart
  ) {
    return NextResponse.json(
      { error: "Accreditation end must be after the start." },
      { status: 400 }
    );
  }

  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    update: {
      votingOpen,
      votingStart,
      votingEnd,
      registrationOpen,
      registrationStart,
      registrationEnd,
      accreditationOpen,
      accreditationStart,
      accreditationEnd,
      updatedAt: new Date(),
    },
    create: {
      id: 1,
      votingOpen,
      votingStart,
      votingEnd,
      registrationOpen,
      registrationStart,
      registrationEnd,
      accreditationOpen,
      accreditationStart,
      accreditationEnd,
    },
  });
  return NextResponse.json({ ok: true, settings });
}
