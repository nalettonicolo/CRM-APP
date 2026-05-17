"use client";

import { cn } from "@/lib/utils";
import { publicAssetUrl } from "@/lib/branding";

type BrandLogoProps = {
  logoUrl?: string | null;
  appName: string;
  variant?: "nav" | "hero";
  className?: string;
};

export function BrandLogo({
  logoUrl,
  appName,
  variant = "nav",
  className,
}: BrandLogoProps) {
  const src = publicAssetUrl(logoUrl);
  const letter = appName.charAt(0).toUpperCase() || "N";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={appName}
        className={cn(
          "object-contain",
          variant === "nav" && "h-11 w-auto max-w-[180px]",
          variant === "hero" &&
            "mx-auto h-auto w-full max-w-sm object-contain drop-shadow-md sm:max-w-md lg:max-w-lg",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-primary font-bold text-white shadow-lg",
        variant === "nav" && "h-11 w-11 shrink-0 text-sm",
        variant === "hero" && "mx-auto h-28 w-28 text-4xl sm:h-36 sm:w-36 sm:text-5xl",
        className
      )}
      aria-hidden
    >
      {letter}
    </div>
  );
}
