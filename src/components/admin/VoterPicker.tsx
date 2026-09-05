"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PickerVoter {
  id: number;
  firstName: string;
  lastName: string;
  matNumber: string;
  department: string;
  level: string;
  voteCount: number;
}

const PAGE_SIZE = 20;

export function VoterPicker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [voters, setVoters] = useState<PickerVoter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setVoters(data.voters ?? []);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load voters.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const toggle = () => {
    if (!open) {
      stateRef.current = { q, page: 1 };
      load();
    }
    setOpen(!open);
  };

  const doSearch = () => {
    stateRef.current = { q, page: 1 };
    setPage(1);
    load();
  };

  const goPage = (p: number) => {
    stateRef.current = { q, page: p };
    load();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div>
      <button type="button" className="btn-primary" onClick={toggle}>
        {open ? "Hide voters" : "Load voters"}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="input flex-1"
              placeholder="Filter by name, mat number or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSearch();
              }}
            />
            <button type="button" className="btn-outline" onClick={doSearch}>
              Filter
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading voters…</p>
          ) : voters.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No voters found.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {voters.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left transition hover:bg-slate-50"
                    onClick={() =>
                      router.push(
                        `/admin/voter-activity?mat=${encodeURIComponent(v.matNumber)}`
                      )
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {v.firstName} {v.lastName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {v.matNumber} · {v.department} · {v.level}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {v.voteCount} vote{v.voteCount === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {total > PAGE_SIZE && !loading && (
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
        </div>
      )}
    </div>
  );
}