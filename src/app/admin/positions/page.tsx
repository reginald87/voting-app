import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PositionsManager } from "@/components/admin/PositionsManager";

export const dynamic = "force-dynamic";

export default async function AdminPositionsPage() {
  await requireAdmin();
  const positions = await prisma.position.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { aspirants: true } } },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Positions</h1>
      <p className="mt-1 text-sm text-slate-500">
        Define contestable offices. Aspirants are managed separately.
      </p>
      <div className="mt-6">
        <PositionsManager
          positions={positions.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            order: p.order,
            _count: { aspirants: p._count.aspirants },
          }))}
        />
      </div>
    </div>
  );
}
