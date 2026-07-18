"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PeriodValues {
  open: boolean;
  start: string;
  end: string;
}

interface Settings {
  votingOpen: boolean;
  votingStart: string | null;
  votingEnd: string | null;
  registrationOpen: boolean;
  registrationStart: string | null;
  registrationEnd: string | null;
  accreditationOpen: boolean;
  accreditationStart: string | null;
  accreditationEnd: string | null;
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function PeriodCard({
  title,
  description,
  values,
  onChange,
  accent,
}: {
  title: string;
  description: string;
  values: PeriodValues;
  onChange: (next: PeriodValues) => void;
  accent: "brand" | "accent" | "emerald";
}) {
  const accentText =
    accent === "accent"
      ? "text-accent-600"
      : accent === "emerald"
        ? "text-emerald-600"
        : "text-brand-700";
  return (
    <section className="card p-5">
      <label className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <span
          className={`mt-1 inline-flex shrink-0 items-center gap-2 text-sm font-medium ${accentText}`}
        >
          <input
            type="checkbox"
            className="h-6 w-11 cursor-pointer"
            checked={values.open}
            onChange={(e) => onChange({ ...values, open: e.target.checked })}
          />
          {values.open ? "Enabled" : "Disabled"}
        </span>
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Opens</label>
          <input
            type="datetime-local"
            className="input"
            value={values.start}
            onChange={(e) => onChange({ ...values, start: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Closes</label>
          <input
            type="datetime-local"
            className="input"
            value={values.end}
            onChange={(e) => onChange({ ...values, end: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [voting, setVoting] = useState<PeriodValues>({
    open: settings.votingOpen,
    start: toLocalInput(settings.votingStart),
    end: toLocalInput(settings.votingEnd),
  });
  const [registration, setRegistration] = useState<PeriodValues>({
    open: settings.registrationOpen,
    start: toLocalInput(settings.registrationStart),
    end: toLocalInput(settings.registrationEnd),
  });
  const [accreditation, setAccreditation] = useState<PeriodValues>({
    open: settings.accreditationOpen,
    start: toLocalInput(settings.accreditationStart),
    end: toLocalInput(settings.accreditationEnd),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        votingOpen: voting.open,
        votingStart: voting.start || null,
        votingEnd: voting.end || null,
        registrationOpen: registration.open,
        registrationStart: registration.start || null,
        registrationEnd: registration.end || null,
        accreditationOpen: accreditation.open,
        accreditationStart: accreditation.start || null,
        accreditationEnd: accreditation.end || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save.");
      return;
    }
    setMsg("Election periods updated.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {msg && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      <PeriodCard
        title="Voter Registration"
        description="When students may create a voter account. Outside this window registration is blocked."
        values={registration}
        onChange={setRegistration}
        accent="brand"
      />
      <PeriodCard
        title="Accreditation"
        description="When the commission may verify receipts and accredit voters."
        values={accreditation}
        onChange={setAccreditation}
        accent="accent"
      />
      <PeriodCard
        title="Voting"
        description="When accredited voters may cast their ballots."
        values={voting}
        onChange={setVoting}
        accent="emerald"
      />

      <p className="text-xs text-slate-400">
        Status is automatic from the start/end times. The Enabled switch is a
        master override: turn it off to force the period closed at any time, or
        leave the times blank while enabled to keep it always open. Times are
        evaluated in the server timezone (WAT, UTC+1).
      </p>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
