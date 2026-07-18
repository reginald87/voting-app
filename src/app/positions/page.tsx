import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const positions = await prisma.position.findMany({
    orderBy: { order: "asc" },
    include: { aspirants: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-ink">Positions &amp; Aspirants</h1>
        <p className="mt-2 text-slate-600">
          Browse every contested office and meet the students vying for them. Select any
          aspirant to read their full profile and manifesto.
        </p>
      </div>

      {positions.length === 0 ? (
        <div className="card mt-10 p-10 text-center text-slate-500">
          No positions have been published yet. Please check back soon.
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {positions.map((pos) => (
            <section key={pos.id}>
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-2xl font-bold text-ink">{pos.title}</h2>
                  {pos.description && (
                    <p className="mt-1 text-sm text-slate-500">{pos.description}</p>
                  )}
                </div>
                <span className="badge-slate">
                  {pos.aspirants.length} aspirant
                  {pos.aspirants.length === 1 ? "" : "s"}
                </span>
              </div>

              {pos.aspirants.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No aspirants have declared for this position yet.
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {pos.aspirants.map((a) => (
                    <Link
                      key={a.id}
                      href={`/aspirants/${a.id}`}
                      className="card group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                    >
                      <Avatar
                        first={a.firstName}
                        last={a.lastName}
                        src={a.photoUrl}
                        size={64}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-ink group-hover:text-brand-700">
                          {a.firstName} {a.lastName}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">{pos.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {a.department}
                        </p>
                        <p className="text-xs text-slate-400">{a.level}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
