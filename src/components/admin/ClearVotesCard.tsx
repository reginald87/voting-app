"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

const CONFIRM_PHRASE = "RESET";

export function ClearVotesCard({ currentVotes }: { currentVotes: number }) {
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
      const res = await fetch("/api/admin/votes/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not clear votes.");
      setToast(data.message || "Votes cleared.");
      setArmed(false);
      setPhrase("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear votes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 border-rose-200">
      <h2 className="text-lg font-semibold text-ink">Reset all votes</h2>
      <p className="mt-2 text-sm text-slate-500">
        Delete every ballot and voter session so all voters can sign in and vote
        again. This is irreversible and clears the vote counts.
      </p>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="btn-outline mt-4 border-rose-300 text-rose-600 hover:bg-rose-50"
        >
          Reset all {currentVotes} votes
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-rose-700">
            This will permanently delete all {currentVotes} recorded votes and
            sign everyone out.
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
              {busy ? "Clearing…" : "Yes, clear all votes"}
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
