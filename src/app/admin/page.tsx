import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSettings, getVotingStatus, getAllPeriods } from "@/lib/election";
import { ClearVotesCard } from "@/components/admin/ClearVotesCard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [totalVoters, accredited, votes, positions, aspirants] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { accredited: true } }),
    prisma.vote.count(),
    prisma.position.count(),
    prisma.aspirant.count(),
  ]);

  const status = await getVotingStatus();
  const settings = await getSettings();
  const periods = await getAllPeriods();
  const participation =
    accredited > 0 ? Math.round((votes / (accredited * Math.max(positions, 1))) * 100) : 0;

  const stats = [
    { label: "Registered voters", value: totalVoters },
    { label: "Accredited", value: accredited },
    { label: "Votes cast", value: votes },
    { label: "Positions", value: positions },
    { label: "Aspirants", value: aspirants },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of the election administration.
          </p>
        </div>
        <span
          className={`badge px-3 py-1 text-sm ${
            status.open ? "badge-green" : "badge-amber"
          }`}
        >
          {status.open ? "Voting OPEN" : "Voting CLOSED"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {periods.map((p) => (
          <div
            key={p.key}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <span className="text-sm font-medium text-ink">{p.label}</span>
            <span className={`badge ${p.open ? "badge-green" : "badge-amber"}`}>
              {p.open ? "Open" : "Closed"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-3xl font-bold text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Voting window</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium">{status.open ? "Open" : "Closed"}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Starts</dt>
              <dd className="font-medium">
                {settings.votingStart ? new Date(settings.votingStart).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Ends</dt>
              <dd className="font-medium">
                {settings.votingEnd ? new Date(settings.votingEnd).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
          <Link href="/admin/settings" className="btn-outline mt-4">
            Configure voting period
          </Link>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Participation</h2>
          <p className="mt-3 text-sm text-slate-500">
            Accredited voters who have cast at least part of their ballot.
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{votes} votes</span>
              <span className="text-slate-500">
                {accredited} accredited × {positions} positions
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${Math.min(participation, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {participation}% of possible ballot slots filled.
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/admin/live" className="btn-primary">
              Live votes
            </Link>
            <Link href="/admin/reports" className="btn-outline">
              Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <ClearVotesCard currentVotes={votes} />
      </div>
    </div>
  );
}
