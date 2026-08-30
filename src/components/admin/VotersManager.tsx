"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

interface VoterRow {
  id: number;
  firstName: string;
  lastName: string;
  matNumber: string;
  email: string;
  department: string;
  level: string;
  accredited: boolean;
  faceEnrolled: boolean;
  createdAt: string;
  voteCount: number;
}

export function VotersManager() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VoterRow | null>(null);
  const [preview, setPreview] = useState<VoterRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const stateRef = useRef({ q: "", page: 1 });

  const load = useCallback(async () => {
    const { q: qq, page: p } = stateRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/voters?q=${encodeURIComponent(qq)}&page=${p}`,
        { cache: "no-store" }
      );
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Failed to load voters.");
      setVoters(data.voters);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load voters.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const search = () => {
    stateRef.current = { q, page: 1 };
    load();
  };

  const toggleAccredit = async (v: VoterRow) => {
    setBusyId(v.id);
    try {
      const res = await fetch("/api/admin/voters/accredit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: v.id, accredited: !v.accredited }),
      });
      if (!res.ok) throw new Error("Failed to update accreditation.");
      setVoters((list) =>
        list.map((x) => (x.id === v.id ? { ...x, accredited: !x.accredited } : x))
      );
      setToast(`${v.firstName} ${v.lastName} ${!v.accredited ? "accredited" : "unaccredited"}.`);
    } catch {
      setError("Could not update accreditation.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const v = pendingDelete;
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/admin/voters?id=${v.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete voter.");
      setVoters((list) => list.filter((x) => x.id !== v.id));
      setToast(`Removed ${v.firstName} ${v.lastName}.`);
      setPendingDelete(null);
    } catch {
      setError("Could not delete voter.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input flex-1"
          placeholder="Search by name, mat number or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
        />
        <button type="button" className="btn-primary" onClick={search} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
        {loaded && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setQ("");
              stateRef.current = { q: "", page: 1 };
              load();
            }}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {!loaded && (
        <button
          type="button"
          className="btn-outline mt-6"
          onClick={load}
          disabled={loading}
        >
          Load voters
        </button>
      )}

      {loaded && voters.length === 0 && (
        <div className="card mt-6 p-10 text-center text-slate-500">
          No voters found.
        </div>
      )}

      {loaded && voters.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mat. No.</th>
                <th className="px-4 py-3">Dept / Level</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {voters.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-ink">
                    {v.firstName} {v.lastName}
                    {v.faceEnrolled && (
                      <span className="badge-slate ml-2">face</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.matNumber}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.department}
                    <br />
                    <span className="text-xs text-slate-400">{v.level}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${v.accredited ? "badge-green" : "badge-amber"}`}>
                      {v.accredited ? "Accredited" : "Not accredited"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`/admin/voter-activity?mat=${encodeURIComponent(v.matNumber)}`}
                        className="btn-ghost px-3 py-1.5 text-xs"
                      >
                        Activity
                      </a>
                       <button
                         type="button"
                         className="btn-ghost px-3 py-1.5 text-xs"
                         disabled={busyId === v.id}
                         onClick={() => setPreview(v)}
                       >
                         {v.accredited ? "Revoke" : "Accredit"}
                       </button>
                      <button
                        type="button"
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        disabled={busyId === v.id}
                        onClick={() => setPendingDelete(v)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">
              {total === 0
                ? "No voters found."
                : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-outline px-3 py-1.5 text-xs"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  stateRef.current = { ...stateRef.current, page: p };
                  load();
                }}
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-outline px-3 py-1.5 text-xs"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const p = Math.min(totalPages, page + 1);
                  stateRef.current = { ...stateRef.current, page: p };
                  load();
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-ink">Delete voter?</h3>
            <p className="mt-2 text-sm text-slate-600">
              You are about to permanently remove{" "}
              <span className="font-semibold">
                {pendingDelete.firstName} {pendingDelete.lastName}
              </span>{" "}
              ({pendingDelete.matNumber}).
            </p>
            {pendingDelete.voteCount > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ⚠️ This voter has cast <strong>{pendingDelete.voteCount}</strong> vote
                {pendingDelete.voteCount === 1 ? "" : "s"}. Deleting will also remove those
                ballots permanently.
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                disabled={busyId === pendingDelete.id}
                onClick={confirmDelete}
              >
                {busyId === pendingDelete.id ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">
                {preview.accredited ? "Revoke accreditation?" : "Accredit voter?"}
              </h3>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPreview(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-ink">
                {preview.firstName} {preview.lastName}
              </p>
              <p className="text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Mat. No. </span>
                <span className="font-mono">{preview.matNumber}</span>
              </p>
              <p className="text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Email </span>
                {preview.email}
              </p>
              <p className="text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Dept / Level </span>
                {preview.department} · {preview.level}
              </p>
              <p className="text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Status </span>
                <span className={`badge ${preview.accredited ? "badge-green" : "badge-amber"}`}>
                  {preview.accredited ? "Accredited" : "Not accredited"}
                </span>
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setPreview(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={preview.accredited ? "btn-outline text-rose-600" : "btn-primary"}
                disabled={busyId === preview.id}
                onClick={() => {
                  toggleAccredit(preview);
                  setPreview(null);
                }}
              >
                {busyId === preview.id
                  ? "Working…"
                  : preview.accredited
                  ? "Revoke"
                  : "Accredit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
