"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";

interface PositionLite {
  id: number;
  title: string;
}
interface Aspirant {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  level: string;
  manifesto: string | null;
  photoUrl: string | null;
  positionId: number;
  position: { title: string };
}

export function AspirantsManager({
  positions,
  aspirants,
}: {
  positions: PositionLite[];
  aspirants: Aspirant[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<number | "all">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Aspirant | null>(null);
  const [form, setForm] = useState({
    positionId: positions[0]?.id ?? 0,
    firstName: "",
    lastName: "",
    department: DEPARTMENTS[0],
    level: LEVELS[0],
    manifesto: "",
  });
  const [file, setFile] = useState<File | null>(null);

  function startEdit(a: Aspirant) {
    setEditing(a);
    setForm({
      positionId: a.positionId,
      firstName: a.firstName,
      lastName: a.lastName,
      department: a.department,
      level: a.level,
      manifesto: a.manifesto || "",
    });
    setFile(null);
    setError(null);
  }

  function reset() {
    setEditing(null);
    setForm({
      positionId: positions[0]?.id ?? 0,
      firstName: "",
      lastName: "",
      department: DEPARTMENTS[0],
      level: LEVELS[0],
      manifesto: "",
    });
    setFile(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (editing) fd.set("id", String(editing.id));
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
    if (file) fd.set("photoUrl", file);

    const url = "/api/admin/aspirants";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save aspirant.");
      return;
    }
    reset();
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this aspirant?")) return;
    setBusy(true);
    await fetch("/api/admin/aspirants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    router.refresh();
  }

  const shown =
    filter === "all" ? aspirants : aspirants.filter((a) => a.positionId === filter);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Filter by position</label>
          <select
            className="input w-auto"
            value={filter === "all" ? "all" : String(filter)}
            onChange={(e) =>
              setFilter(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">All positions</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {shown.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">No aspirants here yet.</div>
        ) : (
          <div className="space-y-3">
            {shown.map((a) => (
              <div key={a.id} className="card flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold text-ink">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.position.title} · {a.department} · {a.level}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-outline" onClick={() => startEdit(a)} disabled={busy}>
                    Edit
                  </button>
                  <button
                    className="btn-outline text-rose-600"
                    onClick={() => remove(a.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card h-fit p-5">
        <p className="font-semibold text-ink">{editing ? "Edit aspirant" : "Add aspirant"}</p>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <select
            className="input"
            value={form.positionId}
            onChange={(e) => setForm({ ...form, positionId: Number(e.target.value) })}
            disabled={positions.length === 0}
          >
            {positions.length === 0 && <option value={0}>No positions</option>}
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <input
            className="input"
            list="dept-list"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="Type or select department"
            required
          />
          <datalist id="dept-list">
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <select
            className="input"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <textarea
            className="input"
            rows={4}
            placeholder="Manifesto"
            value={form.manifesto}
            onChange={(e) => setForm({ ...form, manifesto: e.target.value })}
          />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700"
          />
          {editing && !file && (
            <p className="text-xs text-slate-400">Leave blank to keep the current photo.</p>
          )}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy || positions.length === 0}>
              {editing ? "Save" : "Add"}
            </button>
            {editing && (
              <button type="button" className="btn-outline" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
          {positions.length === 0 && (
            <p className="text-xs text-amber-600">
              Create a position first before adding aspirants.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
