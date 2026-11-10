import Link from "next/link";
import NavBar from "@/components/NavBar";
import {
  IconArrowRight,
  IconCrown,
  IconDownload,
  IconFileText,
  IconShield,
  IconTrendingUp,
} from "@/components/Icons";

const features = [
  {
    icon: IconCrown,
    title: "CEO Executive Command",
    description:
      "Holding-wide visibility for executive leadership to review subsidiary performance, inspect KPIs, and issue strategic directives.",
  },
  {
    icon: IconFileText,
    title: "Dual Official Templates",
    description:
      "Exact word-for-word replicas of Yetaf Holding's official Weekly Performance and Monthly Strategic Progress formats.",
  },
  {
    icon: IconTrendingUp,
    title: "Granular KPI Tracking",
    description:
      "Dynamic activity rows with planned target versus actual performance, percentage calculation, and roadblock logging.",
  },
  {
    icon: IconDownload,
    title: "Executive Export Suite",
    description:
      "Download high-res Word (.docx) files with official Section 8 review sign-offs, printable PDFs, and consolidated CSV spreadsheets.",
  },
  {
    icon: IconShield,
    title: "Enterprise Governance",
    description:
      "Admin-provisioned accounts with strict 3-tier access: Super Admin (CEO), Department Administrator, and Staff Contributor.",
  },
  {
    icon: IconFileText,
    title: "Local Draft Safety",
    description:
      "Automatic local draft caching protects long narrative entries from browser crashes or network interruptions.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-white">
      <NavBar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  YETAF HOLDING Enterprise Reporting Portal
                </div>

                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl sm:leading-[1.1]">
                  Executive reporting. <br />
                  <span className="text-muted-foreground italic">Structured, instant, centralized.</span>
                </h1>

                <p className="mt-4 sm:mt-5 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl">
                  Replace fragmented Word attachments with a unified enterprise governance system.
                  Empower subsidiary teams to submit weekly achievements and monthly milestones,
                  while providing the CEO with complete panoramic visibility.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    Open Portal Workspace
                    <IconArrowRight size={15} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    Sign In to Account
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 max-w-lg">
                  <div>
                    <p className="font-display text-2xl font-bold text-foreground tabular-nums">100%</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Template Accuracy</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-foreground">3 Roles</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">CEO, Admin, Staff</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-foreground">DOCX + PDF</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Board-Ready Export</p>
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                          Executive Preview
                        </span>
                        <h3 className="font-display text-base font-bold text-foreground">
                          Weekly Performance Snapshot
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Submitted
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg bg-muted/60 p-3 text-xs border border-border/80">
                        <p className="text-muted-foreground font-medium">Reporting Window &amp; Unit</p>
                        <p className="font-semibold text-foreground mt-0.5 tabular-nums">
                          2026-11-02 &rarr; 2026-11-08 &middot; Operations &amp; Logistics
                        </p>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-border">
                        <table className="w-full text-xs tabular-nums">
                          <thead className="bg-muted/70 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Key Objective</th>
                              <th className="px-3 py-2 text-center font-semibold">Target</th>
                              <th className="px-3 py-2 text-right font-semibold">% Done</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            <tr>
                              <td className="px-3 py-2 font-medium text-foreground">Fleet Uptime Rate</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">95%</td>
                              <td className="px-3 py-2 text-right font-bold text-accent">98.4%</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-foreground">Customs Clearance Turnaround</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">48 hrs</td>
                              <td className="px-3 py-2 text-right font-bold text-accent">36 hrs</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium text-foreground">Warehouse Safety Inspections</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">4 sites</td>
                              <td className="px-3 py-2 text-right font-bold text-foreground">100%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-muted-foreground">Official Board Export Formats</span>
                        <div className="flex gap-1.5 font-mono text-[10px] font-semibold">
                          <span className="rounded bg-muted px-2 py-0.5 text-foreground border border-border">
                            DOCX
                          </span>
                          <span className="rounded bg-primary px-2 py-0.5 text-primary-foreground">
                            PDF
                          </span>
                          <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5">
                            CSV
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Value Grid */}
        <section className="border-t border-border bg-card/40 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Purpose-Built Holding Architecture
              </h2>
              <p className="mt-2 font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                Engineered for Executive Corporate Governance
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 shadow-2xs transition-all hover:shadow-xs hover:border-accent/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <feature.icon size={18} />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer suppressHydrationWarning className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} YETAF HOLDING LIMITED. Confidential Executive Reporting System.
      </footer>
    </div>
  );
}
