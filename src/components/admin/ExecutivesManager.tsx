"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Executive {
  id: number;
  name: string;
  position: string;
  department: string;
  level: string;
  year: string;
  photoUrl: string | null;
}

export function ExecutivesManager({ executives }: { executives: Executive[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Executive | null>(null);
  const [form, setForm] = useState({
    name: "",
    position: "",
    department: "",
    level: "",
    year: "",
  });
  const [file, setFile] = useState<File | null>(null);

  function startEdit(e: Executive) {
    setEditing(e);
    setForm({
      name: e.name,
      position: e.position,
      department: e.department === "—" ? "" : e.department,
      level: e.level === "—" ? "" : e.level,
      year: e.year === "—" ? "" : e.year,
    });
    setFile(null);
    setError(null);
  }

  function reset() {
    setEditing(null);
    setForm({ name: "", position: "", department: "", level: "", year: "" });
    setFile(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (editing) fd.set("id", String(editing.id));
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    if (file) fd.set("photoUrl", file);

    const res = await fetch("/api/admin/executives", {
      method: editing ? "PUT" : "POST",
      body: fd,
    });
    setBusy(false);
    if (!res.ok) {
      const msg = await res.text();
      let reason = "Could not save.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) reason = parsed.error;
      } catch {
        if (msg) reason = msg;
      }
      setError(reason);
      return;
    }
    const data = await res.json().catch(() => ({}));
    reset();
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this executive?")) return;
    setBusy(true);
    const res = await fetch("/api/admin/executives", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (!res.ok) {
      const msg = await res.text();
      let reason = "Could not delete.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) reason = parsed.error;
      } catch {
        if (msg) reason = msg;
      }
      setError(reason);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {executives.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">No executives yet.</div>
        )}
        {executives.map((e) => (
          <div key={e.id} className="card flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              {e.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.photoUrl}
                  alt={e.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                  {(e.name[0] || "").toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-ink">{e.name}</p>
                <p className="text-xs text-slate-500">{e.position}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={() => startEdit(e)} disabled={busy}>
                Edit
              </button>
              <button
                className="btn-outline text-rose-600"
                onClick={() => remove(e.id)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card h-fit p-5">
        <p className="font-semibold text-ink">{editing ? "Edit executive" : "Add executive"}</p>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Position / office"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <input
            className="input"
            placeholder="Level"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          />
          <input
            className="input"
            placeholder="Serving year (e.g. 2024/2025)"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700"
          />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy}>
              {editing ? "Save" : "Add"}
            </button>
            {editing && (
              <button type="button" className="btn-outline" onClick={reset} disabled={busy}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
