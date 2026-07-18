"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogoutLink } from "./LogoutButton";

export function MobileNav({ voter, admin }: { voter: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const panel = open && mounted && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[100] sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 flex max-h-[85vh] flex-col overflow-y-auto border-b border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <p className="text-sm font-semibold text-ink">Menu</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="btn-ghost px-2 py-1"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              <Link
                href="/positions"
                onClick={close}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              >
                Aspirants
              </Link>
              <Link
                href="/executives"
                onClick={close}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              >
                Executives
              </Link>
              <Link
                href="/results"
                onClick={close}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              >
                Results
              </Link>
              <div className="my-2 border-t border-slate-100" />
              {admin ? (
                <Link href="/admin" onClick={close} className="btn-primary w-full">
                  Admin
                </Link>
              ) : voter ? (
                <>
                  <Link href="/profile" onClick={close} className="btn-outline w-full">
                    My Profile
                  </Link>
                  <LogoutLink
                    href="/api/auth/logout"
                    onNavigate={close}
                    className="btn-ghost w-full"
                    label="Sign out"
                  />
                </>
              ) : (
                <>
                  <Link href="/login" onClick={close} className="btn-outline w-full">
                    Sign in
                  </Link>
                  <Link href="/register" onClick={close} className="btn-primary w-full">
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="btn-outline px-3 py-2 sm:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      {panel}
    </>
  );
}
