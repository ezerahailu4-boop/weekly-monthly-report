"use client";

import { Badge } from "@/components/ui";
import { IconCrown, IconShield, IconUser } from "@/components/Icons";

interface ExecutiveHeaderProps {
  user?: {
    role?: string | null;
    full_name?: string | null;
    email?: string | null;
    department?: string | null;
  };
  title?: string;
  subtitle?: string;
  hero?: boolean;
  actions?: React.ReactNode;
}

export function ExecutiveHeader({
  user,
  title,
  subtitle,
  hero = true,
  actions,
}: ExecutiveHeaderProps) {
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const displayName = user?.full_name || user?.email?.split("@")[0] || "Executive";

  return (
    <>
      {/* Hero background glow */}
      <div className={hero ? "bg-glow" : ""} />
      <div className="relative isolate overflow-hidden flex flex-col gap-5 rounded-2xl border border-border bg-card shadow-xs transition-colors">
        {hero && (
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-accent/15 blur-[100px]" />
        )}
        <div className={`relative z-10 ${hero ? "p-8 sm:p-12 lg:p-16" : "p-5 sm:p-7 lg:p-10"}`}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-4">
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 dark:bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-bold border border-amber-500/30">
                <IconCrown size={12} className="text-amber-600 dark:text-amber-400" />
                Office of Direction &amp; Board
              </span>
            ) : isAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-600/30">
                <IconShield size={12} />
                Executive Administration
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 text-foreground px-2.5 py-0.5 text-[11px] font-semibold border border-border">
                <IconUser size={12} className="text-muted-foreground" />
                {user?.department || "Operations & Logistics"}
              </span>
            )}
            <span className="text-muted-foreground/60">&middot;</span>
            <span className="text-muted-foreground text-[10px] tracking-widest">DIRECTIVE FOLLOW-UP SYSTEM</span>
          </div>

          <h1 className={`font-display font-extrabold tracking-tight text-foreground ${hero ? "max-w-4xl text-4xl leading-[1.04] sm:text-5xl lg:text-6xl" : "text-2xl sm:text-3xl"}`}>
            {title || "Executive Dashboard"}
          </h1>
          {subtitle && (
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base max-w-3xl">
              {subtitle}
            </p>
          )}

          {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {!hero && actions && (
          <div className="border-t border-border/80 pt-4 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}
