import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { getVoter } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AspirantProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const aspirant = await prisma.aspirant.findUnique({
    where: { id },
    include: { position: true },
  });

  if (!aspirant) notFound();

  const voter = await getVoter();

  return (
    <div className="container-page py-12">
      <Link href="/positions" className="btn-ghost mb-6">
        ← Back to all positions
      </Link>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card flex flex-col items-center p-8 text-center">
            <Avatar
              first={aspirant.firstName}
              last={aspirant.lastName}
              src={aspirant.photoUrl}
              size={128}
            />
            <h1 className="mt-5 text-2xl font-bold text-ink">
              {aspirant.firstName} {aspirant.lastName}
            </h1>
            <p className="mt-1 text-brand-700">{aspirant.position.title}</p>

            <dl className="mt-6 w-full space-y-3 text-left text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Department</dt>
                <dd className="font-medium text-ink">{aspirant.department}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Level</dt>
                <dd className="font-medium text-ink">{aspirant.level}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Contesting</dt>
                <dd className="font-medium text-ink">{aspirant.position.title}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <section>
          <div className="card p-8">
            <h2 className="text-xl font-bold text-ink">Manifesto</h2>
            <div className="mt-4 whitespace-pre-line leading-relaxed text-slate-700">
              {aspirant.manifesto?.trim() ? (
                aspirant.manifesto
              ) : (
                <span className="text-slate-400">
                  This aspirant has not published a manifesto yet.
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/positions" className="btn-outline">
              View other aspirants
            </Link>
            {voter ? (
              <Link href="/vote" className="btn-primary">
                Go to ballot
              </Link>
            ) : (
              <Link href="/login" className="btn-primary">
                Sign in to vote
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
