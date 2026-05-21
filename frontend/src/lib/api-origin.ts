/**
 * Base URL per le chiamate API dal browser.
 * Su Netlify usa lo stesso dominio del sito → rewrite Next verso Mint (evita CORS e 404 spurie).
 * Logo/upload restano su publicAssetUrl con NEXT_PUBLIC_API_URL assoluto.
 */
export function getApiOrigin(): string {
  const env =
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:4000";

  if (typeof window === "undefined") {
    return env;
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return env;
  }
  if (hostname.endsWith(".netlify.app")) {
    return origin;
  }
  return env;
}

export function apiUrl(path: string): string {
  const base = getApiOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}/api${p}`;
}
