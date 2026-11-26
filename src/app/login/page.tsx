"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IconAlertCircle, IconCheck, IconEnvelope, IconEye, IconEyeOff, IconLock, IconShield, IconUser } from "@/components/Icons";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeProvider";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const BRAND_GRADIENT =
  "linear-gradient(135deg, #06261B 0%, #0A3D2C 30%, #0F6B4B 60%, #10593F 100%)";

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  return (
    <LoginSuspenseBoundary>
      <LoginForm />
    </LoginSuspenseBoundary>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton (SSR-safe placeholder)                                   */
/* ------------------------------------------------------------------ */

function LoginSkeleton() {
  const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isCardDark = prefersDark ? "bg-[#181E1C] text-[#F5F3EC]" : "bg-[#FFFFFF] text-[#122A1F]";

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand/10 via-background/50 to-accent/10 px-4 py-8">
      <div className="w-full max-w-5xl rounded-[2.25rem] border border-border relative overflow-hidden shadow-xl animate-pulse">
        <div className="lg:min-h-[720px] lg:grid lg:grid-cols-[1.15fr_0.95fr] h-[560px]">
          <div className="lg:col-span-1 relative" style={{ background: BRAND_GRADIENT }}>
            <h2 className="absolute top-8 left-8 text-white font-bold text-2xl animate-pulse">
              YETAHF
            </h2>
          </div>
          <div className="lg:col-span-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md space-y-6">
              <div className={`h-8 w-32 rounded-t-xl bg-border animate-pulse`} />
              <div className="h-4 w-1/2 rounded-full bg-border animate-pulse mx-8 mt-6" />
              <div className="h-4 w-3/4 rounded-full bg-border animate-pulse mx-8 mt-4" />
              <div className="p-6 space-y-4">
                <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
                <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
                <div className="h-10 w-full rounded-lg bg-border animate-pulse" />
                <div className="h-12 w-3/4 rounded-lg bg-border animate-pulse" />
                <div className="h-4 w-1/2 rounded-full bg-border animate-pulse mx-auto mt-4" />
              </div>
              <div className={`h-4 w-full rounded-b-xl border-t border-border ${isCardDark}`} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Login Suspense boundary                                           */
/* ------------------------------------------------------------------ */

function LoginSuspenseBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      {children}
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Login Form                                                        */
/* ------------------------------------------------------------------ */

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notice = params.get("notice");
  const next = params.get("next") || "/dashboard";

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
  const shakeRef = useRef(0);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  /* Caps Lock detection on the password field */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    setCapsLock(e.getModifierState("CapsLock"));
  }, []);

  /* Shake input group on failed submit */
  const triggerShake = useCallback(() => {
    shakeRef.current = Date.now();
    setFailedAttempt((p) => p + 1);
  }, []);

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
        triggerShake();
        if (!email.trim()) emailRef.current?.focus();
        else passwordRef.current?.focus();
        return;
      }

      /* Play a brief success animation before navigating, so the "very good"
         moment feels intentional and rewarding rather than an instant jump. */
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to connect. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  JSX                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12 text-foreground">
      {/* ── Ambient background (reduced motion safe) ── */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[14%] -left-[14%] h-[52rem] w-[52rem] rounded-full bg-brand/20 blur-[140px] animate-pulse-slow" />
        <div className="absolute top-[30%] -right-[12%] h-[46rem] w-[46rem] rounded-full bg-accent/12 blur-[128px] animate-pulse-slow" style={{ animationDelay: "1.2s" }} />
        <div className="absolute -bottom-[12%] left-[28%] h-[40rem] w-[40rem] rounded-full bg-emerald-500/10 blur-[112px] animate-pulse-slow" style={{ animationDelay: "2.4s" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent/0 to-black/4" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2.25rem] border border-border border-solid shadow-2xl shadow-black/8 dark:shadow-black/30 bg-card transition-colors duration-300 lg:grid-cols-[1.15fr_0.95fr]">
        {/* ── Left · Brand canvas ── */}
        <section
          style={{ background: BRAND_GRADIENT }}
          className="relative isolate flex min-h-[500px] flex-col justify-between overflow-hidden px-10 py-12 text-white sm:px-14 sm:py-16 lg:min-h-[800px] lg:px-24 lg:py-24 fade-in-up"
        >
          {/* Glow ornaments */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-amber-500/20 blur-[96px] animate-pulse-slow" style={{ animationDelay: "0.6s" }} />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-64 w-64 rounded-full bg-brand/15 blur-[80px] animate-pulse-slow" style={{ animationDelay: "1.8s" }} />
          <div aria-hidden="true" className="pointer-events-none absolute top-1/3 right-16 -z-10 h-48 w-48 rounded-full bg-white/10 blur-[64px] animate-pulse-slow" style={{ animationDelay: "3s" }} />

          {/* Floating seal icon */}
          <div aria-hidden="true" className="relative z-20 absolute right-[22%] bottom-[20%] h-28 w-28 rounded-full bg-white/14 border border-white/20 flex items-center justify-center backdrop-blur-sm animate-float-slow">
            <IconShield size={32} className="text-amber-200/90 drop-shadow-[0_0_14px_rgba(234,179,8,0.35)]" />
          </div>

          <div className="relative z-20">
            <Link href="/" aria-label="YETAF Holding home" className="inline-flex items-center gap-2.5 rounded-2xl border border-white/13 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.17em] text-amber-200 backdrop-blur-xs transition-all hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60">
              <BrandLogo size="hero" priority />
              <span className="ml-3 hidden sm:inline text-[13px] font-semibold tracking-[0.05em]">YETAHF</span>
            </Link>

            <div className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/9 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(234,179,8,0.7)] animate-pulse-slow" />
              YETAF Holding · Executive Portal
            </div>

            <h1 className={`mt-8 max-w-[34rem] font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-[3.25rem] lg:text-5xl `} style={{ animationDelay: "120ms" }}>
              Clear direction.<br /><span className="italic text-amber-300/90 font-display">Connected execution.</span>
            </h1>

            <p className={`mt-5 max-w-lg text-sm leading-8 text-white/85 sm:text-base lg:max-w-md `} style={{ animationDelay: "220ms" }}>
              One trusted platform for executive directives, multi-task tracking,
              action plans, and subsidiary performance governance.
            </p>

            <div className={`mt-11 grid grid-cols-3 gap-1.5 sm:gap-2 `} style={{ animationDelay: "300ms" }}>
              {[["01", "Direction"], ["02", "Management"], ["03", "Operations"]].map(
                ([number, label]) => (
                  <div key={number} className="rounded-xl border border-white/13 bg-white/8 px-4 py-3.5 backdrop-blur-sm transition-all hover:bg-white/12 hover:border-white/25">
                    <p className="font-mono text-[10px] font-bold text-amber-300">{number}</p>
                    <p className="mt-1 text-[10px] sm:text-xs font-semibold text-white/90">{label}</p>
                  </div>
                ),
              )}
            </div>

            <div className={`mt-14 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-white/65 `} style={{ animationDelay: "380ms" }}>
              <span>Directive Follow-up System</span>
              <span>Report Follow-up Center</span>
            </div>
          </div>
        </section>

        {/* ── Right · Sign-in card ── */}
        <section className={`relative z-10 flex items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-18 lg:py-24 `} style={{ animationDelay: "100ms" }}>
          <div className="w-full max-w-md">
            {/* Header */}
            <div className={`mb-9 `} style={{ animationDelay: "160ms" }}>
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/7 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_14px_rgba(10,82,56,0.5)]" />
                Authorized Access
              </div>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-[2.5rem]">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enter your credentials to access the holding workspace.
              </p>
            </div>

            {/* Notice banner */}
            {notice === "no-signup" && (
              <div className="mb-7 flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/10 p-3.5 text-sm text-amber-900 dark:text-amber-200" role="status">
                <IconAlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>Public registration is disabled. Contact your administrator for access.</p>
              </div>
            )}

            {/* Caps Lock hint */}
            {capsLock && !error && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200/50 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-900/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                <IconAlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Caps Lock is on</span>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="mb-7 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-3.5 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20" role="alert">
                <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{error}</p>
                  {failedAttempt > 1 && (
                    <p className="mt-1 text-[11px] text-destructive/70">
                      Please check your email and password, then try again.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Success moment */}
            {success && (
              <div className="mb-9 flex flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-emerald-800 dark:text-emerald-200 dark:border-emerald-500/20 dark:bg-emerald-900/5 animate-zoom-in-95">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 mb-3 animate-pulse-slow">
                  <IconCheck size={26} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-semibold leading-tight text-center">Welcome back — signing you in…</p>
              </div>
            )}

            {/* Form */}
            {!success && (
              <form onSubmit={handleSubmit} className={`space-y-5 `} style={{ animationDelay: "220ms" }}>
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="login-email" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/85">
                    <IconUser size={14} className="text-muted-foreground/50" />
                    Corporate email
                  </label>
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
                    className="h-11 w-full rounded-xl border border-border bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-inner outline-none transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/85">
                      <IconLock size={14} className="text-muted-foreground/50" />
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={loading || success}
                      className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-xs font-semibold text-muted-foreground transition-all hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/10 disabled:opacity-50"
                    >
                      {showPassword ? (
                        <IconEyeOff size={13} className="text-muted-foreground" />
                      ) : (
                        <IconEye size={13} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <input
                    id="login-password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={loading || success}
                    className="h-11 w-full rounded-xl border border-border bg-background/40 px-4 text-sm text-foreground placeholder:text-muted-foreground/50 shadow-inner outline-none transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || success || (!email.trim() || !password)}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-0 text-sm font-semibold text-brand-foreground shadow-md shadow-brand/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/25 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none ${
                    loading ? "after:absolute after:inset-0 after:rounded-xl after:border-4 after:border-brand/30 after:animate-spin after:border-t-brand after:border-r-transparent" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {loading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    )}
                    {loading ? "Signing in…" : "Sign in securely"}
                  </span>
                </button>

                <div className="mt-9 flex items-center justify-center gap-2">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-brand hover:underline underline-offset-3"
                  >
                    <IconEnvelope size={12} className="text-muted-foreground" />
                    Forgot access
                  </Link>
                </div>
              </form>
            )}

            {/* Footer */}
            {!success && (
              <div className={`mt-12 flex items-center gap-2.5 text-[10px] text-muted-foreground `} style={{ animationDelay: "460ms" }}>
                <span className="h-px flex-1 bg-border" />
                <span>Authorized personnel only</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <p className="mt-7 text-center text-[11px] text-muted-foreground">
              Confidential internal system · YETAF Holding Limited
            </p>
          </div>
        </section>
      </div>

      {/* Theme toggle (top right) */}
      <div className="absolute top-6 right-6 z-30 sm:top-8 sm:right-8 lg:static lg:mt-0 lg:border-b lg:pb-8 lg:px-6 lg:block">
        <div className="flex flex-col items-end gap-1">
          <ThemeToggle
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:text-foreground dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>
      </div>
    </main>
  );
}
