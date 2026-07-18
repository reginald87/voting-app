"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";
import { FaceCapture } from "./FaceCapture";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [faceTemplate, setFaceTemplate] = useState<number[] | null>(null);
  const [form, setForm] = useState({
    matNumber: "",
    email: "",
    firstName: "",
    lastName: "",
    department: DEPARTMENTS[0],
    level: LEVELS[0],
    sugReceipt: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

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

    const data = new FormData();
    data.set("matNumber", form.matNumber);
    data.set("email", form.email);
    data.set("firstName", form.firstName);
    data.set("lastName", form.lastName);
    data.set("department", form.department);
    data.set("level", form.level);
    data.set("sugReceipt", form.sugReceipt);
    const fileInput = (document.getElementById("receipt") as HTMLInputElement)?.files?.[0];
    if (!fileInput) {
      setError("Please upload your SUG dues receipt.");
      setLoading(false);
      return;
    }
    data.set("receipt", fileInput);
    if (faceEnabled) {
      if (!faceTemplate) {
        setError("Face enrollment is required. Please allow the camera and capture your face.");
        setLoading(false);
        return;
      }
      data.set("faceTemplate", JSON.stringify(faceTemplate));
    }

    try {
      const res = await fetch("/api/auth/register", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Registration failed.");
        setLoading(false);
        return;
      }
      router.push(
        `/verify-otp?mat=${encodeURIComponent(result.matNumber)}&email=${encodeURIComponent(
          result.email
        )}${result.devOtp ? `&dev=${result.devOtp}` : ""}&new=1`
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name</label>
          <input
            className="input"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Last name</label>
          <input
            className="input"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Matriculation number</label>
        <input
          className="input"
          value={form.matNumber}
          onChange={(e) => set("matNumber", e.target.value)}
          placeholder="e.g. BMU/2021/001"
          required
        />
      </div>

      <div>
        <label className="label">Email address</label>
        <input
          type="email"
          className="input"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@student.bmu.edu.ng"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Department</label>
          <select
            className="input"
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Level</label>
          <select
            className="input"
            value={form.level}
            onChange={(e) => set("level", e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">SUG dues receipt number</label>
        <input
          className="input"
          value={form.sugReceipt}
          onChange={(e) => set("sugReceipt", e.target.value)}
          placeholder="e.g. SUG-2025-0098"
          required
        />
      </div>

      <div>
        <label className="label">Upload SUG dues receipt</label>
        <input
          id="receipt"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
          className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
          required
        />
        {fileName && (
          <p className="mt-1 text-xs text-slate-500">Selected: {fileName}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          PNG, JPG, WEBP or PDF, max 5MB. This receipt is verified during accreditation.
        </p>
      </div>

      {faceEnabled && (
        <FaceCapture
          label="Face enrollment (required)"
          onCapture={(r) => setFaceTemplate(r ? r.descriptor : null)}
        />
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account & get code"}
      </button>
    </form>
  );
}
