"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IconAlertCircle,
  IconEnvelope,
  IconEye,
} from "@/components/Icons";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-main px-4 py-8 text-foreground sm:px-6 sm:py-12">
      {/* Ambient background glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/10 dark:shadow-black/40 lg:grid-cols-[1.04fr_0.96fr]">
        {/* Left · signature emerald brand canvas */}
        <section
          style={{ background: "linear-gradient(145deg, #06261B 0%, #0A3D2C 48%, #10593F 100%)" }}
          className="relative isolate flex min-h-[420px] flex-col justify-between overflow-hidden px-8 py-10 text-white sm:px-12 sm:py-14 lg:min-h-[700px] lg:px-16 lg:py-18"
        >
          {/* Atmospheric gold bloom */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 -z-10 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

          <div>
            <Link href="/" aria-label="YETAF Holding home" className="inline-flex rounded-2xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <BrandLogo size="hero" priority />
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-xs shadow-amber-400" />
              YETAF Holding · Secure Governance Portal
            </div>
            <h1 className="mt-5 max-w-xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Clear direction.<br />
              Connected execution.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
              One trusted platform for executive directives, multi-task tracking, action plans, and subsidiary performance governance.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-3">
            {[["01", "Direction"], ["02", "Management"], ["03", "Operations"]].map(([number, label]) => (
              <div key={number} className="rounded-xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-xs transition-colors hover:bg-white/15">
                <p className="font-mono text-[10px] font-bold text-amber-300">{number}</p>
                <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
            <span>Directive Follow-up System</span>
            <span>Report Follow-up Center</span>
          </div>
        </section>

        {/* Right · sign-in card */}
        <section className="flex items-center justify-center bg-card px-6 py-10 text-foreground sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Welcome back
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enter your authorized credentials to access the holding workspace.
              </p>
            </div>

            {notice === "no-signup" && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-900 dark:text-amber-200" role="status">
                <IconAlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>Public registration is disabled. Contact your administrator for access.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-semibold text-foreground/90">Corporate email</label>
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
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-2xs outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold text-foreground/90">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-pressed={showPassword}
                    className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
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
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-2xs outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
                  <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                {loading ? "Signing in…" : "Sign in securely"}
              </button>

              <div className="mt-5 flex items-center justify-center">
                <Link
                  href="/forgot-password"
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
                >
                  <IconEnvelope size={13} />
                  Forgot Access
                </Link>
              </div>
            </form>

            <div className="mt-7 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>Authorized personnel only</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">Confidential internal system · YETAF Holding Limited</p>
          </div>
        </section>
      </div>
    </main>
  );
}
