"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeProvider";
import {
  IconArrowLeft,
  IconLock,
  IconMail,
} from "@/components/Icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Request failed. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSent(true);
    } catch (err: unknown) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Unable to reach the server."
      );
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-12 overflow-hidden gradient-main">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"><ThemeToggle /></div>

      {/* Background glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/15 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/15 blur-[120px] rounded-full -z-10" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <Link href="/" aria-label="YETAF Holding home" className="inline-flex rounded-2xl transition-transform hover:scale-[1.02]">
            <BrandLogo size="letterhead" priority />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              Forgot Access
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Request a password reset — an administrator will review and respond.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm shadow-lg/20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mx-auto mb-6">
              <IconMail size={32} />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Request Sent
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
              If an account exists for {sent ? email : "this email"}, an
              administrator has been notified and will review your request.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-all hover:bg-primary/90"
            >
              <IconArrowLeft size={14} />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm shadow-lg/20">
            {error && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className="flex h-10 w-full rounded-xl border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? "Sending Request..." : "Request Reset"}
              </button>

              <p className="text-[11px] text-muted-foreground text-center uppercase tracking-wider">
                An admin will review your request via Telegram
              </p>
            </form>

            <div className="mt-8 border-t border-border pt-6">
              <div className="flex gap-4">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/90 transition-colors"
                >
                  <IconLock size={13} className="text-brand" />
                  Remember credentials? Sign In
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Confidential internal system · YETAF HOLDING LIMITED
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
