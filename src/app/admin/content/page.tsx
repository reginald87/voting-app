import { requireAdmin } from "@/lib/session";
import { getSiteContent } from "@/lib/content";
import { ContentManager } from "@/components/admin/ContentManager";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireAdmin();
  const c = await getSiteContent();
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-ink">Content &amp; Branding</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage the university and SUG logos, favicon, the dean&apos;s profile and message,
        and the home page copy. Changes apply across the whole application.
      </p>
      <div className="mt-6">
        <ContentManager
          content={{
            uniLogoUrl: c.uniLogoUrl,
            sugLogoUrl: c.sugLogoUrl,
            faviconUrl: c.faviconUrl,
            deanPhotoUrl: c.deanPhotoUrl,
            deanName: c.deanName,
            deanMessage: c.deanMessage,
            heroTitle: c.heroTitle,
            heroSubtitle: c.heroSubtitle,
            heroCtaPrimary: c.heroCtaPrimary,
            heroCtaSecondary: c.heroCtaSecondary,
            peaceTitle: c.peaceTitle,
            peaceBody: c.peaceBody,
            footerText: c.footerText,
            faceRecognition: c.faceRecognition,
          }}
        />
      </div>
    </div>
  );
}
