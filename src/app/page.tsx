import Link from "next/link";
import { getSiteContent } from "@/lib/content";
import { getAllPeriods } from "@/lib/election";
import { DeanPhoto } from "@/components/Avatar";
import { UniversityLogo, SugLogo } from "@/components/Logo";
import { ElectionStatus } from "@/components/ElectionStatus";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const c = await getSiteContent();
  const periods = await getAllPeriods();
  const heroTitle = (c.heroTitle || "Your Voice. Your Choice.\nVote for a Better BMU.").split(
    "\n"
  );
  const heroSubtitle =
    c.heroSubtitle ||
    "The official secure e-voting platform of the Bayelsa Medical University Student Union Government. Cast your ballot from anywhere, transparently and credibly.";
  const peaceTitle = c.peaceTitle || "Peace & Orderliness";
  const peaceBody =
    c.peaceBody ||
    "The conduct of this election is anchored on the principles of peace, orderliness and mutual respect. We enjoin every elector and aspirant to uphold the spirit of sportsmanship before, during and after the polls.";
  const ctaPrimary = c.heroCtaPrimary || "View Aspirants & Vote";
  const ctaSecondary = c.heroCtaSecondary || "Register as a Voter";

  return (
    <div className="flex flex-col">
      <ElectionStatus
        periods={periods.map((p) => ({
          key: p.key,
          label: p.label,
          open: p.open,
          reason: p.reason,
          start: p.start ? p.start.toISOString() : null,
          end: p.end ? p.end.toISOString() : null,
        }))}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Student Union Government Elections
            </div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              {heroTitle.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < heroTitle.length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-brand-100">{heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/positions" className="btn-accent">
                {ctaPrimary}
              </Link>
              <Link
                href="/register"
                className="btn bg-white/15 text-white hover:bg-white/25"
              >
                {ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm">
              <DeanPhoto
                src={c.deanPhotoUrl}
                name={c.deanName || "Dean of Student Affairs"}
                className="aspect-[4/5] w-full shadow-2xl ring-4 ring-white/20"
              />
              <div className="mt-4 rounded-xl bg-white/10 p-4 text-center backdrop-blur">
                <p className="text-sm font-semibold text-white">
                  {c.deanName || "Dean of Student Affairs"}
                </p>
                <p className="text-xs text-brand-100">
                  &ldquo;{c.deanMessage}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Election timeline strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page py-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {periods.map((p) => {
              const start = p.start ? new Date(p.start) : null;
              const end = p.end ? new Date(p.end) : null;
              const range =
                start && end
                  ? `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                  : start
                    ? `Opens ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    : end
                      ? `Closes ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : "Schedule TBD";
              return (
                <div
                  key={p.key}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      p.open ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {p.open ? "●" : "○"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {p.label}
                    </p>
                    <p className="truncate text-sm font-semibold text-ink">
                      {p.open ? "Open now" : (p.reason || "Closed")}
                    </p>
                    <p className="text-xs text-slate-500">{range}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Peace & orderliness */}
      <section className="container-page py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-ink">{peaceTitle}</h2>
          <p className="mt-3 text-slate-600">{peaceBody}</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Peaceful Campaigns",
              body: "Engage issues, not insults. Respect differing opinions and the dignity of every candidate.",
            },
            {
              title: "Orderly Process",
              body: "Follow the accredited voting window. One vote per position — your choice is secure and final.",
            },
            {
              title: "Credible Outcome",
              body: "Results are tallied transparently and shown live to the electoral commission in the situation room.",
            },
          ].map((c) => (
            <div key={c.title} className="card p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                ✓
              </div>
              <h3 className="text-lg font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Branding strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="container-page flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
          <div className="flex items-center gap-4">
            <UniversityLogo src={c.uniLogoUrl} className="h-14 w-14 rounded-full object-cover" />
            <div>
              <p className="text-sm font-bold text-ink">Bayelsa Medical University</p>
              <p className="text-xs text-slate-500">Yenagoa, Bayelsa State</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-ink">Student Union Government</p>
              <p className="text-xs text-slate-500">Electoral Commission</p>
            </div>
            <SugLogo src={c.sugLogoUrl} className="h-14 w-14 rounded-full object-cover" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page py-16 text-center">
        <h2 className="text-3xl font-bold text-ink">Ready to make your mark?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Browse the positions and meet the aspirants, then register or sign in to cast your
          vote when the polls open.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/positions" className="btn-primary">
            Meet the Aspirants
          </Link>
          <Link href="/executives" className="btn-outline">
            Current Executives
          </Link>
        </div>
      </section>
    </div>
  );
}
