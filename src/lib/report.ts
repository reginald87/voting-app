import { prisma } from "./prisma";
import { getSettings, getVotingStatus } from "./election";

export interface ReportSummary {
  totalRegistered: number;
  accredited: number;
  pending: number;
  totalVotes: number;
  positions: number;
  aspirants: number;
  votingOpen: boolean;
  votingStart: string | null;
  votingEnd: string | null;
}

export interface VoterRow {
  matNumber: string;
  name: string;
  department: string;
  level: string;
  accredited: boolean;
  votesCast: number;
}

export interface ResultRow {
  position: string;
  candidate: string;
  department: string;
  level: string;
  votes: number;
  percentage: number;
  isWinner: boolean;
}

export interface Report {
  summary: ReportSummary;
  voters: VoterRow[];
  results: ResultRow[];
}

export async function buildReport(): Promise<Report> {
  const [settings, status] = await Promise.all([getSettings(), getVotingStatus()]);

  const [votersRaw, positionsRaw, totalVotes, aspirantCount, totalVoters, accredited] =
    await Promise.all([
      prisma.voter.findMany({
        orderBy: { matNumber: "asc" },
        include: { _count: { select: { votes: true } } },
      }),
      prisma.position.findMany({
        orderBy: { order: "asc" },
        include: {
          aspirants: { orderBy: { order: "asc" } },
          votes: { select: { aspirantId: true, abstained: true } },
        },
      }),
      prisma.vote.count(),
      prisma.aspirant.count(),
      prisma.voter.count(),
      prisma.voter.count({ where: { accredited: true } }),
    ]);

  const voters: VoterRow[] = votersRaw.map((v) => ({
    matNumber: v.matNumber,
    name: `${v.firstName} ${v.lastName}`,
    department: v.department,
    level: v.level,
    accredited: v.accredited,
    votesCast: v._count.votes,
  }));

  const results: ResultRow[] = [];
  for (const p of positionsRaw) {
    const counts = new Map<number, number>();
    let abstained = 0;
    for (const vote of p.votes) {
      if (vote.abstained || vote.aspirantId == null) {
        abstained++;
        continue;
      }
      counts.set(vote.aspirantId, (counts.get(vote.aspirantId) || 0) + 1);
    }
    const posTotal = p.votes.length;
    const counted = posTotal - abstained;
    let max = 0;
    for (const a of p.aspirants) max = Math.max(max, counts.get(a.id) || 0);
    for (const a of p.aspirants) {
      const votes = counts.get(a.id) || 0;
      results.push({
        position: p.title,
        candidate: `${a.firstName} ${a.lastName}`,
        department: a.department,
        level: a.level,
        votes,
        percentage: counted ? Math.round((votes / counted) * 1000) / 10 : 0,
        isWinner: counted > 0 && votes === max,
      });
    }
    if (abstained > 0) {
      results.push({
        position: p.title,
        candidate: "Abstained",
        department: "—",
        level: "—",
        votes: abstained,
        percentage: posTotal ? Math.round((abstained / posTotal) * 1000) / 10 : 0,
        isWinner: false,
      });
    }
  }

  const summary: ReportSummary = {
    totalRegistered: totalVoters,
    accredited,
    pending: totalVoters - accredited,
    totalVotes,
    positions: positionsRaw.length,
    aspirants: aspirantCount,
    votingOpen: status.open,
    votingStart: settings.votingStart ? settings.votingStart.toISOString() : null,
    votingEnd: settings.votingEnd ? settings.votingEnd.toISOString() : null,
  };

  return { summary, voters, results };
}

function csvCell(v: string | number | boolean) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function reportToCsv(report: Report): string {
  const lines: string[] = [];
  lines.push("BAYELSA MEDICAL UNIVERSITY SUG ELECTION REPORT");
  lines.push("");

  lines.push("ELECTION SUMMARY");
  lines.push(["Metric", "Value"].map(csvCell).join(","));
  const s = report.summary;
  lines.push(["Total Registered Voters", s.totalRegistered].map(csvCell).join(","));
  lines.push(["Accredited Voters", s.accredited].map(csvCell).join(","));
  lines.push(["Pending Accreditation", s.pending].map(csvCell).join(","));
  lines.push(["Total Votes Cast", s.totalVotes].map(csvCell).join(","));
  lines.push(["Positions", s.positions].map(csvCell).join(","));
  lines.push(["Aspirants", s.aspirants].map(csvCell).join(","));
  lines.push(["Voting Open", s.votingOpen].map(csvCell).join(","));
  lines.push("");

  lines.push("ACCREDITATION vs VOTES CAST (per voter)");
  lines.push(
    ["Mat Number", "Name", "Department", "Level", "Accredited", "Votes Cast"]
      .map(csvCell)
      .join(",")
  );
  for (const v of report.voters) {
    lines.push(
      [v.matNumber, v.name, v.department, v.level, v.accredited, v.votesCast]
        .map(csvCell)
        .join(",")
    );
  }
  lines.push("");

  lines.push("RESULTS BY POSITION (candidates grouped by category)");
  lines.push(
    ["Position", "Candidate", "Department", "Level", "Votes", "Percentage", "Winner"]
      .map(csvCell)
      .join(",")
  );
  for (const r of report.results) {
    lines.push(
      [r.position, r.candidate, r.department, r.level, r.votes, `${r.percentage}%`, r.isWinner]
        .map(csvCell)
        .join(",")
    );
  }

  return lines.join("\n");
}
