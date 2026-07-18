import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getVotingStatus, getLiveResults } from "@/lib/election";
import { getAdmin } from "@/lib/session";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const [status, results, admin] = await Promise.all([
    getVotingStatus(),
    getLiveResults(),
    getAdmin().catch(() => null),
  ]);

  const isAdmin = Boolean(admin);
  const votingOpen = status.open;
  // The public only sees results once voting has closed. Admins may preview
  // the live tallies at any time.
  const showResults = !votingOpen || isAdmin;

  const totalVoters = await prisma.voter.count();

  return (
    <div className="container-page py-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-ink">Election Results</h1>
        <p className="mt-2 text-slate-600">
          {showResults
            ? "Live tallies across all contested offices."
            : "Results will be published here as soon as voting closes."}
        </p>
      </div>

      {!showResults && (
        <div className="card mt-8 max-w-3xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
            🗳️
          </div>
          <h2 className="text-lg font-semibold text-ink">Voting is still in progress</h2>
          <p className="mt-1 text-sm text-slate-500">
            Final results are hidden until the electoral commission closes voting. Please
            check back once voting ends.
          </p>
          {status.end && (
            <p className="mt-4 text-sm font-medium text-slate-600">
              Voting closes {status.end.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
          <Link href="/vote" className="btn-outline mt-6 inline-block">
            Go to ballot
          </Link>
        </div>
      )}

      {showResults && results.length === 0 && (
        <div className="card mt-8 max-w-3xl p-10 text-center text-slate-500">
          No results available yet.
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="mt-8 space-y-8">
          {!votingOpen && totalVoters > 0 && (
            <div className="flex flex-wrap gap-3">
              <span className="badge-slate">Registered voters: {totalVoters}</span>
              <span className="badge-slate">
                Total ballots cast: {results.reduce((s, p) => s + p.totalVotes, 0)}
              </span>
            </div>
          )}

          {results.map((pos) => {
            const maxVotes = Math.max(0, ...pos.candidates.map((c) => c.votes));
            const winners = pos.candidates.filter((c) => c.votes === maxVotes && maxVotes > 0);
            return (
              <section key={pos.positionId} className="card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-bold text-ink">{pos.title}</h2>
                  <span className="text-xs text-slate-400">
                    {pos.totalVotes} vote{pos.totalVotes === 1 ? "" : "s"}
                    {pos.abstained > 0 ? ` · ${pos.abstained} abstained` : ""}
                  </span>
                </div>
                {pos.description && (
                  <p className="mt-1 text-sm text-slate-500">{pos.description}</p>
                )}

                <ul className="mt-4 space-y-3">
                  {pos.candidates.map((c) => {
                    const pct = pos.totalVotes > 0 ? (c.votes / pos.totalVotes) * 100 : 0;
                    const isWinner = winners.includes(c) && maxVotes > 0;
                    return (
                      <li key={c.aspirantId}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              first={c.name.split(" ")[0] || ""}
                              last={c.name.split(" ")[1] || ""}
                              src={c.photoUrl}
                              size={36}
                            />
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {c.name}
                                {isWinner && (
                                  <span className="badge-green ml-2">Winner</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {c.department} · {c.level}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-ink">{c.votes}</p>
                            <p className="text-xs text-slate-400">
                              {c.votes === 0 ? "No votes" : `${pct.toFixed(0)}%`}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${isWinner ? "bg-emerald-500" : "bg-brand-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {pos.abstained > 0 && (
                    <li className="flex items-center justify-between text-sm text-slate-400">
                      <span>Abstained</span>
                      <span className="font-medium">{pos.abstained}</span>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
