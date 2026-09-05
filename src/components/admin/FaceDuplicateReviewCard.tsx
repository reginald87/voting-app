"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { ZoomableImage } from "@/components/ZoomableImage";

export interface FaceFlagDetails {
  id: number;
  matNumber: string;
  name: string;
  faceImageUrl: string | null;
  distance: number;
  againstId: number;
  againstMatNumber: string;
  againstName: string;
  againstFaceImageUrl: string | null;
  againstEnrolled: boolean;
  flaggedAt: string;
}

/**
 * Admin control for an ambiguous face-duplicate flag. The officer compares the
 * two photos and either records that the faces are the same person (allow) or
 * that they are different people / a bad capture (block, which removes the new
 * enrolment so the voter must re-enrol).
 */
export function FaceDuplicateReviewCard({ flag }: { flag: FaceFlagDetails }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [phrase, setPhrase] = useState("");

  async function resolve(verdict: "allow" | "block") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/face-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flag.id, verdict }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update this flag.");
      setToast(
        verdict === "allow"
          ? "Recorded as the same voter."
          : "Face enrolment removed; voter can re-enrol."
      );
      setConfirmBlock(false);
      setPhrase("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this flag.");
    } finally {
      setBusy(false);
    }
  }

  const canConfirmBlock = phrase.trim().toUpperCase() === "REMOVE";

  return (
    <div className="card p-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex items-center gap-3">
          {flag.faceImageUrl ? (
            <ZoomableImage
              src={flag.faceImageUrl}
              alt={flag.name}
              imgClassName="h-16 w-16 rounded-lg object-cover ring-1 ring-amber-300"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-amber-100 text-xl font-bold text-amber-700">
              {flag.name?.[0] ?? "?"}
            </span>
          )}
          <div>
            <p className="font-medium text-ink">{flag.name}</p>
            <p className="font-mono text-sm text-slate-500">{flag.matNumber}</p>
            <p className="text-xs text-amber-600">
              Flagged {flag.flaggedAt}
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-slate-700">
            {flag.distance.toFixed(3)}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            distance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-ink">{flag.againstName}</p>
            <p className="font-mono text-sm text-slate-500">
              {flag.againstMatNumber}
            </p>
            <p className="text-xs text-slate-400">
              {flag.againstEnrolled ? "face enrolled" : "face removed"}
            </p>
          </div>
          {flag.againstFaceImageUrl ? (
            <ZoomableImage
              src={flag.againstFaceImageUrl}
              alt={flag.againstName}
              imgClassName="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xl font-bold text-slate-400">
              {flag.againstName?.[0] ?? "?"}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!confirmBlock ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => resolve("allow")}
            disabled={busy}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Saving…" : "Same voter — keep both"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmBlock(true)}
            disabled={busy}
            className="btn-outline border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            Not them — remove this face
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-rose-700">
            This will remove the face enrolment for <b>{flag.matNumber}</b>. They
            can re-enrol a fresh capture next time they sign in.
          </p>
          <label className="block text-sm text-slate-600">
            Type <span className="font-bold">REMOVE</span> to confirm
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="REMOVE"
              className="input mt-1"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => resolve("block")}
              disabled={!canConfirmBlock || busy}
              className="btn-primary bg-rose-600 disabled:opacity-50"
            >
              {busy ? "Removing…" : "Remove face enrolment"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmBlock(false);
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