import { AccreditorNav } from "@/components/accreditor/AccreditorNav";

export default function AccreditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AccreditorNav />
      <div className="min-w-0 flex-1 overflow-x-hidden bg-slate-50">{children}</div>
    </div>
  );
}
