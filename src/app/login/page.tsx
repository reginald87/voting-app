import Link from "next/link";
import { redirect } from "next/navigation";
import { getVoter } from "@/lib/session";
import { getSiteContent } from "@/lib/content";
import { RequestOtpForm } from "@/components/auth/RequestOtpForm";
import { UniversityLogo, SugLogo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getVoter()) redirect("/profile");
  const content = await getSiteContent();

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <UniversityLogo src={content.uniLogoUrl} className="h-10 w-10" />
          <SugLogo src={content.sugLogoUrl} className="h-10 w-10" />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your matriculation number to receive a one-time code via email.
          </p>
          <div className="mt-6">
            <RequestOtpForm />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link href="/register" className="font-semibold text-brand-700">
            Create a voter account
          </Link>
        </p>
      </div>
    </div>
  );
}
