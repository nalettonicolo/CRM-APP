"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { publicAssetUrl } from "@/lib/branding";

type BrandLogoProps = {
  logoUrl?: string | null;
  appName: string;
  variant?: "nav" | "hero";
  /** Hero: bagliore, respiro e luce (rispetta prefers-reduced-motion). */
  animated?: boolean;
  className?: string;
};

export function BrandLogo({
  logoUrl,
  appName,
  variant = "nav",
  animated = false,
  className,
}: BrandLogoProps) {
  const src = publicAssetUrl(logoUrl);
  const letter = appName.charAt(0).toUpperCase() || "N";
  const [failed, setFailed] = useState(false);

  const imgClass = cn(
    "object-contain",
    variant === "nav" && "h-11 w-auto max-w-[180px]",
    variant === "hero" &&
      "mx-auto h-auto w-[min(72vw,11rem)] max-w-none object-contain sm:max-w-xs md:max-w-sm lg:max-w-md",
    animated && variant === "hero" && "logo-hero-img",
    !animated && variant === "hero" && "drop-shadow-md"
  );

  if (src && !failed) {
    if (animated && variant === "hero") {
      return (
        <div
          className={cn(
            "logo-hero-animated relative mx-auto inline-block max-w-full",
            className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={appName}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={imgClass}
          />
          <span className="logo-hero-shine" aria-hidden />
          <span className="logo-hero-rays" aria-hidden />
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={appName}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(imgClass, className)}
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
