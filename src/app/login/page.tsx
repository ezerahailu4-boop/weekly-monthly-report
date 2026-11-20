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
      if (!res.ok) { setError(data.error || "Invalid email or password."); return; }
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }

  function fillCredentials(type: "direction" | "admin" | "staff") {
    const creds = {
      direction: { email: "ceo@yetaf-holding.com" },
      admin: { email: "admin@yetaf-holding.com" },
      staff: { email: "operations@yetaf-holding.com" },
    };
    setEmail(creds[type].email);
    setPassword("");
    setError(null);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/20 blur-[120px] rounded-full -z-10" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-sm transition-transform hover:scale-105">
            <Image src="/logo.jpg" alt="YETAF" width={112} height={112} className="h-full w-full object-contain" priority />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              YETAF Holding
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Directive Follow-up System — Executive Sign-In
            </p>
          </div>
        </div>

        {/* No-signup notice */}
        {notice === "no-signup" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>Public registration is disabled. Contact your administrator for access.</p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm shadow-lg/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Corporate Email
              </label>
              <input
                type="email"
                required
                placeholder="name@yetaf-holding.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                className="flex h-10 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <IconEye size={12} />
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                className="flex h-10 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Role selector shortcut */}
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Sign-In
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  type: "direction",
                  label: "Direction",
                  sub: "Super Admin",
                  icon: IconCrown,
                  color: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20",
                },
                {
                  type: "admin",
                  label: "Admin",
                  sub: "Management",
                  icon: IconShield,
                  color: "border-brand bg-brand/10 text-brand hover:bg-brand/20 dark:border-brand/40 dark:bg-brand/20 dark:text-brand dark:hover:bg-brand/30",
                },
                {
                  type: "staff",
                  label: "Staff",
                  sub: "Employee",
                  icon: IconUser,
                  color: "border-green-200 bg-green-50 text-green-900 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200 dark:hover:bg-green-500/20",
                },
              ].map(({ type, label, sub, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => fillCredentials(type as "direction" | "admin" | "staff")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-colors ${color}`}
                >
                  <Icon size={16} />
                  <span className="font-semibold leading-none">{label}</span>
                  <span className="text-[10px] opacity-70 leading-none">{sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Confidential internal system · YETAF HOLDING LIMITED
        </p>
      </div>
    </div>
  );
}
