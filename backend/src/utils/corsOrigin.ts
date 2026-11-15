/** Origini https://*.netlify.app (produzione + deploy preview). */
const netlifyOrigin =
  /^https:\/\/([a-z0-9][a-z0-9-]*\.)?netlify\.app$/i;

/**
 * Decide se un'origine CORS è accettata.
 * Le origini *.netlify.app sono accettate solo con ALLOW_NETLIFY_PREVIEWS=true:
 * chiunque può registrare un sito su netlify.app, quindi senza questo
 * interruttore qualunque sito altrui potrebbe chiamare l'API con i cookie.
 */
export function isAllowedOrigin(
  origin: string | undefined,
  corsOrigins: string[],
  allowNetlifyPreviews: boolean
): boolean {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  return allowNetlifyPreviews && netlifyOrigin.test(origin);
}
