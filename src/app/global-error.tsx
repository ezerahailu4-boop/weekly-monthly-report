"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (!logged) {
      console.error("Global error caught:", error);
      setLogged(true);
    }
  }, [error, logged]);

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
