import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isValidMatNumber } from "@/lib/constants";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ZoomableImage } from "@/components/ZoomableImage";
import { VoterPicker } from "@/components/admin/VoterPicker";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function clampPage(raw: number, totalPages: number) {
  return Math.min(Math.max(1, raw || 1), Math.max(1, totalPages));
}

const dtf = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function VoterActivityView({
  searchParams,
  backHref,
  pickerBasePath,
  pickerLoginUrl,
}: {
  searchParams: { mat?: string; epage?: string };
  backHref?: string;
  pickerBasePath?: string;
  pickerLoginUrl?: string;
}) {
  const rawMat = (searchParams.mat || "").trim().toUpperCase();
  const mat = isValidMatNumber(rawMat) ? rawMat : null;
  let voter = null;
  let sessions: any[] = [];
  let votes: any[] = [];

  if (mat) {
    voter = await prisma.voter.findUnique({
      where: { matNumber: mat },
    });
    if (voter) {
      const [s, v] = await Promise.all([
        prisma.session.findMany({
          where: { voterId: voter.id },
          include: { voter: { select: { matNumber: true } } },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        prisma.vote.findMany({
          where: { voterId: voter.id },
          include: {
            position: { select: { title: true } },
            aspirant: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      sessions = s;
      votes = v;
    }
  }

  // Build a single chronological activity list: logins and votes interleaved.
  type Event =
    | {
        kind: "login";
        at: Date;
        ip: string | null;
        face: boolean;
        note: string;
      }
    | {
        kind: "vote";
        at: Date;
        ip: string | null;
        face: boolean;
        imageUrl: string | null;
        note: string;
      };
  const events: Event[] = [];
  for (const sess of sessions) {
    events.push({
      kind: "login",
      at: sess.createdAt,
      ip: sess.ip,
      face: Boolean(sess.faceVerifiedAt),
      note:
        sess.faceVerifiedAt
          ? "Face-verified login"
          : "Sign-in (no face — legacy)",
    });
  }
  for (const v of votes) {
    events.push({
      kind: "vote",
      at: v.createdAt,
      ip: v.ip,
      face: Boolean(v.faceProof),
      imageUrl: v.faceImageUrl,
      note: v.abstained
        ? `Voted — Abstained (${v.position?.title ?? "?"})`
        : `Voted — ${v.aspirant ? `${v.aspirant.firstName} ${v.aspirant.lastName}` : "?"} (${v.position?.title ?? "?"})`,
    });
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const page = clampPage(Number(searchParams.epage), totalPages);
  const pageEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const base = (() => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("epage");
    return sp.toString();
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Voter Activity</h1>
      <p className="mt-1 text-sm text-slate-500">
        Full timeline of a voter&apos;s login and voting activity — times, IP addresses, and
        recorded face captures.
      </p>

      <form method="get" className="mt-6 flex max-w-md gap-2">
        <input
          name="mat"
          defaultValue={mat ?? ""}
          placeholder="UG/23/0045"
          className="input"
        />
        <button type="submit" className="btn-primary whitespace-nowrap">
          Search
        </button>
      </form>

      <div className="mt-3">
        <VoterPicker basePath={pickerBasePath} loginUrl={pickerLoginUrl} />
      </div>

      {mat && !voter && (
        <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No voter found with matriculation number <b>{mat}</b>.
        </div>
      )}

      {mat && voter && (
        <div className="mt-6">
          <div className="card p-5">
            <h2 className="text-lg font-bold text-ink">
              {voter.firstName} {voter.lastName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {voter.matNumber} · {voter.department} · {voter.level}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-2xl font-bold text-ink">{sessions.length}</p>
                <p className="text-xs text-slate-500">Logins</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-2xl font-bold text-ink">{votes.length}</p>
                <p className="text-xs text-slate-500">Votes cast</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-2xl font-bold text-ink">
                  {new Set(sessions.map((s) => s.ip).filter(Boolean)).size}
                </p>
                <p className="text-xs text-slate-500">Distinct login IPs</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {pageEvents.length === 0 && (
              <div className="card p-8 text-center text-slate-400">
                No recorded activity for this voter.
              </div>
            )}
            {pageEvents.map((ev, i) => (
              <div
                key={i}
                className="card flex items-start gap-4 p-4 sm:items-center"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
                    ev.kind === "vote" ? "bg-brand-600" : "bg-slate-400"
                  }`}
                >
                  {ev.kind === "vote" ? "V" : "L"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{ev.note}</p>
                  <p className="text-xs text-slate-500">{dtf.format(ev.at)}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="badge-slate">IP {ev.ip ?? "—"}</span>
                    <span className={ev.face ? "badge-green" : "badge-slate"}>
                      {ev.face ? "Face recorded" : "No face"}
                    </span>
                  </div>
                </div>
                {ev.kind === "vote" && ev.imageUrl && (
                  <ZoomableImage
                    src={ev.imageUrl}
                    alt="cast vote face"
                    imgClassName="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                    buttonClassName="shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            param="epage"
            base={base}
          />
        </div>
      )}

      {backHref && (
        <Link href={backHref} className="btn-ghost mt-8">
          ← Back
        </Link>
      )}
    </div>
  );
}