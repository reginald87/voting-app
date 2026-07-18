import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/election";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const s = await getSettings();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Election Periods</h1>
      <p className="mt-1 text-sm text-slate-500">
        Control when voters can register, get accredited, and cast their votes.
      </p>
      <div className="mt-6">
        <SettingsForm
          settings={{
            votingOpen: s.votingOpen,
            votingStart: s.votingStart ? s.votingStart.toISOString() : null,
            votingEnd: s.votingEnd ? s.votingEnd.toISOString() : null,
            registrationOpen: s.registrationOpen,
            registrationStart: s.registrationStart ? s.registrationStart.toISOString() : null,
            registrationEnd: s.registrationEnd ? s.registrationEnd.toISOString() : null,
            accreditationOpen: s.accreditationOpen,
            accreditationStart: s.accreditationStart ? s.accreditationStart.toISOString() : null,
            accreditationEnd: s.accreditationEnd ? s.accreditationEnd.toISOString() : null,
          }}
        />
      </div>
    </div>
  );
}
