import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-xl text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6 mx-auto">
          <span className="text-3xl">📄</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Page Not Found
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          The page you&rsquo;re looking for doesn&rsquo;t exist. It may have been moved or deleted.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-all hover:bg-primary/90"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
