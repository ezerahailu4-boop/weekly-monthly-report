import Image from "next/image";

type BrandLogoSize = "compact" | "nav" | "sidebar" | "letterhead" | "hero";

const sizes: Record<BrandLogoSize, string> = {
  compact: "h-10 w-10 p-1.5",
  nav: "h-10 w-[92px] px-1.5 py-1 sm:h-11 sm:w-[104px]",
  sidebar: "h-10 w-[88px] px-1.5 py-1 sm:h-11 sm:w-[98px]",
  letterhead: "h-14 w-[118px] px-2 py-1.5 sm:h-16 sm:w-[136px]",
  hero: "h-24 w-[218px] px-3 py-2 sm:h-28 sm:w-[260px]",
};

export function BrandLogo({
  size = "nav",
  priority = false,
  className = "",
  src,
}: {
  size?: BrandLogoSize;
  priority?: boolean;
  className?: string;
  src?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm ring-1 ring-black/[0.035] ${sizes[size]} ${className}`}
    >
      <Image
        src={src || "/logo.jpg"}
        alt={src ? "Company logo" : "YETAF Holding Limited"}
        fill
        priority={priority}
        sizes={size === "hero" ? "260px" : size === "letterhead" ? "136px" : "104px"}
        className="object-contain"
      />
    </span>
  );
}
