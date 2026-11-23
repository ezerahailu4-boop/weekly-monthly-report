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
      <div className="relative isolate overflow-hidden flex flex-col gap-5 border border-champagne bg-gradient-card shadow-sm">
        {hero && (
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-gold/20 blur-[100px]" />
        )}
        <div className={`relative z-10 ${hero ? "p-8 sm:p-12 lg:p-16" : "p-5 sm:p-7 lg:p-10"}`}>
          <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-body mb-4`}>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold heading border border-champagne">
                <IconCrown size={12} className="text-gold" />
                Office of Direction &amp; Board
              </span>
            ) : isAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold warm-cream">
                <IconShield size={12} />
                Executive Administration
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold heading border border-champagne">
                <IconUser size={12} className="text-body" />
                {user?.department || "Operations & Logistics"}
              </span>
            )}
            <span>&middot;</span>
            <span className="text-body">DIRECTIVE FOLLOW-UP SYSTEM</span>
          </div>

          <h1 className={`font-display font-extrabold tracking-tight ${hero ? "max-w-4xl text-4xl leading-[1.04] sm:text-5xl lg:text-6xl" : "text-2xl sm:text-3xl"}`} style={{ color: "#153D30" }}>
            {title || "Executive Dashboard"}
          </h1>
          {subtitle && (
            <p className={`mt-2 text-sm leading-relaxed text-body sm:text-base max-w-3xl`} style={{ color: "#52645A" }}>
              {subtitle}
            </p>
          )}

          {actions && <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        {!hero && actions && (
          <div className="border-t border-champagne/60 pt-4 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}
