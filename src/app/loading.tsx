import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Image
            src="/logo.jpg"
            alt="YETAF HOLDING"
            width={48}
            height={48}
            priority
            className="h-12 w-auto animate-pulse rounded-lg shadow-sm border border-border/60"
            draggable={false}
          />
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
