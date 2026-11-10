import React from "react";

export function Section({
  number,
  title,
  description,
  children,
}: {
  number?: string | number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs transition-shadow hover:shadow-sm">
      <div className="mb-5 flex flex-col gap-1 border-b border-border pb-4">
        <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2.5">
          {number !== undefined && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-bold text-accent">
              {number}
            </span>
          )}
          <span>{title}</span>
        </h2>
        {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 sm:space-y-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs sm:text-sm font-semibold text-foreground">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50";

export const textareaClass =
  inputClass + " min-h-[96px] resize-y leading-relaxed";
