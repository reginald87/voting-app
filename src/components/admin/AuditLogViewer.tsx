"use client";

import { useState, useMemo } from "react";

interface AuditEntry {
  id: number;
  actor: string;
  actorName: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string | Date;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  admin_login: { label: "Admin Login", color: "badge-slate" },
  accreditor_login: { label: "Accreditor Login", color: "badge-slate" },
  accreditor_logout: { label: "Accreditor Logout", color: "badge-slate" },
  accredit: { label: "Accredited", color: "badge-green" },
  revoke: { label: "Revoked", color: "badge-red" },
  create_accreditor: { label: "Created Accreditor", color: "badge-green" },
  activate_accreditor: { label: "Activated Accreditor", color: "badge-green" },
  deactivate_accreditor: { label: "Deactivated Accreditor", color: "badge-amber" },
  delete_accreditor: { label: "Deleted Accreditor", color: "badge-red" },
};

function actionBadge(action: string) {
  const info = ACTION_LABELS[action] || { label: action, color: "badge-slate" };
  return <span className={`badge ${info.color}`}>{info.label}</span>;
}

function actorBadge(actor: string) {
  if (actor === "admin") {
    return <span className="badge badge-slate font-semibold">Admin</span>;
  }
  if (actor.startsWith("accreditor:")) {
    return <span className="badge badge-amber">Accreditor</span>;
  }
  return <span className="badge badge-slate">{actor}</span>;
}

export function AuditLogViewer({ initialLogs }: { initialLogs: AuditEntry[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const filtered = useMemo(() => {
    return initialLogs.filter((log) => {
      const matchesSearch =
        !search ||
        log.actorName.toLowerCase().includes(search.toLowerCase()) ||
        log.detail?.toLowerCase().includes(search.toLowerCase()) ||
        log.target?.toLowerCase().includes(search.toLowerCase());
      const matchesAction = !actionFilter || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [initialLogs, search, actionFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by name, voter, or detail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-auto"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No log entries found.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {actorBadge(log.actor)}
                    <span className="font-medium text-ink">{log.actorName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{actionBadge(log.action)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {log.detail || log.target || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {log.ip || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Showing {filtered.length} of {initialLogs.length} entries.
      </p>
    </div>
  );
}
