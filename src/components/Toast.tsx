"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDone: () => void;
  type?: "success" | "info" | "error";
}

export function Toast({ message, onDone, type = "success" }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  const styles =
    type === "error"
      ? "bg-rose-600"
      : type === "info"
        ? "bg-slate-800"
        : "bg-emerald-600";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl ${styles} animate-[toastIn_0.25s_ease-out]`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {message}
      </div>
    </div>
  );
}
