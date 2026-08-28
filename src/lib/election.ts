import { prisma } from "./prisma";

export interface VotingStatus {
  open: boolean;
  reason?: string;
  start?: Date | null;
  end?: Date | null;
}

export async function getSettings() {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  // Only create if the singleton row is missing (race-guarded with upsert).
  return prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, votingOpen: false },
  });
}

export async function getVotingStatus(): Promise<VotingStatus> {
  const s = await getSettings();
  // `votingOpen` acts as a master override:
  //  - false  -> always closed (force-closed, even inside the window)
  //  - true   -> open when now is within [start, end]; if no dates are set it is
  //              force-open; if dates are set but now is outside, it is closed.
  const now = Date.now();
  const inWindow =
    (!s.votingStart || now >= s.votingStart.getTime()) &&
    (!s.votingEnd || now <= s.votingEnd.getTime());
  const open = Boolean(s.votingOpen) && inWindow;
  let reason: string | undefined;
  if (!s.votingOpen) reason = "Voting is disabled by the commission.";
  else if (s.votingStart && now < s.votingStart.getTime())
    reason = "Voting has not opened yet.";
  else if (s.votingEnd && now > s.votingEnd.getTime())
    reason = "Voting has closed.";
  return { open, reason, start: s.votingStart, end: s.votingEnd };
}

export type PeriodKey = "registration" | "accreditation" | "voting";

export interface PeriodStatus {
  key: PeriodKey;
  label: string;
  open: boolean;
  reason?: string;
  start?: Date | null;
  end?: Date | null;
}

function statusFor(
  key: PeriodKey,
  label: string,
  enabled: boolean,
  start?: Date | null,
  end?: Date | null
): PeriodStatus {
  // `enabled` is a master override flag:
  //  - false  -> always closed (force-closed, even inside the window)
  //  - true   -> open when now is within [start, end]; if no dates are set it is
  //              force-open; if dates are set but now is outside, it is closed.
  const now = Date.now();
  const hasWindow = Boolean(start || end);
  const inWindow =
    (!start || now >= start.getTime()) && (!end || now <= end.getTime());
  const open = enabled && inWindow;
  let reason: string | undefined;
  if (!enabled) reason = `${label} is disabled by the commission.`;
  else if (start && now < start.getTime()) reason = `${label} has not opened yet.`;
  else if (end && now > end.getTime()) reason = `${label} has closed.`;
  else if (!hasWindow) reason = undefined;
  return { key, label, open, reason, start, end };
}

export async function getRegistrationStatus(): Promise<PeriodStatus> {
  const s = await getSettings();
  return statusFor(
    "registration",
    "Voter Registration",
    s.registrationOpen,
    s.registrationStart,
    s.registrationEnd
  );
}

export async function getAccreditationStatus(): Promise<PeriodStatus> {
  const s = await getSettings();
  return statusFor(
    "accreditation",
    "Accreditation",
    s.accreditationOpen,
    s.accreditationStart,
    s.accreditationEnd
  );
}

export async function getAllPeriods(): Promise<PeriodStatus[]> {
  const [reg, acc, vot] = await Promise.all([
    getRegistrationStatus(),
    getAccreditationStatus(),
    getVotingStatus().then((v) =>
      statusFor("voting", "Voting", v.open, v.start, v.end)
    ),
  ]);
  return [reg, acc, vot];
}

export interface PositionResult {
  positionId: number;
  title: string;
  description: string | null;
  order: number;
  totalVotes: number;
  abstained: number;
  candidates: {
    aspirantId: number;
    name: string;
    department: string;
    level: string;
    photoUrl: string | null;
    votes: number;
  }[];
}

export async function getLiveResults(): Promise<PositionResult[]> {
  const positions = await prisma.position.findMany({
    orderBy: { order: "asc" },
    include: {
      aspirants: { orderBy: { order: "asc" } },
      votes: { select: { aspirantId: true, abstained: true } },
    },
  });

  return positions.map((p) => {
    const counts = new Map<number, number>();
    let abstained = 0;
    for (const v of p.votes) {
      if (v.abstained || v.aspirantId == null) {
        abstained++;
        continue;
      }
      counts.set(v.aspirantId, (counts.get(v.aspirantId) || 0) + 1);
    }
    const totalVotes = p.votes.length;
    return {
      positionId: p.id,
      title: p.title,
      description: p.description,
      order: p.order,
      totalVotes,
      abstained,
      candidates: p.aspirants.map((a) => ({
        aspirantId: a.id,
        name: `${a.firstName} ${a.lastName}`,
        department: a.department,
        level: a.level,
        photoUrl: a.photoUrl,
        votes: counts.get(a.id) || 0,
      })),
    };
  });
}
