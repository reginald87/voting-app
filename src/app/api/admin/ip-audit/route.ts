import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/session";

export const dynamic = "force-dynamic";

function csvCell(v: string | number | boolean) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const [voteRows, sessionRows] = await Promise.all([
      prisma.vote.findMany({ select: { ip: true, voterId: true } }),
      prisma.session.findMany({ select: { ip: true, voterId: true } }),
    ]);

    const byIp = new Map<
      string,
      { votes: number; logins: number; voters: Set<number> }
    >();
    for (const v of voteRows) {
      if (!v.ip) continue;
      const e = byIp.get(v.ip) || { votes: 0, logins: 0, voters: new Set() };
      e.votes++;
      e.voters.add(v.voterId);
      byIp.set(v.ip, e);
    }
    for (const s of sessionRows) {
      if (!s.ip) continue;
      const e = byIp.get(s.ip) || { votes: 0, logins: 0, voters: new Set() };
      e.logins++;
      e.voters.add(s.voterId);
      byIp.set(s.ip, e);
    }

    const lines: string[] = [
      ["IP Address", "Logins", "Votes Cast", "Distinct Accounts", "Multi-Account?"]
        .map(csvCell)
        .join(","),
    ];

    for (const [ip, e] of byIp.entries()) {
      if (!ip) continue;
      lines.push(
        [
          ip,
          e.logins,
          e.votes,
          e.voters.size,
          e.voters.size > 1 ? "YES" : "NO",
        ]
          .map(csvCell)
          .join(",")
      );
    }

    const csv = lines.join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ip-audit.csv"',
      },
    });
  }

  return NextResponse.json({ error: "Unknown format." }, { status: 400 });
}
