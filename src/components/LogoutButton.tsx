"use client";

import Link from "next/link";
import { useState } from "react";
import { Toast } from "./Toast";

export function LogoutButton({
  href,
  className = "btn-ghost",
  label = "Sign out",
  full = false,
}: {
  href: string;
  className?: string;
  label?: string;
  full?: boolean;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(href, { method: "POST" });
    } catch {
      // ignore network errors; we still redirect
    }
    setToast("You have been signed out.");
    // Full page load so the server-rendered navbar resets to the logged-out
    // state (a soft router.push would keep the cached "My Profile" links).
    setTimeout(() => {
      window.location.assign("/");
    }, 700);
  }

  return (
    <>
      <button
        type="button"
        onClick={doLogout}
        disabled={busy}
        className={full ? `${className} w-full` : className}
      >
        {label}
      </button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

// Convenience link-style wrapper for places that used <Link href=".../logout">.
export function LogoutLink({
  href,
  className = "btn-ghost",
  label = "Sign out",
  full = false,
  onNavigate,
}: {
  href: string;
  className?: string;
  label?: string;
  full?: boolean;
  onNavigate?: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doLogout() {
    if (busy) return;
    setBusy(true);
    onNavigate?.();
    try {
      await fetch(href, { method: "POST" });
    } catch {
      // ignore
    }
    setToast("You have been signed out.");
    // Full page load so the server-rendered navbar resets to the logged-out
    // state (a soft router.push would keep the cached "My Profile" links).
    setTimeout(() => {
      window.location.assign("/");
    }, 700);
  }

  return (
    <>
      <button
        type="button"
        onClick={doLogout}
        disabled={busy}
        className={full ? `${className} w-full` : className}
      >
        {label}
      </button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
