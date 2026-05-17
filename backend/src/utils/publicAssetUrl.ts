import { config } from "../config/index.js";

/** URL assoluto per file in /uploads (home pubblica, email, PDF). */
export function toPublicAssetUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl?.trim()) return "";
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = config.apiUrl.replace(/\/$/, "");
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

export function withAbsoluteAssetUrls(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...settings };
  for (const key of ["logo", "favicon"] as const) {
    const raw = out[key];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const rec = raw as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url : "";
      if (url) {
        out[key] = { ...rec, url: toPublicAssetUrl(url) };
      }
    }
  }
  return out;
}
