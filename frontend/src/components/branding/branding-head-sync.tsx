"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import { DEFAULT_APP_NAME, mergeSiteHome } from "@/lib/branding";

function ensureHeadIcon(rel: string, href: string, sizes: string) {
  let link = document.querySelector(`link[rel='${rel}']`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
  link.setAttribute("sizes", sizes);
}

export function BrandingHeadSync() {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });

  useEffect(() => {
    if (!data) return;

    const name = (
      (data.app_name as { name?: string })?.name || DEFAULT_APP_NAME
    ).trim();
    document.title = `${name} — tecnico audio e luci`;

    const sub = mergeSiteHome(data.site_home).subheadline;
    const metaDesc = sub.length > 160 ? `${sub.slice(0, 157)}…` : sub;

    let descEl = document.querySelector('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement("meta");
      descEl.setAttribute("name", "description");
      document.head.appendChild(descEl);
    }
    descEl.setAttribute("content", metaDesc);

    ensureHeadIcon("apple-touch-icon", "/apple-touch-icon.png", "180x180");
    ensureHeadIcon("icon", "/favicon.png", "32x32");
  }, [data]);

  return null;
}
