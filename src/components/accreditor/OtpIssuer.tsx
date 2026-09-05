"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface VoterRow {
  id: number;
  firstName: string;
  lastName: string;
  matNumber: string;
  department: string;
  level: string;
}

export function OtpIssuer({ loginUrl }: { loginUrl?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [voters, setVoters] = useState<VoterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const [codeModal, setCodeModal] = useState<{
    name: string;
    matNumber: string;
    code: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
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
        router.push(loginUrl || "/accreditor/login");
        return;
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Failed to load voters.");
      setVoters(data.voters ?? []);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load voters.");
    } finally {
      setLoading(false);
    }
  }, [router, loginUrl]);

  const doSearch = () => {
    stateRef.current = { q, page: 1 };
    load();
  };

  const goPage = (p: number) => {
    stateRef.current = { q, page: p };
    load();
  };

  const issue = async (v: VoterRow) => {
    setIssuingId(v.id);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: v.id, matNumber: v.matNumber }),
      });
      if (res.status === 401) {
        router.push(loginUrl || "/accreditor/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not issue a code.");
      setCodeModal({
        name: data.name,
        matNumber: data.matNumber,
        code: data.code,
        expiresAt: data.expiresAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue verification code.");
    } finally {
      setIssuingId(null);
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
            if (e.key === "Enter") doSearch();
          }}
        />
        <button type="button" className="btn-primary" onClick={doSearch}>
          Search
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Voter</th>
                <th className="px-4 py-3">Mat number</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {voters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    {loading ? "Loading…" : "No voters found."}
                  </td>
                </tr>
              ) : (
                voters.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-ink">
                      {v.firstName} {v.lastName}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{v.matNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{v.department}</td>
                    <td className="px-4 py-3 text-slate-600">{v.level}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="btn-outline whitespace-nowrap"
                        disabled={issuingId === v.id}
                        onClick={() => issue(v)}
                      >
                        {issuingId === v.id ? "Issuing…" : "Issue code"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && !loading && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="btn-outline"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-outline"
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {codeModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCodeModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">One-time verification code</h3>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCodeModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Relay this code to{" "}
              <span className="font-semibold text-ink">
                {codeModal.name} ({codeModal.matNumber})
              </span>{" "}
              by phone or WhatsApp. The voter enters it with their mat number at login —
              no email needed. Any earlier unused code for this voter is now invalid.
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="font-mono text-3xl font-bold tracking-widest text-ink">
                {codeModal.code}
              </span>
              <button
                type="button"
                className="btn-outline whitespace-nowrap"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(codeModal.code);
                    setCopied(true);
                  } catch {
                    setError("Could not copy the code.");
                  }
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Expires at {new Date(codeModal.expiresAt).toLocaleTimeString()}.
              The code is usable even if the voter&apos;s email inbox is unreachable.
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" className="btn-primary" onClick={() => setCodeModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}