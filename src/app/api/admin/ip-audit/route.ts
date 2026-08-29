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
    const rows = await prisma.vote.groupBy({
      by: ["ip"],
      _count: { ip: true },
      orderBy: { _count: { ip: "desc" } },
    });

    const lines: string[] = [
      ["IP Address", "Votes Cast", "Voter Mat Number", "Voter Name"].map(csvCell).join(","),
    ];

    for (const r of rows) {
      if (!r.ip) continue;
      const voters = await prisma.vote.findMany({
        where: { ip: r.ip },
        distinct: ["voterId"],
        select: {
          voter: { select: { matNumber: true, firstName: true, lastName: true } },
        },
      });
      for (const v of voters) {
        lines.push(
          [
            r.ip,
            r._count.ip,
            v.voter.matNumber,
            `${v.voter.firstName} ${v.voter.lastName}`,
          ]
            .map(csvCell)
            .join(",")
        );
      }
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
