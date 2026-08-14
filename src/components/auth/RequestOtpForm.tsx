"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidMatNumber, MAT_NUMBER_HINT } from "@/lib/constants";

export function RequestOtpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matNumber, setMat] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDevOtp(null);
    if (!isValidMatNumber(matNumber)) {
      setError(`Invalid matriculation number. Use the format ${MAT_NUMBER_HINT}.`);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send code.");
        setLoading(false);
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      router.push(
        `/verify-otp?mat=${encodeURIComponent(data.matNumber)}&email=${encodeURIComponent(
          data.email
        )}${data.devOtp ? `&dev=${data.devOtp}` : ""}`
      );
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {devOtp && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dev mode: email is not configured, so your OTP is{" "}
          <span className="font-bold tracking-widest">{devOtp}</span>. Set SMTP_* in{" "}
          <code>.env</code> to deliver real emails.
        </div>
      )}
      <div>
        <label className="label">Matriculation number</label>
          <input
            className="input"
            value={matNumber}
            onChange={(e) => setMat(e.target.value)}
            placeholder={MAT_NUMBER_HINT}
            pattern="UG/\d{2}/\d{4}"
            title={`Matriculation number must match the format ${MAT_NUMBER_HINT}.`}
            required
          />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Sending code…" : "Send verification code"}
      </button>
    </form>
  );
}
