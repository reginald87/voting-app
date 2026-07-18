import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1 overflow-x-hidden bg-slate-50">{children}</div>
    </div>
  );
}
