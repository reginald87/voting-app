import Link from "next/link";
import { redirect } from "next/navigation";
import { getVoter } from "@/lib/session";
import { getSiteContent } from "@/lib/content";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { UniversityLogo, SugLogo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getVoter()) redirect("/profile");
  const content = await getSiteContent();

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <UniversityLogo src={content.uniLogoUrl} className="h-10 w-10" />
          <SugLogo src={content.sugLogoUrl} className="h-10 w-10" />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">Voter Registration</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create your voter account. A verification code will be sent to your email.
          </p>
          <div className="mt-6">
            <RegisterForm />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
