import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getVoter } from "@/lib/session";
import { getVotingStatus, getAllPeriods } from "@/lib/election";
import { ElectionStatus } from "@/components/ElectionStatus";
import { ProfileEdit } from "@/components/ProfileEdit";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const voter = await getVoter();
  if (!voter) redirect("/login");

  const [votes, positions, status, periods] = await Promise.all([
    prisma.vote.findMany({
      where: { voterId: voter.id },
      include: { position: true, aspirant: true },
      orderBy: { position: { order: "asc" } },
    }),
    prisma.position.count(),
    getVotingStatus(),
    getAllPeriods(),
  ]);

  const votedMap = new Map(votes.map((v) => [v.positionId, v.aspirant]));
  const votedCount = votes.length;

  return (
    <div className="container-page py-12">
      <ElectionStatus
        periods={periods.map((p) => ({
          key: p.key,
          label: p.label,
          open: p.open,
          reason: p.reason,
          start: p.start ? p.start.toISOString() : null,
          end: p.end ? p.end.toISOString() : null,
        }))}
      />

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <aside>
          <ProfileEdit
            voter={{
              firstName: voter.firstName,
              lastName: voter.lastName,
              matNumber: voter.matNumber,
              email: voter.email,
              department: voter.department,
              level: voter.level,
              sugReceipt: voter.sugReceipt,
              sugReceiptUrl: voter.sugReceiptUrl,
              avatarUrl: voter.avatarUrl,
              accredited: voter.accredited,
              faceEnrolled: voter.faceEnrolled,
            }}
          />

          {voter.accredited && status.open ? (
            <Link href="/vote" className="btn-primary mt-4 w-full">
              Go to ballot
            </Link>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              {!voter.accredited
                ? "You must be accredited by the commission before you can vote."
                : status.reason || "Voting is currently closed."}
            </div>
          )}
          {voter.accredited && !status.open && (
            <Link href="/vote" className="btn-outline mt-3 w-full">
              View ballot
            </Link>
          )}
        </aside>

        <section>
          <div className="card p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink">My Ballot</h2>
              <span className="badge-slate">
                {votedCount}/{positions} positions
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              You may vote once per position. Positions you have already voted in are locked.
            </p>

            {votes.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                  🗳️
                </div>
                <p className="font-medium text-ink">You have not cast any votes yet.</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  Once voting opens and your account is accredited, you can choose one
                  candidate per position here.
                </p>
                <Link
                  href="/vote"
                  className={`btn-primary mt-5 ${
                    !voter.accredited || !status.open ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {voter.accredited ? "Go to ballot" : "Not accredited"}
                </Link>
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-slate-100">
                {votes.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{v.position.title}</p>
                      <p className="text-xs text-slate-500">
                        {v.abstained
                          ? "Abstained"
                          : `Voted for ${v.aspirant?.firstName ?? ""} ${v.aspirant?.lastName ?? ""}`}
                      </p>
                    </div>
                    <span className={v.abstained ? "badge-slate" : "badge-green"}>
                      {v.abstained ? "Abstained" : "Voted"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {votes.length > 0 && votedCount < positions && (
              <Link href="/vote" className="btn-outline mt-6">
                Continue voting
              </Link>
            )}
            {votes.length > 0 && votedCount >= positions && (
              <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700">
                You have voted in every position. Thank you for participating.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
