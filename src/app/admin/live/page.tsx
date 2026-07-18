import { requireAdmin } from "@/lib/session";
import { LiveDashboard } from "@/components/admin/LiveDashboard";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  await requireAdmin();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-ink">Live Votes</h1>
        <span className="badge-green">Situation Room</span>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Real-time tally of votes as they are cast. Display this screen in the situation room.
      </p>
      <LiveDashboard />
    </div>
  );
}
