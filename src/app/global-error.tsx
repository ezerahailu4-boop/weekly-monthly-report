"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const ERROR_REPORT_URL = process.env.NEXT_PUBLIC_ERROR_REPORT_URL;

function generateErrorId(): string {
  return `yh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function reportError(params: {
  errorId: string;
  message: string;
  stack?: string | null;
  url: string;
  timestamp: string;
}) {
  if (!ERROR_REPORT_URL) return;
  try {
    await fetch(ERROR_REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }).catch(() => {
      // Silently ignore reporting failures — never crash the error page itself.
    });
  } catch {
    // ignore
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const [logged, setLogged] = useState(false);
  const [errorId] = useState(generateErrorId);

  const handleLog = useCallback(() => {
    if (logged) return;
    const timestamp = new Date().toISOString();
    console.error("Global error caught:", {
      errorId,
      message: error.message,
      stack: error.stack,
      url: typeof window !== "undefined" ? window.location.href : "",
      timestamp,
    });
    reportError({
      errorId,
      message: error.message,
      stack: error.stack ?? null,
      url: typeof window !== "undefined" ? window.location.href : "",
      timestamp,
    });
    setLogged(true);
  }, [error, logged, errorId]);

  useEffect(() => {
    handleLog();
  }, [handleLog]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6 mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="text-lg text-muted-foreground max-w-sm mx-auto mb-6">
          An unexpected error occurred in the executive portal.
        </p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
          Reference: <span className="font-mono">{errorId}</span>
        </p>
        <button
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-all hover:bg-primary/90"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
