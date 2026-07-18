import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AspirantsManager } from "@/components/admin/AspirantsManager";

export const dynamic = "force-dynamic";

export default async function AdminAspirantsPage() {
  await requireAdmin();
  const [positions, aspirants] = await Promise.all([
    prisma.position.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true } }),
    prisma.aspirant.findMany({
      orderBy: { order: "asc" },
      include: { position: true },
    }),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Aspirants</h1>
      <p className="mt-1 text-sm text-slate-500">
        Add and manage candidates contesting each position.
      </p>
      <div className="mt-6">
        <AspirantsManager
          positions={positions}
          aspirants={aspirants.map((a) => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            department: a.department,
            level: a.level,
            manifesto: a.manifesto,
            photoUrl: a.photoUrl,
            positionId: a.positionId,
            position: { title: a.position.title },
          }))}
        />
      </div>
    </div>
  );
}
