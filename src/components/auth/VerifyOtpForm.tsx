"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FaceCapture } from "./FaceCapture";
import { Toast } from "@/components/Toast";

function VerifyOtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const matNumber = params.get("mat") || "";
  const dev = params.get("dev");
  const isNew = params.get("new") === "1";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [faceTemplate, setFaceTemplate] = useState<number[] | null>(null);

  // The dev code is only put on the URL by the dev flow. Never render it on
  // a non-local hostname (defense in depth against a forged ?dev= param).
  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const showDevOtp = dev && isLocalHost;

  useEffect(() => {
    fetch("/api/public/content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFaceEnabled(Boolean(d?.faceRecognition)))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (faceEnabled && !faceTemplate) {
      setError("Face verification is required. Please allow the camera and capture your face.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matNumber,
          code,
          faceTemplate: faceEnabled ? faceTemplate : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setLoading(false);
        return;
      }
      setToast("Signed in successfully.");
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 700);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {showDevOtp && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dev mode: your verification code is{" "}
          <span className="font-bold tracking-widest">{dev}</span>. Set SMTP_* in{" "}
          <code>.env</code> to deliver real emails.
        </div>
      )}
      <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
        {isNew
          ? "Account created! Enter the 6-digit code we sent to your email to finish signing in."
          : "Enter the 6-digit code we just sent to your email."}
      </div>
      <div>
        <label className="label">Matriculation number</label>
        <input className="input bg-slate-50" value={matNumber} readOnly />
      </div>
      <div>
        <label className="label">Verification code</label>
        <input
          className="input tracking-[0.5em] text-center text-lg"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="••••••"
          required
        />
      </div>
      {faceEnabled && (
        <FaceCapture
          label="Face verification (required)"
          onCapture={(r) => setFaceTemplate(r ? r.descriptor : null)}
        />
      )}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Verifying…" : "Verify & sign in"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Code expires in 5 minutes.
      </p>
      </form>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

export function VerifyOtpForm() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <VerifyOtpInner />
    </Suspense>
  );
}
