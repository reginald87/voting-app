"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Toast } from "@/components/Toast";
import { FaceCapture } from "@/components/auth/FaceCapture";

interface Aspirant {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  level: string;
  photoUrl?: string | null;
}
interface Position {
  id: number;
  title: string;
  description: string | null;
  aspirants: Aspirant[];
}
interface VotedEntry {
  positionId: number;
  candidate: string;
}

export function Ballot({
  positions,
  voted,
  accredited,
  statusOpen,
  statusReason,
  faceEnabled,
  faceEnrolled,
}: {
  positions: Position[];
  voted: VotedEntry[];
  accredited: boolean;
  statusOpen: boolean;
  statusReason?: string | null;
  faceEnabled: boolean;
  faceEnrolled: boolean;
}) {
  const votedMap = new Map(voted.map((v) => [v.positionId, v.candidate]));
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [faceTemplate, setFaceTemplate] = useState<number[] | null>(null);
  const [faceImage, setFaceImage] = useState<string | undefined>(undefined);
  const [faceError, setFaceError] = useState<string | null>(null);

  async function cast(positionId: number, aspirantId?: number) {
    if (faceEnabled && !faceTemplate) {
      setFaceError("You must verify your face before casting a vote.");
      return;
    }
    setBusy(positionId);
    setError(null);
    setFaceError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          aspirantId
            ? { positionId, aspirantId, faceTemplate: faceTemplate ?? undefined, faceImage: faceImage ?? undefined }
            : { positionId, abstain: true, faceTemplate: faceTemplate ?? undefined, faceImage: faceImage ?? undefined }
        ),
      });
      const data = await res.json();
      if (res.ok) {
        setDone((d) => ({
          ...d,
          [positionId]: data.abstained ? "Abstained" : data.candidate,
        }));
        if (data.completed) {
          setToast("You have voted in every position. You are now signed out.");
          setSessionFinished(true);
          return;
        }
        setToast(
          data.abstained
            ? "Your abstention was recorded."
            : `Vote for ${data.candidate} recorded.`
        );
      } else {
        setError(data.error || "Vote could not be recorded.");
        if (data.alreadyVoted) {
          setDone((d) => ({ ...d, [positionId]: data.error }));
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (sessionFinished) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          ✓
        </div>
        <h2 className="text-lg font-bold text-ink">Thank you for voting</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          You have voted in every position. Your ballot has been securely recorded
          and you have been signed out. You may keep this page open or close the
          browser.
        </p>
        <Link href="/" className="btn-primary mt-5">
          Back to home
        </Link>
      </div>
    );
  }

  if (!accredited || !statusOpen) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          !
        </div>
        <h2 className="text-lg font-semibold text-ink">Voting is unavailable</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          {!accredited
            ? "Your account is awaiting accreditation by the electoral commission. You will be able to vote once accredited."
            : statusReason || "Voting is currently closed."}
        </p>
        <Link href="/profile" className="btn-outline mt-5">
          Back to profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {faceEnabled && !faceEnrolled && (
        <div className="card p-6 border-amber-200">
          <h2 className="text-lg font-semibold text-ink">Face verification required</h2>
          <p className="mt-2 text-sm text-slate-600">
            You have not enrolled a face yet. You must complete face verification before
            you can vote. Please contact the electoral commission.
          </p>
        </div>
      )}
      {faceEnabled && faceEnrolled && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Verify your identity</h2>
          <p className="mt-1 text-sm text-slate-600">
            Show your face to verify before casting your vote. Your face is matched to
            your enrolled template and recorded as proof alongside each vote.
          </p>
          {faceError && (
            <div className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {faceError}
            </div>
          )}
          <div className="mt-4">
            <FaceCapture
              label="Live face verification (required to vote)"
              onCapture={(result) => {
                setFaceTemplate(result ? result.descriptor : null);
                setFaceImage(result?.image);
                setFaceError(null);
              }}
            />
          </div>
          {!faceTemplate && (
            <p className="mt-3 text-sm font-medium text-amber-600">
              A verified face is required before you can cast a vote.
            </p>
          )}
        </div>
      )}
      {positions.map((pos) => {
        const already = votedMap.get(pos.id);
        const locked = already || done[pos.id];
        const chosen = selected[pos.id];

        return (
          <section key={pos.id} className="card p-6">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{pos.title}</h2>
                {pos.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{pos.description}</p>
                )}
              </div>
              {locked ? (
                <span className="badge-green whitespace-nowrap">✓ Voted</span>
              ) : (
                <span className="badge-slate whitespace-nowrap">Not voted</span>
              )}
            </div>

            {locked ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                You have cast your vote in this category
                {already ? ` for ${already}` : done[pos.id] ? ` for ${done[pos.id]}` : ""}.
                You cannot vote again in this category.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pos.aspirants.map((a) => {
                    const active = chosen === a.id;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() =>
                          setSelected((s) => ({ ...s, [pos.id]: a.id }))
                        }
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                          active
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                            : "border-slate-200 hover:border-brand-300"
                        }`}
                      >
                        <Avatar first={a.firstName} last={a.lastName} src={a.photoUrl} size={48} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {a.firstName} {a.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-500">{a.department}</p>
                          <p className="text-xs text-slate-400">{a.level}</p>
                        </div>
                        <span
                          className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full border ${
                            active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                          }`}
                        >
                          {active ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => cast(pos.id, chosen)}
                    disabled={!chosen || busy === pos.id || (faceEnabled && !faceTemplate)}
                    className="btn-primary"
                  >
                    {busy === pos.id ? "Submitting…" : "Cast vote"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cast(pos.id)}
                    disabled={busy === pos.id || (faceEnabled && !faceTemplate)}
                    className="btn-outline text-slate-500"
                  >
                    Abstain from this position
                  </button>
                  {!chosen && (
                    <span className="text-xs text-slate-400">
                      Select a candidate or abstain.
                    </span>
                  )}
                </div>
              </>
            )}
          </section>
        );
      })}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
