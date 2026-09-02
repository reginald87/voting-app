"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/Toast";

interface Accreditor {
  id: number;
  email: string;
  name: string;
  active: boolean;
  createdAt: string | Date;
}

export function AccreditorManager({
  initialAccreditors,
}: {
  initialAccreditors: Accreditor[];
}) {
  const [accreditors, setAccreditors] = useState<Accreditor[]>(initialAccreditors);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<number | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/accreditors");
    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }
    const data = await res.json();
    setAccreditors(data.accreditors ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError(null);
    try {
      const res = await fetch("/api/admin/accreditors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create accreditor.");
        setBusy(null);
        return;
      }
      setToast("Accreditor created successfully.");
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setBusy(null);
      load();
    } catch {
      setError("Network error.");
      setBusy(null);
    }
  }

  async function toggle(id: number, active: boolean) {
    setBusy(id);
    const res = await fetch(`/api/admin/accreditors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      setToast(active ? "Accreditor activated." : "Accreditor deactivated.");
      load();
    }
    setBusy(null);
  }

  async function remove(id: number) {
    setBusy(id);
    const res = await fetch(`/api/admin/accreditors/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setToast("Accreditor deleted.");
      setConfirmDelete(null);
      load();
    }
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {accreditors.length} accreditor(s)
        </p>
        <button
          className="btn-primary"
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
          }}
        >
          {showForm ? "Cancel" : "New Accreditor"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 p-6">
          <h2 className="text-lg font-semibold text-ink">Create Accreditor</h2>
          {error && (
            <div className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}
          <form onSubmit={create} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="max-w-sm">
              <label className="label">Password (min 6 chars)</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={busy === "create"}>
              {busy === "create" ? "Creating…" : "Create Accreditor"}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accreditors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No accreditors yet. Create one to get started.
                </td>
              </tr>
            )}
            {accreditors.map((a) => (
              <tr key={a.id} className={!a.active ? "bg-slate-50/60" : ""}>
                <td className="px-4 py-3 font-medium text-ink">{a.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.email}</td>
                <td className="px-4 py-3">
                  {a.active ? (
                    <span className="badge-green">Active</span>
                  ) : (
                    <span className="badge-red">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className={a.active ? "btn-outline text-amber-600" : "btn-outline text-emerald-600"}
                      disabled={busy === a.id}
                      onClick={() => toggle(a.id, !a.active)}
                    >
                      {a.active ? "Deactivate" : "Activate"}
                    </button>
                    {confirmDelete === a.id ? (
                      <>
                        <button
                          className="btn-outline text-rose-600"
                          disabled={busy === a.id}
                          onClick={() => remove(a.id)}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-ghost text-rose-600"
                        onClick={() => setConfirmDelete(a.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
