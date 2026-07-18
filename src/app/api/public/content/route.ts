import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await getSiteContent();
  return Response.json({
    faceRecognition: Boolean(c.faceRecognition),
    uniLogoUrl: c.uniLogoUrl,
    sugLogoUrl: c.sugLogoUrl,
    faviconUrl: c.faviconUrl,
    deanName: c.deanName,
    deanMessage: c.deanMessage,
    heroTitle: c.heroTitle,
    heroSubtitle: c.heroSubtitle,
    heroCtaPrimary: c.heroCtaPrimary,
    heroCtaSecondary: c.heroCtaSecondary,
    peaceTitle: c.peaceTitle,
    peaceBody: c.peaceBody,
    footerText: c.footerText,
  });
}
