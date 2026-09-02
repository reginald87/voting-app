import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccreditor } from "@/lib/session";
import { getSiteContent } from "@/lib/content";
import { AccreditorLoginForm } from "@/components/accreditor/AccreditorLoginForm";
import { UniversityLogo, SugLogo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AccreditorLoginPage() {
  if (await getAccreditor()) redirect("/accreditor");
  const content = await getSiteContent();

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <UniversityLogo src={content.uniLogoUrl} className="h-10 w-10" />
          <SugLogo src={content.sugLogoUrl} className="h-10 w-10" />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink">Accreditor Access</h1>
          <p className="mt-1 text-sm text-slate-500">
            Authorised accreditor access only.
          </p>
          <div className="mt-6">
            <AccreditorLoginForm />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="font-semibold text-brand-700">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
