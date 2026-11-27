"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IconAlertCircle,
  IconCheck,
  IconEnvelope,
  IconEye,
  IconEyeOff,
  IconLock,
  IconShield,
} from "@/components/Icons";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeProvider";

const BRAND_GRADIENT = "linear-gradient(140deg, #0D192B 0%, #10233D 56%, #183454 100%)";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-background px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-border bg-card shadow-xl lg:min-h-[620px] lg:grid-cols-2">
        <div className="min-h-52 bg-sidebar p-8 sm:p-12">
          <div className="h-14 w-32 animate-pulse rounded-xl bg-white/15" />
          <div className="mt-16 h-10 w-3/4 animate-pulse rounded-lg bg-white/15" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-5">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notice = params.get("notice");
  const nextParam = params.get("next");
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failedAttempt, setFailedAttempt] = useState(0);
  const [capsLock, setCapsLock] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    setCapsLock(e.getModifierState("CapsLock"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password.");
        setFailedAttempt((attempt) => attempt + 1);
        window.setTimeout(() => {
          if (!email.trim()) emailRef.current?.focus();
          else passwordRef.current?.focus();
        }, 0);
        return;
      }

      setSuccess(true);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to connect. Please try again.");
      setFailedAttempt((attempt) => attempt + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="login-orbit absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-brand/10 blur-[110px]" />
        <div className="login-orbit absolute -bottom-56 -right-40 h-[38rem] w-[38rem] rounded-full bg-accent/10 blur-[120px] [animation-delay:-6s]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)] opacity-70" />
      </div>

      <div className="fixed right-4 top-4 z-40 sm:right-7 sm:top-7">
        <ThemeToggle className="rounded-xl border border-border bg-card/90 p-2 shadow-sm backdrop-blur transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>

      <div className="relative z-10 w-full max-w-[1120px]">
        <div className="login-card-enter grid overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_32px_100px_-36px_rgba(9,23,42,0.34)] lg:min-h-[680px] lg:grid-cols-[1fr_0.94fr]">
          <section
            style={{ background: BRAND_GRADIENT }}
            className="relative isolate flex min-h-[430px] flex-col justify-between overflow-hidden px-7 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[680px] lg:px-12 lg:py-11"
          >
            <div aria-hidden="true" className="login-orbit pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-accent/20 blur-[90px]" />
            <div aria-hidden="true" className="login-float pointer-events-none absolute bottom-20 right-9 -z-10 hidden h-24 w-24 rotate-12 rounded-[28px] border border-white/10 bg-white/[0.04] lg:block" />

            <div className="login-content-enter flex items-center justify-between gap-4">
              <Link href="/" aria-label="YETAF Holding home" className="inline-flex rounded-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <BrandLogo size="letterhead" priority />
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-2 text-[10px] font-semibold tracking-wide text-white/85 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_rgba(215,179,93,0.75)]" />
                SECURE WORKSPACE
              </span>
            </div>

            <div className="login-content-enter relative z-10 mt-12 max-w-xl sm:mt-14" style={{ animationDelay: "100ms" }}>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent sm:text-[11px]">
                <span className="h-px w-7 bg-accent/80" /> Office of Direction &amp; Board
              </p>
              <h1 className="mt-5 font-display text-[2.65rem] font-bold leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
                From direction
                <br />
                <span className="font-display italic text-accent">to delivery.</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/75 sm:text-base">
                One secure workspace for directives, action plans, tasks, and company reporting.
              </p>

              <div className="mt-9 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["01", "Directives", "Clear ownership and follow-up"],
                  ["02", "Action plans", "Progress that stays visible"],
                  ["03", "Reporting", "Weekly and monthly reviews"],
                ].map(([number, title, description], index) => (
                  <div
                    key={number}
                    className="login-content-enter flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-3.5 py-3 backdrop-blur-sm transition duration-300 hover:border-accent/35 hover:bg-white/[0.09] sm:items-start lg:max-w-sm"
                    style={{ animationDelay: `${180 + index * 90}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 font-mono text-[10px] font-bold text-accent">
                      {number}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-white/60">{description}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-10 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] text-white/55">
              <span>YETAF Holding Limited</span>
              <span>Executive Direction System</span>
            </div>
          </section>

          <section className="flex items-center justify-center bg-card px-6 py-10 sm:px-10 sm:py-12 lg:px-12">
            <div className="login-content-enter w-full max-w-[390px]" style={{ animationDelay: "120ms" }}>
              <div className="mb-8">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
                  <IconShield size={21} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">YETAF HOLDING · INTERNAL PORTAL</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to continue to your workspace.</p>
              </div>

              {notice === "no-signup" && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3.5 text-sm text-foreground" role="status">
                  <IconAlertCircle size={17} className="mt-0.5 shrink-0 text-accent" />
                  <p>Public registration is disabled. Contact your administrator for access.</p>
                </div>
              )}

              {capsLock && !error && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-foreground" role="status">
                  <IconAlertCircle size={16} className="shrink-0 text-accent" />
                  <span>Caps Lock is on</span>
                </div>
              )}

              {error && (
                <div key={failedAttempt} className="login-shake mb-5 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 p-3.5 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15" role="alert">
                  <IconAlertCircle size={17} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{error}</p>
                    {failedAttempt > 1 && <p className="mt-1 text-xs opacity-80">Check your email and password, then try again.</p>}
                  </div>
                </div>
              )}

              {success ? (
                <div className="login-content-enter rounded-2xl border border-brand/25 bg-brand/5 p-7 text-center">
                  <div className="login-float mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <IconCheck size={27} />
                  </div>
                  <p className="font-semibold text-foreground">Welcome back</p>
                  <p className="mt-1 text-sm text-muted-foreground">Opening your workspace…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="text-xs font-semibold text-foreground">Corporate email</label>
                    <div className="relative">
                      <IconEnvelope size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="login-email"
                        ref={emailRef}
                        type="email"
                        name="email"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        placeholder="name@yetaf-holding.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        disabled={loading || success}
                        className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm text-foreground shadow-sm outline-none transition duration-200 placeholder:text-muted-foreground/65 hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="login-password" className="text-xs font-semibold text-foreground">Password</label>
                      <Link href="/forgot-password" className="rounded text-xs font-semibold text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Forgot access?</Link>
                    </div>
                    <div className="relative">
                      <IconLock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="login-password"
                        ref={passwordRef}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        required
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={loading || success}
                        className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-20 text-sm text-foreground shadow-sm outline-none transition duration-200 placeholder:text-muted-foreground/65 hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((shown) => !shown)}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        disabled={loading || success}
                        className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        {showPassword ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                        <span>{showPassword ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || success || !email.trim() || !password}
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-md shadow-brand/15 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/20 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                  >
                    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                    <span>{loading ? "Signing in…" : "Sign in securely"}</span>
                    {!loading && <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>}
                  </button>
                </form>
              )}

              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-brand"><IconShield size={17} /></span>
                <span className="text-[11px] leading-5 text-muted-foreground">Protected access for authorized YETAF Holding personnel.</span>
              </div>
              <p className="mt-7 text-center text-[10px] tracking-wide text-muted-foreground">CONFIDENTIAL · YETAF HOLDING LIMITED</p>
            </div>
          </section>
        </div>
        <p className="mt-5 text-center text-[10px] text-muted-foreground">Directive Follow-up System · Executive Direction</p>
      </div>
    </main>
  );
}
