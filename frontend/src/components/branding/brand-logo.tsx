"use client";

import { useState } from "react";
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
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={appName}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
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

  if (variant === "hero") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-lg",
        className
      )}
      aria-hidden
    >
      {letter}
    </div>
  );
}
