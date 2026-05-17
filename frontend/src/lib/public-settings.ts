import { DEFAULT_APP_NAME, mergeSiteHome, publicAssetUrl } from "@/lib/branding";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export type PublicSettings = Record<string, unknown>;

export async function fetchPublicSettingsServer(): Promise<PublicSettings | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/settings/public`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicSettings;
  } catch {
    return null;
  }
}

export function getAppName(data: PublicSettings | null | undefined): string {
  const name = (data?.app_name as { name?: string })?.name;
  return (typeof name === "string" ? name.trim() : "") || DEFAULT_APP_NAME;
}

export function getLogoPath(data: PublicSettings | null | undefined): string {
  const fromApi = (data?.logo as { url?: string })?.url;
  const envLogo = process.env.NEXT_PUBLIC_LOGO_URL?.trim();
  return publicAssetUrl(fromApi || envLogo || "");
}

export function getSiteHome(data: PublicSettings | null | undefined) {
  return mergeSiteHome(data?.site_home);
}

export function getCompany(data: PublicSettings | null | undefined) {
  return (data?.company as Record<string, string>) || {};
}
