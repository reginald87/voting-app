import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function ExecutivesPage() {
  const executives = await prisma.executive.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-ink">SUG Executives</h1>
        <p className="mt-2 text-slate-600">
          The current leadership of the Bayelsa Medical University Student Union Government
          serving the student body.
        </p>
      </div>

      {executives.length === 0 ? (
        <div className="card mt-10 p-10 text-center text-slate-500">
          Executive details have not been published yet.
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {executives.map((e) => (
            <div key={e.id} className="card flex flex-col items-center p-6 text-center">
              <Avatar first={e.name} last=" " src={e.photoUrl} size={96} />
              <p className="mt-4 text-lg font-semibold text-ink">{e.name}</p>
              <p className="text-sm font-medium text-brand-700">{e.position}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="badge-slate">{e.department}</span>
                <span className="badge-slate">{e.level}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">Serving: {e.year}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
