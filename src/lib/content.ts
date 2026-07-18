import { prisma } from "./prisma";

export interface SiteContent {
  id: number;
  uniLogoUrl: string | null;
  sugLogoUrl: string | null;
  faviconUrl: string | null;
  deanPhotoUrl: string | null;
  deanName: string | null;
  deanMessage: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroCtaPrimary: string | null;
  heroCtaSecondary: string | null;
  peaceTitle: string | null;
  peaceBody: string | null;
  footerText: string | null;
  faceRecognition: boolean;
  updatedAt: Date;
}

const DEFAULTS: Omit<SiteContent, "id" | "updatedAt"> = {
  uniLogoUrl: null,
  sugLogoUrl: null,
  faviconUrl: null,
  deanPhotoUrl: null,
  deanName: "Dean of Student Affairs",
  deanMessage:
    "Democracy thrives when every voice is heard. Exercise your franchise responsibly.",
  heroTitle: "Your Voice. Your Choice.\nVote for a Better BMU.",
  heroSubtitle:
    "The official secure e-voting platform of the Bayelsa Medical University Student Union Government. Cast your ballot from anywhere, transparently and credibly.",
  heroCtaPrimary: "View Aspirants & Vote",
  heroCtaSecondary: "Register as a Voter",
  peaceTitle: "Peace & Orderliness",
  peaceBody:
    "The conduct of this election is anchored on the principles of peace, orderliness and mutual respect. We enjoin every elector and aspirant to uphold the spirit of sportsmanship before, during and after the polls.",
  footerText:
    "Secure · Transparent · Credible Elections",
  faceRecognition: false,
};

export async function getSiteContent(): Promise<SiteContent> {
  const row = await prisma.siteContent.findUnique({ where: { id: 1 } });
  if (row) return row as SiteContent;
  try {
    return (await prisma.siteContent.create({
      data: { id: 1, ...DEFAULTS },
    })) as SiteContent;
  } catch {
    // Another request may have created the row concurrently.
    const retry = await prisma.siteContent.findUnique({ where: { id: 1 } });
    if (retry) return retry as SiteContent;
    throw new Error("Could not load site content");
  }
}

export async function updateSiteContent(
  data: Partial<Omit<SiteContent, "id" | "updatedAt">>
): Promise<SiteContent> {
  return (await prisma.siteContent.upsert({
    where: { id: 1 },
    update: { ...data, updatedAt: new Date() },
    create: { id: 1, ...DEFAULTS, ...data },
  })) as SiteContent;
}
