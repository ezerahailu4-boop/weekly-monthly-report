export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Page not found
        </h1>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <a
        href="/dashboard"
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        Back to dashboard
      </a>
    </div>
  );
}
