import { requireAdmin } from "@/lib/session";
import { VotersManager } from "@/components/admin/VotersManager";

export const dynamic = "force-dynamic";

export default async function AdminVotersPage() {
  await requireAdmin();
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-ink">Voters</h1>
        <p className="mt-1 text-sm text-slate-500">
          View registered voters, accredit them, or remove accounts. Deleting a voter also
          removes their session, OTPs and any ballots they have cast.
        </p>
      </div>
      <div className="mt-6 max-w-5xl">
        <VotersManager />
      </div>
    </div>
  );
}
