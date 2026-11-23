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
      {/* Decorative gold orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/15 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-emerald-600/10 blur-[110px]" />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#D9CBA9] bg-white shadow-2xl shadow-black/20 dark:border-[#414548] dark:bg-[#292D30] lg:grid-cols-[1.04fr_0.96fr]">
        {/* Left · brand panel */}
        <section style={{ background: "linear-gradient(135deg, #063D2B 0%, #0D6344 100%)" }} className="relative isolate flex min-h-[400px] flex-col justify-between overflow-hidden px-8 py-10 text-white sm:px-12 sm:py-14 lg:min-h-[700px] lg:px-16 lg:py-18">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
          <div>
            <Link href="/" aria-label="YETAF Holding home" className="inline-flex rounded-2xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              <BrandLogo size="hero" priority />
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F0C875]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0C875]" />
              YETAF Holding · Secure Workspace
            </div>
            <h1 className="mt-5 max-w-xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Clear direction.<br />
              Connected execution.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/90 sm:text-base sm:leading-7">
              One trusted place for corporate directives, action plans, and subsidiary performance reporting.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-3">
            {[["01", "Direction"], ["02", "Management"], ["03", "Teams"]].map(([number, label]) => (
              <div key={number} className="rounded-xl border border-white/25 bg-white/10 px-4 py-4">
                <p className="font-mono text-[10px] text-[#F0C875]">{number}</p>
                <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-[10px] font-medium uppercase tracking-[0.16em] text-white/75">
            Directive Follow-up System
          </p>
        </section>

        {/* Right · sign-in card */}
        <section className="flex items-center justify-center bg-white px-6 py-10 text-[#19372D] dark:bg-[#292D30] dark:text-[#F5F3ED] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08704A] dark:text-[#83D7AE]">Welcome back</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#153D30] dark:text-[#F5F3ED]">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52635B] dark:text-[#D0D5D1]">
                Use your corporate credentials to continue to the holding workspace.
              </p>
            </div>

            {notice === "no-signup" && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#A77C24] bg-[#FFF5D8] p-3.5 text-sm text-[#493711] dark:border-[#8B6B2F] dark:bg-[#39311F] dark:text-[#F5E5B8]" role="status">
                <IconAlertCircle size={17} className="mt-0.5 shrink-0 text-[#805D12] dark:text-[#F0C875]" />
                <p>Public registration is disabled. Contact your administrator for access.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-xs font-semibold text-[#263A31] dark:text-[#F0F1ED]">Corporate email</label>
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
                  className="h-12 w-full rounded-xl border border-[#89978E] bg-white px-4 text-sm text-[#182C23] shadow-sm outline-none transition placeholder:text-[#65736B] focus:border-[#08704A] focus:ring-4 focus:ring-[#08704A]/20 dark:border-[#78847D] dark:bg-[#202522] dark:text-white dark:placeholder:text-[#BBC3BD] dark:focus:border-[#83D7AE]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-semibold text-[#263A31] dark:text-[#F0F1ED]">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-pressed={showPassword}
                    className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-[#52635B] transition hover:text-[#08704A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08704A] dark:text-[#D0D5D1] dark:hover:text-[#83D7AE] dark:focus-visible:ring-[#83D7AE]"
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
                  className="h-12 w-full rounded-xl border border-[#89978E] bg-white px-4 text-sm text-[#182C23] shadow-sm outline-none transition placeholder:text-[#65736B] focus:border-[#08704A] focus:ring-4 focus:ring-[#08704A]/20 dark:border-[#78847D] dark:bg-[#202522] dark:text-white dark:placeholder:text-[#BBC3BD] dark:focus:border-[#83D7AE]"
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
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#08704A] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-[#065B3C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#08704A]/35 disabled:pointer-events-none disabled:opacity-60"
              >
                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-warm-cream/50" />}
                {loading ? "Signing in…" : "Sign in securely"}
              </button>

              <div className="mt-5 flex items-center gap-3 justify-center">
                  <Link
                  href="/forgot-password"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#52635B] transition-colors underline-offset-4 hover:text-[#08704A] hover:underline dark:text-[#D0D5D1] dark:hover:text-[#83D7AE]"
                >
                  <IconEnvelope size={13} className="text-[#52635B] dark:text-[#D0D5D1]" />
                  Forgot Access
                </Link>
              </div>
            </form>

            <div className="mt-7 flex items-center gap-3 text-[11px] text-[#52635B] dark:text-[#D0D5D1]">
              <span className="h-px flex-1 bg-[#D9E0DA] dark:bg-[#59625D]" />
              <span>Authorized personnel only</span>
              <span className="h-px flex-1 bg-[#D9E0DA] dark:bg-[#59625D]" />
            </div>
            <p className="mt-5 text-center text-[11px] text-[#52635B] dark:text-[#D0D5D1]">Confidential internal system · YETAF Holding Limited</p>
          </div>
        </section>
      </div>
    </main>
  );
}
