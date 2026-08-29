"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

const CONFIRM_PHRASE = "LOGOUT";

export function ClearSessionsCard({ activeSessions }: { activeSessions: number }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canConfirm = phrase.trim().toUpperCase() === CONFIRM_PHRASE;

  async function clear() {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sessions/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sign out sessions.");
      setToast(data.message || "Sessions cleared.");
      setArmed(false);
      setPhrase("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out sessions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 border-amber-200">
      <h2 className="text-lg font-semibold text-ink">Log everyone out</h2>
      <p className="mt-2 text-sm text-slate-500">
        End every active voter session so anyone currently logged in must verify
        again before voting. Votes are not affected.
      </p>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="btn-outline mt-4 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          Sign out all {activeSessions} active sessions
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-amber-700">
            Everyone currently logged in will be signed out and must log in again.
            Their votes are kept.
          </p>
          <label className="block text-sm text-slate-600">
            Type <span className="font-bold">{CONFIRM_PHRASE}</span> to confirm
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="input mt-1"
            />
          </label>
          {error && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={clear}
              disabled={!canConfirm || busy}
              className="btn-primary disabled:opacity-50"
            >
              {busy ? "Signing out…" : "Yes, log everyone out"}
            </button>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                setPhrase("");
                setError(null);
              }}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
