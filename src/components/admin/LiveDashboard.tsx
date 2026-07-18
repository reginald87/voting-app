"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";

interface Candidate {
  aspirantId: number;
  name: string;
  department: string;
  level: string;
  votes: number;
  photoUrl?: string | null;
}
interface PositionResult {
  positionId: number;
  title: string;
  description: string | null;
  totalVotes: number;
  candidates: Candidate[];
}

export function LiveDashboard() {
  const [positions, setPositions] = useState<PositionResult[]>([]);
  const [connected, setConnected] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  // All-time peak vote count seen this session — locks the chart scale so bars
  // only ever grow and never rescale as the leader gains votes.
  const peakRef = useRef(1);

  useEffect(() => {
    const es = new EventSource("/api/admin/live");
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "results") {
          let peak = peakRef.current;
          for (const p of data.results) {
            for (const c of p.candidates) {
              if (c.votes > peak) peak = c.votes;
            }
          }
          peakRef.current = peak;
          setPositions(data.results);
          setUpdatedAt(data.at);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const totalAll = positions.reduce((s, p) => s + p.totalVotes, 0);
  const CHART_H = 200;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="text-slate-500">
            {connected ? "Live — updates every 2s" : "Disconnected"}
          </span>
        </div>
        <div className="text-sm text-slate-500">
          Total votes cast: <b className="text-ink">{totalAll}</b>
          {updatedAt && (
            <span className="ml-2 text-xs text-slate-400">
              · {new Date(updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No positions published yet.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {positions.map((p) => {
            // Scale against the session peak, not the current leader, so the
            // chart only grows upward as votes arrive (no reshuffling/rescaling).
            const max = Math.max(peakRef.current, ...p.candidates.map((c) => c.votes));
            return (
              <div key={p.positionId} className="card min-w-0 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-ink">{p.title}</h3>
                  <span className="badge-slate">{p.totalVotes} votes</span>
                </div>

                {p.candidates.length === 0 ? (
                  <p className="text-sm text-slate-400">No aspirants.</p>
                ) : (
                  <div className="pb-2">
                    <div className="flex min-w-0 items-end justify-center gap-2 sm:gap-3">
                      {p.candidates.map((c) => {
                        const hPct = Math.round((c.votes / max) * 100);
                        const share = p.totalVotes
                          ? Math.round((c.votes / p.totalVotes) * 100)
                          : 0;
                        const isLeader = c.votes === max && p.totalVotes > 0;
                        return (
                          <div
                            key={c.aspirantId}
                            className="flex min-w-0 flex-1 flex-col items-center"
                          >
                            <Avatar
                              first={c.name.split(" ")[0]}
                              last={c.name.split(" ")[1] || ""}
                              src={c.photoUrl}
                              size={44}
                              className="mb-2 ring-2 ring-white"
                            />
                            <div
                              className="relative flex w-full max-w-[72px] items-end justify-center"
                              style={{ height: CHART_H }}
                            >
                              <div
                                className={`w-full rounded-t-lg bg-gradient-to-t ${
                                  isLeader
                                    ? "from-emerald-500 to-emerald-400"
                                    : "from-brand-600 to-brand-400"
                                } transition-all duration-500`}
                                style={{ height: `${hPct}%` }}
                              >
                                <span className="absolute -top-5 left-1/2 z-10 -translate-x-1/2 rounded bg-white/90 px-1 text-xs font-bold text-ink">
                                  {c.votes}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 w-full truncate text-center text-xs font-semibold text-ink">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-400">{share}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
