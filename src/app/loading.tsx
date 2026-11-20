export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl animate-pulse">📊</span>
          </div>
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-medium text-foreground tracking-wider">
          YETAF HOLDING
        </p>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Loading Executive Portal…
        </p>
      </div>
    </div>
  );
}
