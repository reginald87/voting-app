"use client";

import { useState, useCallback } from "react";
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
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/voters?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Failed to load voters.");
      setVoters(data.voters);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load voters.");
    } finally {
      setLoading(false);
    }
  }, [q, router]);

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
            if (e.key === "Enter") load();
          }}
        />
        <button type="button" className="btn-primary" onClick={load} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
        {loaded && (
          <button type="button" className="btn-outline" onClick={() => { setQ(""); }} >
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
                      {v.accredited ? "Accredited" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-ghost px-3 py-1.5 text-xs"
                        disabled={busyId === v.id}
                        onClick={() => toggleAccredit(v)}
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
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            Showing up to 200 matches. Use search to narrow results.
          </p>
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

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
