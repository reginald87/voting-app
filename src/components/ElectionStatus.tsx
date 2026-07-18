"use client";

import { useEffect, useState } from "react";

interface Period {
  key: string;
  label: string;
  open: boolean;
  reason?: string;
  start?: string | null;
  end?: string | null;
}

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function useCountdown(target?: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target || now === null) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  parts.push(`${String(h).padStart(2, "0")}h`);
  parts.push(`${String(m).padStart(2, "0")}m`);
  parts.push(`${String(s).padStart(2, "0")}s`);
  return parts.join(" ");
}

function PeriodRow({ p, compact }: { p: Period; compact?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const opensIn = useCountdown(p.open ? null : p.start);
  const closesIn = useCountdown(p.open ? p.end : null);

  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        {p.open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            p.open ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-ink">
          {p.label}
        </p>
        {!compact && !p.open && p.reason && (
          <p className="truncate text-xs text-slate-500">{p.reason}</p>
        )}
        {mounted && p.open && p.end && (
          <p className="text-[11px] text-slate-400">Closes {fmt(new Date(p.end))}</p>
        )}
      </div>

      <div className="shrink-0 text-right text-xs font-semibold tabular-nums">
        {mounted && !p.open && opensIn && (
          <span className="text-brand-700">{opensIn}</span>
        )}
        {mounted && p.open && closesIn && (
          <span className="text-accent-600">{closesIn}</span>
        )}
        {mounted && !p.open && !opensIn && p.start && (
          <span className="text-slate-400">{fmt(new Date(p.start))}</span>
        )}
        {mounted && !p.open && !opensIn && !p.start && (
          <span className="text-slate-400">Closed</span>
        )}
      </div>
    </div>
  );
}

export function ElectionStatus({ periods }: { periods: Period[] }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || dismissed) return null;

  const openCount = periods.filter((p) => p.open).length;
  const summary = openCount > 0 ? `${openCount} open` : "Closed";

  return (
    <>
      {/* Desktop: open floating card pinned bottom-right */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 hidden sm:block">
        <div className="pointer-events-auto w-80 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Election
              </span>
              <span className={`badge ${openCount > 0 ? "badge-green" : "badge-red"} !px-2 !py-0.5 !text-[10px]`}>
                {summary}
              </span>
            </div>
            <button
              type="button"
              aria-label="Hide election timer"
              onClick={() => setDismissed(true)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {periods.map((p) => (
              <PeriodRow key={p.key} p={p} />
            ))}
          </div>
        </div>
      </div>

       {/* Mobile: compact launcher button bottom-right, opens a drawer */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 sm:hidden">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex flex-col items-end gap-0.5 rounded-full border border-white/40 bg-white/85 px-4 py-2.5 text-left shadow-2xl shadow-slate-900/15 backdrop-blur-xl"
            aria-label="Open election status"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="relative flex h-2.5 w-2.5">
                {openCount > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    openCount > 0 ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </span>
              Election · {summary}
            </span>
            {mounted && openCount === 0 && (
              <span className="max-w-[11rem] truncate text-[11px] font-normal text-slate-500">
                {periods.find((p) => p.reason)?.reason ?? "All periods closed"}
              </span>
            )}
          </button>
        )}

        {open && (
          <div className="pointer-events-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/40 bg-white/90 p-4 shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Election
                </span>
                <span className={`badge ${openCount > 0 ? "badge-green" : "badge-red"} !px-2 !py-0.5 !text-[10px]`}>
                  {summary}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Hide permanently"
                  onClick={() => {
                    setOpen(false);
                    setDismissed(true);
                  }}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {periods.map((p) => (
                <PeriodRow key={p.key} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
