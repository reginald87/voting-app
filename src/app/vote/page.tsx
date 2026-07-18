import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getVoter } from "@/lib/session";
import { getVotingStatus } from "@/lib/election";
import { Ballot } from "@/components/Ballot";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const voter = await getVoter();
  if (!voter) redirect("/login");

  const [positions, votes, status] = await Promise.all([
    prisma.position.findMany({
      orderBy: { order: "asc" },
      include: { aspirants: { orderBy: { order: "asc" } } },
    }),
    prisma.vote.findMany({
      where: { voterId: voter.id },
      include: { aspirant: true },
    }),
    getVotingStatus(),
  ]);

  const voted = votes.map((v) => ({
    positionId: v.positionId,
    candidate: v.abstained
      ? "Abstained"
      : `${v.aspirant?.firstName ?? ""} ${v.aspirant?.lastName ?? ""}`,
  }));

  return (
    <div className="container-page py-12">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-ink">Cast your vote</h1>
        <p className="mt-2 text-slate-600">
          Choose one candidate per position. Once submitted, your choice in a category is
          final and cannot be changed.
        </p>
        {status.open && status.end && (
          <p className="mt-2 text-sm font-medium text-accent-600">
            Voting closes {new Date(status.end).toLocaleString()}.
          </p>
        )}
      </div>

      <Ballot
        positions={positions.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          aspirants: p.aspirants.map((a) => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            department: a.department,
            level: a.level,
            photoUrl: a.photoUrl,
          })),
        }))}
        voted={voted}
        accredited={voter.accredited}
        statusOpen={status.open}
        statusReason={status.reason}
      />

      <div className="mt-8">
        <Link href="/profile" className="btn-ghost">
          ← Back to profile
        </Link>
      </div>
    </div>
  );
}
