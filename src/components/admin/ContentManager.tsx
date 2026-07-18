"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Content {
  uniLogoUrl: string | null;
  sugLogoUrl: string | null;
  faviconUrl: string | null;
  deanPhotoUrl: string | null;
  deanName: string | null;
  deanMessage: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroCtaPrimary: string | null;
  heroCtaSecondary: string | null;
  peaceTitle: string | null;
  peaceBody: string | null;
  footerText: string | null;
  faceRecognition: boolean;
}

const IMAGE_FIELDS = [
  { key: "uniLogo", label: "University Logo", current: "uniLogoUrl" },
  { key: "sugLogo", label: "SUG Logo", current: "sugLogoUrl" },
  { key: "favicon", label: "Favicon", current: "faviconUrl" },
  { key: "deanPhoto", label: "Dean Photo", current: "deanPhotoUrl" },
] as const;

export function ContentManager({ content }: { content: Content }) {
  const router = useRouter();
  const [form, setForm] = useState<Content>(content);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Content>(k: K, v: Content[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);

    const fd = new FormData();
    const textKeys: (keyof Content)[] = [
      "deanName",
      "deanMessage",
      "heroTitle",
      "heroSubtitle",
      "heroCtaPrimary",
      "heroCtaSecondary",
      "peaceTitle",
      "peaceBody",
      "footerText",
    ];
    for (const k of textKeys) {
      const v = form[k];
      if (v !== null && v !== undefined) fd.set(k, String(v));
    }
    fd.set("faceRecognition", String(form.faceRecognition));
    for (const f of IMAGE_FIELDS) {
      const file = files[f.key];
      if (file) fd.set(f.key, file);
    }

    const res = await fetch("/api/admin/content", { method: "POST", body: fd });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save.");
      return;
    }
    setMsg("Content updated.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {msg && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>
      )}

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Branding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload the university logo, SUG logo and favicon. Leave blank to keep the current
          one. PNG, JPG, WEBP or ICO, max 2MB.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {IMAGE_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              {(form[f.current as keyof Content] as string | null) && !files[f.key] && (
                <div className="mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form[f.current as keyof Content] as string}
                    alt={f.label}
                    className="h-16 w-16 rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                onChange={(e) => setFiles((s) => ({ ...s, [f.key]: e.target.files?.[0] || null }))}
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Dean of Student Affairs</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Dean name</label>
            <input
              className="input"
              value={form.deanName || ""}
              onChange={(e) => set("deanName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Dean message</label>
            <textarea
              className="input"
              rows={3}
              value={form.deanMessage || ""}
              onChange={(e) => set("deanMessage", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Home page copy</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Hero title</label>
            <input
              className="input"
              value={form.heroTitle || ""}
              onChange={(e) => set("heroTitle", e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">Use \n for a line break.</p>
          </div>
          <div>
            <label className="label">Hero subtitle</label>
            <textarea
              className="input"
              rows={3}
              value={form.heroSubtitle || ""}
              onChange={(e) => set("heroSubtitle", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Primary CTA label</label>
              <input
                className="input"
                value={form.heroCtaPrimary || ""}
                onChange={(e) => set("heroCtaPrimary", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Secondary CTA label</label>
              <input
                className="input"
                value={form.heroCtaSecondary || ""}
                onChange={(e) => set("heroCtaSecondary", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Peace &amp; orderliness title</label>
            <input
              className="input"
              value={form.peaceTitle || ""}
              onChange={(e) => set("peaceTitle", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Peace &amp; orderliness body</label>
            <textarea
              className="input"
              rows={3}
              value={form.peaceBody || ""}
              onChange={(e) => set("peaceBody", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Footer text</label>
            <input
              className="input"
              value={form.footerText || ""}
              onChange={(e) => set("footerText", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <label className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
          <div>
            <p className="font-medium text-ink">Face recognition</p>
            <p className="text-sm text-slate-500">
              Enable optional face-capture at registration and verification (Phase 2 feature).
            </p>
          </div>
          <input
            type="checkbox"
            className="h-6 w-11 cursor-pointer"
            checked={form.faceRecognition}
            onChange={(e) => set("faceRecognition", e.target.checked)}
          />
        </label>
      </section>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Saving…" : "Save content"}
      </button>
    </form>
  );
}
