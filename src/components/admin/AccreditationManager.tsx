"use client";

import { useCallback, useEffect, useState } from "react";

interface Voter {
  id: number;
  matNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  level: string;
  sugReceipt: string;
  sugReceiptUrl: string | null;
  accredited: boolean;
  _count: { votes: number };
}

export function AccreditationManager({
  initialVoters,
  initialTotal,
  initialAccredited,
}: {
  initialVoters: Voter[];
  initialTotal: number;
  initialAccredited: number;
}) {
  const [voters, setVoters] = useState<Voter[]>(initialVoters);
  const [total, setTotal] = useState(initialTotal);
  const [accredited, setAccredited] = useState(initialAccredited);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "accredited" | "pending">("");
  const [busy, setBusy] = useState<number | null>(null);
  const [preview, setPreview] = useState<Voter | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/accreditation?${params.toString()}`);
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    setVoters(data.voters ?? []);
    setTotal(data.total ?? 0);
    setAccredited(data.accredited ?? 0);
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function toggle(v: Voter) {
    setBusy(v.id);
    const res = await fetch("/api/admin/accreditation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: v.id, accredited: !v.accredited }),
    });
    const data = await res.json();
    setBusy(null);
    if (res.ok) {
      const newAccredited = Boolean(data.voter?.accredited);
      setVoters((vs) =>
        vs.map((x) => (x.id === v.id ? { ...x, accredited: newAccredited } : x))
      );
      setAccredited((n) => n + (newAccredited ? 1 : -1));
    }
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <input
          className="input"
          placeholder="Search by name, mat number or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="">All voters</option>
          <option value="accredited">Accredited</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="mb-4 flex gap-6 text-sm">
        <span className="text-slate-500">
          Total registered: <b className="text-ink">{total}</b>
        </span>
        <span className="text-slate-500">
          Accredited: <b className="text-emerald-600">{accredited}</b>
        </span>
        <span className="text-slate-500">
          Pending: <b className="text-amber-600">{total - accredited}</b>
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Voter</th>
              <th className="px-4 py-3">SUG Receipt</th>
              <th className="px-4 py-3">Dept / Level</th>
              <th className="px-4 py-3">Votes</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {voters.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No voters found.
                </td>
              </tr>
            )}
            {voters.map((v) => (
              <tr key={v.id} className={v.accredited ? "bg-emerald-50/40" : ""}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">
                    {v.firstName} {v.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.matNumber} · {v.email}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="badge-slate font-mono">{v.sugReceipt}</span>
                  <div className="mt-1">
                     {v.sugReceiptUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreview(v)}
                        className="text-xs font-medium text-brand-700 underline"
                      >
                        View receipt
                      </button>
                    ) : (
                      <span className="text-xs text-rose-500">No upload</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p className="text-xs">{v.department}</p>
                  <p className="text-xs text-slate-400">{v.level}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{v._count?.votes ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  {v.accredited ? (
                    <span className="mr-2 badge-green">✓ Accredited</span>
                  ) : null}
                  <button
                    className={v.accredited ? "btn-outline text-rose-600" : "btn-primary"}
                    onClick={() => toggle(v)}
                    disabled={busy === v.id}
                  >
                    {v.accredited ? "Revoke" : "Accredit"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Open “View receipt” to inspect the uploaded SUG dues receipt, then Accredit (or
        Revoke). Only accredited voters may cast a ballot.
      </p>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <p className="font-semibold text-ink">SUG Dues Receipt</p>
                <p className="text-xs text-slate-500">
                  Verifying {preview.firstName} {preview.lastName}
                </p>
              </div>
              <button
                className="btn-ghost"
                onClick={() => setPreview(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Matric Number</p>
                <p className="font-mono font-semibold text-ink">{preview.matNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">SUG Receipt No.</p>
                <p className="font-mono font-semibold text-ink">{preview.sugReceipt}</p>
              </div>
            </div>
            <div className="flex items-center justify-center overflow-auto p-4">
              {preview.sugReceiptUrl?.endsWith(".pdf") ? (
                <iframe
                  src={preview.sugReceiptUrl}
                  className="h-[60vh] w-full"
                  title="Receipt"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.sugReceiptUrl || ""}
                  alt="SUG receipt"
                  className="max-h-[60vh] w-auto rounded-lg object-contain"
                />
              )}
            </div>
            <div className="border-t border-slate-200 p-3 text-center">
              <a
                href={preview.sugReceiptUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-700 underline"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
