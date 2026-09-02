import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  await requireAdmin();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Audit Log</h1>
      <p className="mt-1 text-sm text-slate-500">
        Track all admin and accreditor actions across the system.
      </p>
      <div className="mt-6">
        <AuditLogViewer initialLogs={logs} />
      </div>
    </div>
  );
}
