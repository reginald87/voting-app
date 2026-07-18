import { requireAdmin } from "@/lib/session";
import { buildReport } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();
  const report = await buildReport();
  const s = report.summary;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">
        Generate election reports for accreditation vs votes cast and results grouped by
        position.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">{s.totalRegistered}</p>
          <p className="text-sm text-slate-500">Registered voters</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-emerald-600">{s.accredited}</p>
          <p className="text-sm text-slate-500">Accredited</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{s.totalVotes}</p>
          <p className="text-sm text-slate-500">Votes cast</p>
        </div>
      </div>

      <div className="mt-8 card p-6">
        <h2 className="text-lg font-semibold text-ink">Download report</h2>
        <p className="mt-1 text-sm text-slate-500">
          Includes election summary, per-voter accreditation vs votes cast, and results by
          position.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/api/admin/reports?format=csv" className="btn-primary">
            Download CSV
          </a>
          <a href="/api/admin/reports?format=pdf" className="btn-outline">
            Download PDF
          </a>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Results by position</h2>
        <div className="mt-4 space-y-6">
          {Object.entries(group(report.results)).map(([pos, rows]) => {
            const total = rows.reduce((t, r) => t + r.votes, 0);
            const max = Math.max(1, ...rows.map((r) => r.votes));
            return (
              <div key={pos} className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-ink">{pos}</h3>
                  <span className="badge-slate">{total} votes</span>
                </div>
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div key={r.candidate}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">
                          {r.candidate}
                          {r.isWinner && total > 0 ? (
                            <span className="ml-2 badge-green">Winner</span>
                          ) : null}
                        </span>
                        <span className="text-slate-500">
                          {r.votes} ({r.percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${(r.votes / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function group(
  results: { position: string; candidate: string; department: string; level: string; votes: number; percentage: number; isWinner: boolean }[]
) {
  const m: Record<string, typeof results> = {};
  for (const r of results) {
    (m[r.position] ||= []).push(r);
  }
  return m;
}
