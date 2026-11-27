"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeProvider";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconEye,
  IconLock,
} from "@/components/Icons";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "No reset token provided.");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(token ? null : false);

  useEffect(() => {
    if (!token) return;
    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token || "")}`
        );
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError(data.error || "Invalid or expired reset token.");
          setTokenValid(false);
        } else {
          setTokenValid(true);
        }
      } catch {
        setError("Unable to verify reset token.");
        setTokenValid(false);
      }
    }
    verify();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tokenValid) {
      setError("This reset link is invalid or has expired.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset failed. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
    } catch (err: unknown) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Unable to reach the server."
      );
    }
  }

  if (!tokenValid) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden gradient-main">
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex flex-col items-center gap-4 text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto mb-6">
              <IconAlertCircle size={32} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Invalid Reset Link
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
              {error || "This password reset link is no longer valid. It may have expired or already been used."}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-all hover:bg-primary/90"
            >
              <IconArrowLeft size={14} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden gradient-main">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/15 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/15 blur-[120px] rounded-full -z-10" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" aria-label="YETAF Holding home" className="inline-flex rounded-2xl transition-transform hover:scale-[1.02]">
            <BrandLogo size="letterhead" priority />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              Reset Password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a new password for your YETAF HOLDING account.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm shadow-lg/20">
          {success ? (
            <div className="text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mx-auto mb-6">
                <IconCheck size={32} />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Password Reset
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your password has been reset successfully. You can now sign in with your new credentials.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-all hover:bg-primary/90"
              >
                <IconArrowLeft size={14} />
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="flex h-10 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
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
                {loading ? "Resetting..." : <><IconCheck size={14} /> Reset Password</>}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/90 transition-colors"
          >
            <IconLock size={13} className="text-brand" />
            Back to Sign In
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Confidential internal system · YETAF HOLDING LIMITED
        </p>
      </div>
    </div>
  );
}
