"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const PAGE_SIZE = 25;

interface VoterRow {
  matNumber: string;
  name: string;
  department: string;
  level: string;
  accredited: boolean;
  votesCast: number;
}

export function VotersReportTable({ voters }: { voters: VoterRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageParam = Number(searchParams.get("rp") || "1");
  const totalPages = Math.max(1, Math.ceil(voters.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, pageParam || 1), totalPages);

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return voters;
    return voters.filter(
      (v) =>
        v.matNumber.toLowerCase().includes(query) ||
        v.name.toLowerCase().includes(query) ||
        v.department.toLowerCase().includes(query)
    );
  }, [q, voters]);

  const filteredPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, filteredPages);
  const rows = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  function gotoPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("rp");
    else params.set("rp", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            gotoPage(1);
          }}
          placeholder="Search mat number, name or department…"
          className="input max-w-sm"
        />
        <span className="text-sm text-slate-500">
          {filtered.length} voter{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Mat number</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Accredited</th>
              <th className="px-4 py-3">Votes cast</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No voters match your search.
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.matNumber} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-slate-700">{v.matNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{v.name}</td>
                  <td className="px-4 py-3 text-slate-600">{v.department}</td>
                  <td className="px-4 py-3 text-slate-600">{v.level}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${v.accredited ? "badge-green" : "badge-amber"}`}>
                      {v.accredited ? "Accredited" : "Not accredited"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{v.votesCast}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => gotoPage(activePage - 1)}
            disabled={activePage <= 1}
            className="btn-outline disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {activePage} of {filteredPages}
          </span>
          <button
            type="button"
            onClick={() => gotoPage(activePage + 1)}
            disabled={activePage >= filteredPages}
            className="btn-outline disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
