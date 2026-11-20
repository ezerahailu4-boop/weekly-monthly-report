"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IconAlertCircle, IconEye } from "@/components/Icons";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notice = params.get("notice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f4f0] px-4 py-8 text-foreground dark:bg-[#101317] sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-400/15 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-orange-500/10 blur-[110px]" />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border/80 bg-card shadow-2xl shadow-black/10 lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#191712] via-[#242016] to-[#48371b] px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[640px] lg:px-12 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div>
            <Link href="/" aria-label="YETAF Holding home" className="inline-flex rounded-2xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              <BrandLogo size="hero" priority />
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-100/20 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100/85">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              YETAF Holding · Secure Workspace
            </div>
            <h1 className="mt-5 max-w-xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Clear direction.<br />Connected execution.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-stone-200/75 sm:text-base sm:leading-7">
              One trusted place for corporate directives, action plans, and subsidiary performance reporting.
            </p>
          </div>

          <div className="mt-9 grid grid-cols-3 gap-2 sm:gap-3">
            {[["01", "Direction"], ["02", "Management"], ["03", "Teams"]].map(([number, label]) => (
              <div key={number} className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-3 sm:px-4">
                <p className="font-mono text-[10px] text-amber-200/70">{number}</p>
                <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">Directive Follow-up System</p>
        </section>

        <section className="flex items-center justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Welcome back</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">Sign in to your account</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your corporate credentials to continue to the holding workspace.</p>
            </div>

            {notice === "no-signup" && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-200" role="status">
                <IconAlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>Public registration is disabled. Contact your administrator for access.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-semibold text-foreground">Corporate email</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  placeholder="name@yetaf-holding.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/65 focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold text-foreground">Password</label>
                  <button type="button" onClick={() => setShowPassword((p) => !p)} aria-pressed={showPassword} className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <IconEye size={13} />{showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/65 focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
                  <IconAlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-60">
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                {loading ? "Signing in…" : "Sign in securely"}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /><span>Authorized personnel only</span><span className="h-px flex-1 bg-border" />
            </div>
            <p className="mt-5 text-center text-[11px] text-muted-foreground">Confidential internal system · YETAF Holding Limited</p>
          </div>
        </section>
      </div>
    </main>
  );
}
