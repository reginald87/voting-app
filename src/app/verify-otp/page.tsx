import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";
import { UniversityLogo, SugLogo } from "@/components/Logo";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function VerifyOtpPage() {
  const content = await getSiteContent();
  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <UniversityLogo src={content.uniLogoUrl} className="h-10 w-10" />
          <SugLogo src={content.sugLogoUrl} className="h-10 w-10" />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">Verify it&apos;s you</h1>
          <p className="mt-1 text-sm text-slate-500">
            Confirm the code sent to your email to access your ballot.
          </p>
          <div className="mt-6">
            <VerifyOtpForm />
          </div>
        </div>
      </div>
    </div>
  );
}
