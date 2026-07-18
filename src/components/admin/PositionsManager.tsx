"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Position {
  id: number;
  title: string;
  description: string | null;
  order: number;
  _count: { aspirants: number };
}

export function PositionsManager({ positions }: { positions: Position[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Position | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not add.");
      return;
    }
    setTitle("");
    setDescription("");
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/positions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        title: editing.title,
        description: editing.description,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not update.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: number) {
    if (!confirm("Delete this position and all its aspirants?")) return;
    setBusy(true);
    await fetch("/api/admin/positions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {error && (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {positions.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">
            No positions yet. Add the first one.
          </div>
        )}
        {positions.map((p) => (
          <div key={p.id} className="card flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold text-ink">{p.title}</p>
              <p className="text-xs text-slate-500">
                {p.description || "No description"} · {p._count.aspirants} aspirant
                {p._count.aspirants === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-outline"
                onClick={() => setEditing(p)}
                disabled={busy}
              >
                Edit
              </button>
              <button
                className="btn-outline text-rose-600"
                onClick={() => remove(p.id)}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card h-fit p-5">
        {editing ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <p className="font-semibold text-ink">Edit position</p>
            <input
              className="input"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <textarea
              className="input"
              rows={3}
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <button className="btn-primary" disabled={busy}>
                Save
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={add} className="space-y-3">
            <p className="font-semibold text-ink">Add position</p>
            <input
              className="input"
              placeholder="e.g. President"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="input"
              rows={3}
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button className="btn-primary w-full" disabled={busy}>
              Add position
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
