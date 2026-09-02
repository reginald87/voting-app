import { requireAccreditor } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccreditorDashboardPage() {
  const accreditor = await requireAccreditor();

  const [totalVoters, accredited, notAccredited] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { accredited: true } }),
    prisma.voter.count({ where: { accredited: false } }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Accreditor Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome, {accreditor.name}. You can view voters and accredit them below.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-3xl font-bold text-ink">{totalVoters}</p>
          <p className="mt-1 text-sm text-slate-500">Total registered voters</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-emerald-600">{accredited}</p>
          <p className="mt-1 text-sm text-slate-500">Accredited</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-bold text-amber-600">{notAccredited}</p>
          <p className="mt-1 text-sm text-slate-500">Pending accreditation</p>
        </div>
      </div>
    </div>
  );
}
