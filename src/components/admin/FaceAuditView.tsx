import { prisma } from "@/lib/prisma";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ZoomableImage } from "@/components/ZoomableImage";
import {
  FaceDuplicateReviewCard,
  type FaceFlagDetails,
} from "@/components/admin/FaceDuplicateReviewCard";

export const dynamic = "force-dynamic";

const VOTER_PAGE_SIZE = 50;
const PROOF_PAGE_SIZE = 25;

const dtf = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function clampPage(raw: number, totalPages: number) {
  return Math.min(Math.max(1, raw || 1), Math.max(1, totalPages));
}

export async function FaceAuditView({
  searchParams,
}: {
  searchParams: { vp?: string; pp?: string };
}) {
  const [totalVoters, enrolledCount, voteDeltas, totalProofs, dupeFlags] =
    await Promise.all([
      prisma.voter.count(),
      prisma.voter.count({ where: { faceEnrolled: true } }),
      prisma.vote.groupBy({ by: ["voterId"], _count: { voterId: true } }),
      prisma.vote.count({ where: { faceProof: { not: null } } }),
      prisma.voter.findMany({
        where: {
          faceEnrolled: true,
          faceDuplicateOfId: { not: null },
          faceDuplicateReviewed: false,
        },
        select: {
          id: true,
          matNumber: true,
          firstName: true,
          lastName: true,
          faceImageUrl: true,
          faceDuplicateOfId: true,
          faceDuplicateDistance: true,
          faceDuplicateFlaggedAt: true,
          faceDuplicateOf: {
            select: {
              id: true,
              matNumber: true,
              firstName: true,
              lastName: true,
              faceImageUrl: true,
              faceEnrolled: true,
            },
          },
        },
        orderBy: { faceDuplicateFlaggedAt: "desc" },
        take: 50,
      }),
    ]);

  const voterTotalPages = Math.max(
    1,
    Math.ceil(totalVoters / VOTER_PAGE_SIZE)
  );
  const proofTotalPages = Math.max(1, Math.ceil(totalProofs / PROOF_PAGE_SIZE));
  const vPage = clampPage(Number(searchParams.vp), voterTotalPages);
  const pPage = clampPage(Number(searchParams.pp), proofTotalPages);

  const [voters, voteProofs] = await Promise.all([
    prisma.voter.findMany({
      select: {
        id: true,
        matNumber: true,
        firstName: true,
        lastName: true,
        faceEnrolled: true,
        faceRegisteredAt: true,
        faceHash: true,
        faceImageUrl: true,
      },
      orderBy: [{ faceEnrolled: "desc" }, { matNumber: "asc" }],
      skip: (vPage - 1) * VOTER_PAGE_SIZE,
      take: VOTER_PAGE_SIZE,
    }),
    prisma.vote.findMany({
      where: { faceProof: { not: null } },
      include: {
        voter: { select: { matNumber: true, firstName: true, lastName: true } },
        position: { select: { title: true } },
        aspirant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (pPage - 1) * PROOF_PAGE_SIZE,
      take: PROOF_PAGE_SIZE,
    }),
  ]);

  const votesPerVoter = new Map(
    voteDeltas.map((v) => [v.voterId, v._count.voterId])
  );

  const votersBase = (() => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("vp");
    return sp.toString();
  })();
  const proofsBase = (() => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("pp");
    return sp.toString();
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Registered Faces</h1>
      <p className="mt-1 text-sm text-slate-500">
        Which voters have registered a face, when, and how many votes each cast. Face
        templates are stored encrypted at rest; only a salted hash is shown here.
      </p>

      {dupeFlags.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">
            Needs review{" "}
            <span className="badge-amber ml-1 align-middle">{dupeFlags.length}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A new face matched an existing enrolment closely enough to be flagged, but
            not closely enough to be an automatic block. Compare the two photos and
            confirm whether they are the same person.
          </p>
          <div className="mt-4 space-y-4">
            {dupeFlags.map((f) => {
              if (!f.faceDuplicateOf) return null;
              const flag: FaceFlagDetails = {
                id: f.id,
                matNumber: f.matNumber,
                name: `${f.firstName} ${f.lastName}`,
                faceImageUrl: f.faceImageUrl,
                distance: f.faceDuplicateDistance ?? 0,
                againstId: f.faceDuplicateOf.id,
                againstMatNumber: f.faceDuplicateOf.matNumber,
                againstName: `${f.faceDuplicateOf.firstName} ${f.faceDuplicateOf.lastName}`,
                againstFaceImageUrl: f.faceDuplicateOf.faceImageUrl,
                againstEnrolled: f.faceDuplicateOf.faceEnrolled,
                flaggedAt: f.faceDuplicateFlaggedAt
                  ? dtf.format(f.faceDuplicateFlaggedAt)
                  : "—",
              };
              return <FaceDuplicateReviewCard key={f.id} flag={flag} />;
            })}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">{totalVoters}</p>
          <p className="text-sm text-slate-500">Total voters</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-brand-700">{enrolledCount}</p>
          <p className="text-sm text-slate-500">Face registered</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-amber-600">{totalVoters - enrolledCount}</p>
          <p className="text-sm text-slate-500">Not yet registered</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">
            {Math.round((enrolledCount / Math.max(totalVoters, 1)) * 100)}%
          </p>
          <p className="text-sm text-slate-500">Registration coverage</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Voter</th>
              <th className="px-4 py-3">Mat number</th>
              <th className="px-4 py-3">Fingerprint (hash)</th>
              <th className="px-4 py-3">Registered at</th>
              <th className="px-4 py-3">Votes cast</th>
            </tr>
          </thead>
          <tbody>
            {voters.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No voters found.
                </td>
              </tr>
            ) : (
              voters.map((v) => (
                <tr
                  key={v.id}
                  className={`border-t border-slate-100 ${v.faceEnrolled ? "" : "bg-amber-50/40"}`}
                >
                  <td className="px-4 py-3">
                    {v.faceImageUrl ? (
                      <ZoomableImage
                        src={v.faceImageUrl}
                        alt={`${v.firstName} ${v.lastName}`}
                        imgClassName="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-400">
                        {v.firstName?.[0] ?? "?"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {v.firstName} {v.lastName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">{v.matNumber}</td>
                  <td className="px-4 py-3">
                    {v.faceEnrolled ? (
                      <span className="font-mono text-xs text-slate-500">
                        {v.faceHash?.slice(0, 16) ?? "—"}…
                      </span>
                    ) : (
                      <span className="badge-slate">Not registered</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.faceRegisteredAt ? dtf.format(v.faceRegisteredAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {votesPerVoter.get(v.id) ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={vPage}
        totalPages={voterTotalPages}
        param="vp"
        base={votersBase}
      />

      <div className="mt-10">
        <h2 className="text-lg font-bold text-ink">Who voted (face-verified)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each cast ballot with its live face capture and time, so an admin can see who
          actually voted.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Voter</th>
                <th className="px-4 py-3">Mat number</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Voted for</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {voteProofs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No face-verified votes recorded yet.
                  </td>
                </tr>
              ) : (
                voteProofs.map((vp) => (
                  <tr key={vp.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      {vp.faceImageUrl ? (
                        <ZoomableImage
                          src={vp.faceImageUrl}
                          alt={`${vp.voter.firstName} ${vp.voter.lastName}`}
                          imgClassName="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-400">
                          {vp.voter.firstName?.[0] ?? "?"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {vp.voter.firstName} {vp.voter.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{vp.voter.matNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{vp.position?.title ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {vp.abstained
                        ? "Abstained"
                        : vp.aspirant
                          ? `${vp.aspirant.firstName} ${vp.aspirant.lastName}`
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{dtf.format(vp.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{vp.ip ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={pPage}
          totalPages={proofTotalPages}
          param="pp"
          base={proofsBase}
        />
      </div>
    </div>
  );
}