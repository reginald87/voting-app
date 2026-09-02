import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AccreditorManager } from "@/components/admin/AccreditorManager";

export const dynamic = "force-dynamic";

export default async function AdminAccreditorsPage() {
  await requireAdmin();
  const accreditors = await prisma.accreditor.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      active: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Accreditors</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage accreditor accounts. Accreditors can only view voters and accredit them.
      </p>
      <div className="mt-6">
        <AccreditorManager initialAccreditors={accreditors} />
      </div>
    </div>
  );
}
