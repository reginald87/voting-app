"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Election",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/positions", label: "Positions" },
      { href: "/admin/aspirants", label: "Aspirants" },
      { href: "/admin/executives", label: "Executives" },
      { href: "/admin/voters", label: "Voters" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/admin/accreditation", label: "Accreditation" },
      { href: "/admin/settings", label: "Voting Period" },
      { href: "/admin/live", label: "Live Votes" },
      { href: "/admin/ip-audit", label: "IP Audit" },
      { href: "/admin/voter-activity", label: "Voter Activity" },
      { href: "/admin/face-audit", label: "Face Audit" },
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/content", label: "Content & Branding" },
    ],
  },
];

export function AdminNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The login page lives under /admin but must not show the sidebar.
  if (pathname === "/admin/login") return null;

  return (
    <>
      {/* Top bar (mobile / tablet only) */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-sm font-semibold text-ink">SUG Electoral Comm.</span>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="btn-outline px-3 py-2"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
          Menu
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        <AdminNavInner pathname={pathname} onNavigate={() => {}} />
      </aside>

      {/* Mobile/tablet drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-64 max-w-[80vw] overflow-y-auto border-r border-slate-200 bg-white shadow-xl">
            <AdminNavInner
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              onClose={() => setOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}

function AdminNavInner({
  pathname,
  onNavigate,
  onClose,
}: {
  pathname: string;
  onNavigate: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            SUG Electoral Comm.
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink">Admin</p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="btn-ghost px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={onNavigate}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          View site →
        </Link>
        <LogoutButton
          href="/api/admin/logout"
          className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          label="Sign out"
        />
      </div>
    </div>
  );
}
