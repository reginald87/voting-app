"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Toast } from "@/components/Toast";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";

export interface ProfileSeed {
  firstName: string;
  lastName: string;
  matNumber: string;
  email: string;
  department: string;
  level: string;
  sugReceipt: string;
  sugReceiptUrl: string | null;
  avatarUrl: string | null;
  accredited: boolean;
  faceEnrolled: boolean;
}

export function ProfileEdit({ voter }: { voter: ProfileSeed }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(voter.firstName);
  const [lastName, setLastName] = useState(voter.lastName);
  const [department, setDepartment] = useState(voter.department);
  const [level, setLevel] = useState(voter.level);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(voter.avatarUrl);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar image is too large (max 2MB).");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Avatar must be a PNG, JPG or WEBP image.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarData(dataUrl);
      setAvatarPreview(dataUrl);
      setAvatarRemoved(false);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarData(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  }

  function cancel() {
    setFirstName(voter.firstName);
    setLastName(voter.lastName);
    setDepartment(voter.department);
    setLevel(voter.level);
    setAvatarPreview(voter.avatarUrl);
    setAvatarData(null);
    setAvatarRemoved(false);
    setError(null);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          department,
          level,
          avatarDataUrl: avatarData,
          removeAvatar: avatarRemoved && !avatarData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save changes.");
        return;
      }
      setToast("Profile updated successfully.");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="card flex flex-col items-center p-8 text-center">
        <Avatar first={voter.firstName} last={voter.lastName} src={voter.avatarUrl} size={120} />
        <h1 className="mt-4 text-xl font-bold text-ink">
          {voter.firstName} {voter.lastName}
        </h1>
        <p className="text-sm text-slate-500">{voter.matNumber}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {voter.accredited ? (
            <span className="badge-green">✓ Accredited</span>
          ) : (
            <span className="badge-amber">Not accredited</span>
          )}
          {voter.faceEnrolled && <span className="badge-slate">Face enrolled</span>}
        </div>

        <dl className="mt-6 w-full space-y-3 text-left text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Mat. Number</dt>
            <dd className="font-medium text-ink">{voter.matNumber}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Department</dt>
            <dd className="font-medium text-ink">{voter.department}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Level</dt>
            <dd className="font-medium text-ink">{voter.level}</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Email</dt>
            <dd className="truncate pl-3 font-medium text-ink">{voter.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">SUG Receipt</dt>
            <dd className="font-medium text-ink">{voter.sugReceipt}</dd>
          </div>
          {voter.sugReceiptUrl && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <dt className="mb-1 text-slate-500">Receipt upload</dt>
              <dd>
                {voter.sugReceiptUrl.endsWith(".pdf") ? (
                  <a
                    href={voter.sugReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-brand-700 underline"
                  >
                    View uploaded receipt (PDF)
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={voter.sugReceiptUrl}
                    alt="SUG receipt"
                    className="h-32 w-auto rounded-lg border border-slate-200 object-contain"
                  />
                )}
              </dd>
            </div>
          )}
        </dl>

        <button type="button" onClick={() => setEditing(true)} className="btn-outline mt-6 w-full">
          Edit profile
        </button>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="card flex flex-col items-center p-8 text-center">
      <div className="relative">
        <Avatar first={firstName} last={lastName} src={avatarPreview} size={120} />
        {avatarPreview && (
          <button
            type="button"
            onClick={removeAvatar}
            className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow"
            title="Remove photo"
          >
            ×
          </button>
        )}
      </div>

      <label className="btn-outline mt-3 cursor-pointer text-xs">
        {avatarPreview ? "Change photo" : "Upload photo"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onAvatarChange}
        />
      </label>

       <div className="mt-6 w-full space-y-3 text-left">
        <div>
          <label htmlFor="pf-firstName" className="mb-1 block text-xs font-medium text-slate-500">First name</label>
          <input id="pf-firstName" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pf-lastName" className="mb-1 block text-xs font-medium text-slate-500">Last name</label>
          <input id="pf-lastName" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pf-department" className="mb-1 block text-xs font-medium text-slate-500">Department</label>
          <input id="pf-department" className="input" list="dept-list" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Type or select your department" required />
          <datalist id="dept-list">
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="pf-level" className="mb-1 block text-xs font-medium text-slate-500">Level</label>
          <select id="pf-level" className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <p className="mb-1 font-semibold text-slate-600">Locked fields</p>
          <p>Email, Mat. Number, SUG Receipt No. and the uploaded receipt cannot be changed.</p>
        </div>
      </div>

      {error && <p className="mt-3 w-full text-left text-sm text-rose-600">{error}</p>}

      <div className="mt-5 flex w-full gap-2">
        <button type="button" onClick={cancel} disabled={saving} className="btn-outline flex-1">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
