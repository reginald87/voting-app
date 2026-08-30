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

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Keep the selected id valid as positions stream in; reset if it vanishes.
  useEffect(() => {
    if (selectedId !== null && !positions.some((p) => p.positionId === selectedId)) {
      setSelectedId(null);
    }
  }, [positions, selectedId]);

  // Operator can cycle offices with the arrow keys during a projector display.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (positions.length === 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const ordered = [...positions].sort((a, b) => a.positionId - b.positionId);
        const idx = ordered.findIndex((p) => p.positionId === selectedId);
        let next: number;
        if (selectedId === null) {
          next = e.key === "ArrowRight" ? 0 : ordered.length - 1;
        } else {
          const dir = e.key === "ArrowRight" ? 1 : -1;
          next = (idx + dir + ordered.length) % ordered.length;
        }
        setSelectedId(ordered[next].positionId);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [positions, selectedId]);

  const totalAll = positions.reduce((s, p) => s + p.totalVotes, 0);
  const CHART_H = 200;

  const selected = selectedId === null ? null : positions.find((p) => p.positionId === selectedId) || null;

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
        <>
          {/* View switch: All positions, or one office enlarged for a projector */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  selectedId === null
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All
              </button>
              {[...positions]
                .sort((a, b) => a.positionId - b.positionId)
                .map((p) => (
                  <button
                    key={p.positionId}
                    type="button"
                    onClick={() => setSelectedId(p.positionId)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      selectedId === p.positionId
                        ? "bg-brand-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
            </div>

            {selected && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous office"
                  onClick={() => {
                    const ordered = [...positions].sort((a, b) => a.positionId - b.positionId);
                    const i = ordered.findIndex((p) => p.positionId === selectedId);
                    setSelectedId(ordered[(i - 1 + ordered.length) % ordered.length].positionId);
                  }}
                  className="btn-outline px-3 py-1.5"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next office"
                  onClick={() => {
                    const ordered = [...positions].sort((a, b) => a.positionId - b.positionId);
                    const i = ordered.findIndex((p) => p.positionId === selectedId);
                    setSelectedId(ordered[(i + 1) % ordered.length].positionId);
                  }}
                  className="btn-outline px-3 py-1.5"
                >
                  ›
                </button>
                <span className="ml-1 hidden text-xs text-slate-400 sm:inline">
                  Use ← / → keys to cycle
                </span>
              </div>
            )}
          </div>

          {selected ? (
            <SinglePositionView
              p={selected}
              peakRef={peakRef}
              onClose={() => setSelectedId(null)}
              onPrev={() => {
                const ordered = [...positions].sort((a, b) => a.positionId - b.positionId);
                const i = ordered.findIndex((p) => p.positionId === selectedId);
                setSelectedId(ordered[(i - 1 + ordered.length) % ordered.length].positionId);
              }}
              onNext={() => {
                const ordered = [...positions].sort((a, b) => a.positionId - b.positionId);
                const i = ordered.findIndex((p) => p.positionId === selectedId);
                setSelectedId(ordered[(i + 1) % ordered.length].positionId);
              }}
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {positions.map((p) => (
                <PositionCard key={p.positionId} p={p} peakRef={peakRef} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PositionCard({
  p,
  peakRef,
}: {
  p: PositionResult;
  peakRef: React.MutableRefObject<number>;
}) {
  const max = Math.max(peakRef.current, ...p.candidates.map((c) => c.votes));
  return (
    <div className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">{p.title}</h3>
        <span className="badge-slate">{p.totalVotes} votes</span>
      </div>
      <CandidatesChart p={p} max={max} chartH={200} avatar={44} />
    </div>
  );
}

function SinglePositionView({
  p,
  peakRef,
  onClose,
  onPrev,
  onNext,
}: {
  p: PositionResult;
  peakRef: React.MutableRefObject<number>;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const max = Math.max(peakRef.current, ...p.candidates.map((c) => c.votes));
  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-900/95 backdrop-blur">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 text-white sm:px-10">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold sm:text-3xl">{p.title}</h2>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            {p.totalVotes} votes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous office"
            onClick={onPrev}
            className="rounded-lg bg-white/10 px-4 py-2 text-xl font-bold text-white transition hover:bg-white/20"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next office"
            onClick={onNext}
            className="rounded-lg bg-white/10 px-4 py-2 text-xl font-bold text-white transition hover:bg-white/20"
          >
            ›
          </button>
          <button
            type="button"
            aria-label="Close full screen"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Chart fills the remaining viewport height — no page scroll */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-10 sm:px-10">
        {p.candidates.length === 0 ? (
          <p className="text-center text-sm text-slate-300">No aspirants.</p>
        ) : (
          <div className="w-full max-w-5xl">
            <CandidatesChart p={p} max={max} chartH={360} avatar={96} dark />
          </div>
        )}
      </div>
    </div>
  );
}

function CandidatesChart({
  p,
  max,
  chartH,
  avatar,
  dark,
}: {
  p: PositionResult;
  max: number;
  chartH: number;
  avatar: number;
  dark?: boolean;
}) {
  return (
    <div className="pb-2">
      <div className="flex min-w-0 items-end justify-center gap-3 sm:gap-6">
        {p.candidates.map((c) => {
          const hPct = Math.round((c.votes / max) * 100);
          const share = p.totalVotes ? Math.round((c.votes / p.totalVotes) * 100) : 0;
          const isAbstention = c.aspirantId === -1;
          const isLeader = !isAbstention && c.votes === max && p.totalVotes > 0;
          const avatarFirst = isAbstention ? "" : c.name.split(" ")[0];
          const avatarLast = isAbstention ? "—" : c.name.split(" ")[1] || "";
          return (
            <div
              key={c.aspirantId}
              className="flex w-24 min-w-0 flex-1 flex-col items-center sm:w-32"
            >
              <Avatar
                first={avatarFirst}
                last={avatarLast}
                src={c.photoUrl}
                size={avatar}
                className={`mb-3 ring-2 ring-white ${isAbstention ? "opacity-60" : ""}`}
              />
              <div
                className="relative flex w-full max-w-[160px] items-end justify-center"
                style={{ height: chartH }}
              >
                <div
                  className={`w-full rounded-t-lg bg-gradient-to-t ${
                    isAbstention
                      ? "from-slate-400 to-slate-300"
                      : isLeader
                        ? "from-emerald-500 to-emerald-400"
                        : "from-brand-600 to-brand-400"
                  } transition-all duration-500`}
                  style={{ height: `${hPct}%` }}
                >
                  <span
                    className={`absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded px-2 py-0.5 text-sm font-bold shadow-sm ${
                      dark
                        ? "bg-white/90 text-slate-900"
                        : "bg-white/90 text-ink"
                    }`}
                  >
                    {c.votes}
                  </span>
                </div>
              </div>
              <p
                className={`mt-3 w-full break-words text-center text-sm font-semibold leading-tight sm:text-base ${
                  dark ? "text-white" : "text-ink"
                }`}
              >
                {c.name}
              </p>
              <p className={`text-xs sm:text-sm ${dark ? "text-slate-300" : "text-slate-400"}`}>
                {share}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
