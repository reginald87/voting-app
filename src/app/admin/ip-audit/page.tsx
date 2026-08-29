import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIpAuditPage() {
  await requireAdmin();

  const rows = await prisma.vote.groupBy({
    by: ["ip"],
    _count: { ip: true },
    orderBy: { _count: { ip: "desc" } },
  });

  const byIp: { ip: string | null; votes: number }[] = rows.map((r) => ({
    ip: r.ip,
    votes: r._count.ip,
  }));

  const withVoters = await Promise.all(
    byIp.map(async (row) => {
      const voters = await prisma.vote.findMany({
        where: { ip: row.ip },
        distinct: ["voterId"],
        select: {
          voter: { select: { matNumber: true, firstName: true, lastName: true } },
        },
      });
      return { ...row, voters: voters.map((v) => v.voter) };
    })
  );

  const withNull = withVoters.filter((r) => r.ip !== null && r.ip !== "");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">IP Audit</h1>
      <p className="mt-1 text-sm text-slate-500">
        Number of votes cast from each IP address to help spot multi-account voting from a
        single device.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">{withNull.reduce((s, r) => s + r.votes, 0)}</p>
          <p className="text-sm text-slate-500">Votes with a logged IP</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{withNull.length}</p>
          <p className="text-sm text-slate-500">Distinct IP addresses</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">IP address</th>
              <th className="px-4 py-3">Votes cast</th>
              <th className="px-4 py-3">Voters from IP</th>
            </tr>
          </thead>
          <tbody>
            {withNull.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  No votes with a logged IP yet.
                </td>
              </tr>
            ) : (
              withNull.map((row) => (
                <tr key={row.ip} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-slate-700">{row.ip}</td>
                  <td className="px-4 py-3 font-medium text-ink">{row.votes}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.voters.length > 5 ? (
                      <span>{row.voters.length} voters</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {row.voters.map((v) => (
                          <span key={v.matNumber} className="badge-slate">
                            {v.matNumber}
                          </span>
                        ))}
                      </span>
                    )}
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
