import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { NavVisibility } from "@/components/NavVisibility";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getSiteContent();
  return {
    title: "BMU SUG Elections",
    description:
      "Official E-Voting platform for the Bayelsa Medical University Student Union Government Elections.",
    icons: c.faviconUrl ? { icon: c.faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getSiteContent();
  return (
    <html lang="en">
      <body>
        <NavVisibility>
          <NavBar />
        </NavVisibility>
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-sm text-slate-500 sm:flex-row">
            <p>
              &copy; {new Date().getFullYear()} Bayelsa Medical University &middot; Student
              Union Government
            </p>
            <div className="flex items-center gap-4">
              <p className="text-slate-400">
                {content.footerText || "Secure · Transparent · Credible Elections"}
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
