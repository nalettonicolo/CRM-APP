"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";

export function BrandingColorSync() {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  useEffect(() => {
    const primary = (data?.colors as { primary?: string })?.primary;
    if (!primary || typeof document === "undefined") return;
    document.documentElement.style.setProperty("--color-primary", primary);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", primary);
  }, [data]);

  return null;
}
