"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import {
  DEFAULT_APP_NAME,
  mergeSiteHome,
  publicAssetUrl,
} from "@/lib/branding";

export function BrandingHeadSync() {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!data) return;

    const name = (
      (data.app_name as { name?: string })?.name || DEFAULT_APP_NAME
    ).trim();
    document.title = `${name} — gestionale interno`;

    const sub = mergeSiteHome(data.site_home).subheadline;
    const metaDesc = sub.length > 160 ? `${sub.slice(0, 157)}…` : sub;

    let descEl = document.querySelector('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement("meta");
      descEl.setAttribute("name", "description");
      document.head.appendChild(descEl);
    }
    descEl.setAttribute("content", metaDesc);

    const favUrl = (data.favicon as { url?: string })?.url?.trim();
    const href = favUrl ? publicAssetUrl(favUrl) : "";
    if (href) {
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "icon");
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    }
  }, [data]);

  return null;
}
