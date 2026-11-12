"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { IconAlertCircle, IconCrown, IconEye, IconShield, IconUser } from "@/components/Icons";
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

  function fillCredentials(type: "ceo" | "admin" | "staff") {
    const creds = {
      ceo: { email: "ceo@yetaf-holding.com", password: "YetafCeo2026!" },
      admin: { email: "admin@yetaf-holding.com", password: "YetafAdmin2026!" },
      staff: { email: "operations@yetaf-holding.com", password: "YetafStaff2026!" },
    };
    setEmail(creds[type].email);
    setPassword(creds[type].password);
    setError(null);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border shadow-sm transition-transform hover:scale-105">
            <Image src="/logo.jpg" alt="YETAF" width={96} height={96} className="h-full w-full object-contain" priority />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your YETAF Holding workspace</p>
          </div>
        </div>

        {/* No-signup notice */}
        {notice === "no-signup" && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>Public registration is disabled. Contact your administrator for access.</p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                required
                placeholder="name@yetaf-holding.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-3 text-xs font-medium text-muted-foreground">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "ceo" as const, label: "CEO", sub: "Super Admin", icon: IconCrown, color: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20" },
                { type: "admin" as const, label: "Admin", sub: "Manager", icon: IconShield, color: "border-border bg-muted/50 text-foreground hover:bg-muted" },
                { type: "staff" as const, label: "Staff", sub: "Employee", icon: IconUser, color: "border-green-200 bg-green-50 text-green-900 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200 dark:hover:bg-green-500/20" },
              ].map(({ type, label, sub, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => fillCredentials(type)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-colors ${color}`}
                >
                  <Icon size={14} />
                  <span className="font-semibold">{label}</span>
                  <span className="text-[10px] opacity-70">{sub}</span>
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
