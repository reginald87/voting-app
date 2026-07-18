import Link from "next/link";
import { getVoter, getAdmin } from "@/lib/session";
import { getSiteContent } from "@/lib/content";
import { UniversityLogo, SugLogo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { LogoutLink } from "./LogoutButton";

export async function NavBar() {
  const [voter, admin, content] = await Promise.all([
    getVoter(),
    getAdmin(),
    getSiteContent(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            <UniversityLogo src={content.uniLogoUrl} className="h-9 w-9 rounded-full ring-2 ring-white object-cover" />
            <SugLogo src={content.sugLogoUrl} className="h-9 w-9 rounded-full ring-2 ring-white object-cover" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-ink">BMU SUG Elections</p>
            <p className="text-[11px] text-slate-500">Bayelsa Medical University</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex sm:gap-3">
          <Link href="/positions" className="btn-ghost">
            Aspirants
          </Link>
          <Link href="/executives" className="btn-ghost">
            Executives
          </Link>
          <Link href="/results" className="btn-ghost">
            Results
          </Link>
          {admin ? (
            <Link href="/admin" className="btn-primary">
              Admin
            </Link>
          ) : voter ? (
            <>
              <Link href="/profile" className="btn-outline">
                My Profile
              </Link>
              <LogoutLink href="/api/auth/logout" className="btn-ghost" label="Sign out" />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </nav>

        <MobileNav voter={Boolean(voter)} admin={Boolean(admin)} />
      </div>
    </header>
  );
}
