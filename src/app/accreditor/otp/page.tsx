import { requireAccreditor } from "@/lib/session";
import { OtpIssuer } from "@/components/accreditor/OtpIssuer";

export const dynamic = "force-dynamic";

export default async function AccreditorOtpPage() {
  await requireAccreditor();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Issue Verification Code</h1>
      <p className="mt-1 text-sm text-slate-500">
        Generate an OTP for a voter whose code could not be delivered by email.
      </p>
      <div className="mt-6">
        <OtpIssuer loginUrl="/accreditor/login" />
      </div>
    </div>
  );
}