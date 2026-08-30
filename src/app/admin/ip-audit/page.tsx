import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIpAuditPage() {
  await requireAdmin();

  // Votes: candidate/IP/voter linkage. Sessions: login/IP/voter linkage.
  const [voteRows, sessionRows] = await Promise.all([
    prisma.vote.findMany({
      select: {
        ip: true,
        voterId: true,
        voter: { select: { matNumber: true, firstName: true, lastName: true } },
        position: { select: { title: true } },
        aspirant: { select: { firstName: true, lastName: true } },
        abstained: true,
        createdAt: true,
      },
    }),
    prisma.session.findMany({
      select: {
        ip: true,
        voterId: true,
        voter: { select: { matNumber: true, firstName: true, lastName: true } },
        createdAt: true,
      },
    }),
  ]);

  const byIp = new Map<
    string,
    {
      votes: number;
      logins: number;
      voters: Map<string, { matNumber: string; name: string }>;
    }
  >();

  for (const v of voteRows) {
    if (!v.ip) continue;
    const e = byIp.get(v.ip) || {
      votes: 0,
      logins: 0,
      voters: new Map(),
    };
    e.votes++;
    e.voters.set(String(v.voterId), {
      matNumber: v.voter.matNumber,
      name: `${v.voter.firstName} ${v.voter.lastName}`,
    });
    byIp.set(v.ip, e);
  }

  for (const s of sessionRows) {
    if (!s.ip) continue;
    const e = byIp.get(s.ip) || {
      votes: 0,
      logins: 0,
      voters: new Map(),
    };
    e.logins++;
    e.voters.set(String(s.voterId), {
      matNumber: s.voter.matNumber,
      name: `${s.voter.firstName} ${s.voter.lastName}`,
    });
    byIp.set(s.ip, e);
  }

  const rows = [...byIp.entries()]
    .map(([ip, e]) => ({
      ip,
      votes: e.votes,
      logins: e.logins,
      accountCount: e.voters.size,
      voters: [...e.voters.values()],
    }))
    .filter((r) => r.ip !== "")
    .sort((a, b) => b.voters.length - a.voters.length || b.votes - a.votes);

  const totalVoteRows = voteRows.filter((v) => v.ip).length;
  const totalSessionRows = sessionRows.filter((s) => s.ip).length;
  const flagged = rows.filter((r) => r.accountCount > 1);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">IP Audit</h1>
      <p className="mt-1 text-sm text-slate-500">
        Logins and votes per IP address. IPs that touched multiple distinct voter accounts
        are flagged to help spot a single device used for many accounts. Flagging is for
        review only — no automatic lockout, because shared university/ISP networks share
        one public IP.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">{totalVoteRows}</p>
          <p className="text-sm text-slate-500">Votes with a logged IP</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">{totalSessionRows}</p>
          <p className="text-sm text-slate-500">Logins with a logged IP</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{rows.length}</p>
          <p className="text-sm text-slate-500">Distinct IP addresses</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-amber-600">{flagged.length}</p>
          <p className="text-sm text-slate-500">IPs touching multiple accounts</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <a
          href="/api/admin/ip-audit?format=csv"
          className="btn-outline"
          download="ip-audit.csv"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">IP address</th>
              <th className="px-4 py-3">Logins</th>
              <th className="px-4 py-3">Votes</th>
              <th className="px-4 py-3">Distinct accounts</th>
              <th className="px-4 py-3">Voters from IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No votes or logins with a logged IP yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.ip}
                  className={`border-t border-slate-100 align-top ${
                    row.accountCount > 1 ? "bg-amber-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-slate-700">{row.ip}</td>
                  <td className="px-4 py-3 font-medium text-ink">{row.logins}</td>
                  <td className="px-4 py-3 font-medium text-ink">{row.votes}</td>
                  <td className="px-4 py-3">
                    {row.accountCount > 1 ? (
                      <span className="badge-amber">{row.accountCount} accounts</span>
                    ) : (
                      <span className="text-slate-500">1</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex flex-wrap gap-1">
                      {row.voters.map((v) => (
                        <span key={v.matNumber} className="badge-slate whitespace-nowrap">
                          {v.matNumber} · {v.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
