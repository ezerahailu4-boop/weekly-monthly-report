"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  IconAlertCircle,
  IconCrown,
  IconEye,
  IconShield,
  IconUser,
} from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
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
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }

      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
    }
  }

  function fillCredentials(type: "ceo" | "admin" | "staff") {
    if (type === "ceo") {
      setEmail("ceo@yetaf-holding.com");
      setPassword("YetafCeo2026!");
    } else if (type === "admin") {
      setEmail("admin@yetaf-holding.com");
      setPassword("YetafAdmin2026!");
    } else {
      setEmail("operations@yetaf-holding.com");
      setPassword("YetafStaff2026!");
    }
    setError(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 sm:px-6 py-12 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 w-12 rounded-xl overflow-hidden shadow-sm mb-3.5 transition-transform hover:scale-105 ring-1 ring-border bg-white"
          >
            <Image src="/logo.jpg" alt="YETAF Holding" width={96} height={96} className="object-contain w-full h-full" priority />
          </Link>
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <span>YETAF HOLDING</span>
            <span>&middot;</span>
            <span>Enterprise Portal</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Sign In to Your Workspace
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Executive &amp; department reporting. Powered by Neon PostgreSQL.
          </p>
        </div>

        {/* Notice Banner if redirected from signup */}
        {notice === "no-signup" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 shadow-xs">
            <IconAlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-100">Public Registration Is Disabled</p>
              <p className="mt-0.5 leading-relaxed">
                To uphold corporate data governance, staff accounts are provisioned exclusively
                by executive system administrators.
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Corporate Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@yetaf-holding.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IconEye size={13} />
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 shadow-2xs"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            >
              {loading ? "Verifying Credentials..." : "Sign In to Portal"}
            </button>
          </form>

          {/* Quick Role Switcher for Testing */}
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              1-Click Demo Accounts:
            </p>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials("ceo")}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-amber-900 dark:text-amber-200 shadow-2xs group"
              >
                <IconCrown size={14} className="text-amber-500 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[11px]">CEO</span>
                <span className="text-[9px] text-amber-800/80 dark:text-amber-300/80">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("admin")}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-muted/60 hover:bg-muted transition-all text-foreground shadow-2xs group"
              >
                <IconShield size={14} className="text-muted-foreground mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[11px]">Admin</span>
                <span className="text-[9px] text-muted-foreground">User Creator</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("staff")}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-emerald-900 dark:text-emerald-200 shadow-2xs group"
              >
                <IconUser size={14} className="text-emerald-600 dark:text-emerald-400 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[11px]">Staff</span>
                <span className="text-[9px] text-emerald-800/80 dark:text-emerald-300/80">Submitter</span>
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Need access? Contact your division head or IT administration.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Confidential internal system &middot; YETAF HOLDING LIMITED
        </p>
      </div>
    </div>
  );
}
