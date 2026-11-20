export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center px-6"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    </div>
  );
}
