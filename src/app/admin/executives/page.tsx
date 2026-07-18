import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ExecutivesManager } from "@/components/admin/ExecutivesManager";

export const dynamic = "force-dynamic";

export default async function AdminExecutivesPage() {
  await requireAdmin();
  const executives = await prisma.executive.findMany({ orderBy: { order: "asc" } });
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Executives</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage the current SUG executive profiles shown on the public executives page.
      </p>
      <div className="mt-6">
        <ExecutivesManager
          executives={executives.map((e) => ({
            id: e.id,
            name: e.name,
            position: e.position,
            department: e.department,
            level: e.level,
            year: e.year,
            photoUrl: e.photoUrl,
          }))}
        />
      </div>
    </div>
  );
}
