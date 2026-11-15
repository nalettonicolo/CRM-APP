/** Valori di prova (default del codice e di .env.example) vietati in produzione. */
const TEST_VALUES = new Set([
  "dev-secret-change-in-production-min-32",
  "dev-refresh-secret-change-in-production-min-32",
  "your-super-secret-jwt-key-min-32-chars",
  "your-super-secret-refresh-key-min-32-chars",
  "Admin123!",
]);

const REQUIRED_IN_PRODUCTION = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "ADMIN_PASSWORD",
] as const;

/** Nomi delle variabili mancanti o con valore di prova (mai i valori). */
export function findInsecureProductionSettings(
  env: Record<string, string | undefined>
): string[] {
  if (env.NODE_ENV !== "production") return [];
  return REQUIRED_IN_PRODUCTION.filter((name) => {
    const value = env[name]?.trim();
    return !value || TEST_VALUES.has(value);
  });
}

/** Ferma l'avvio se in produzione mancano segreti o hanno valori di prova. */
export function assertProductionSecrets(
  env: Record<string, string | undefined>
): void {
  const bad = findInsecureProductionSettings(env);
  if (bad.length > 0) {
    throw new Error(
      `Avvio bloccato (NODE_ENV=production): imposta nel file .env valori reali e segreti per ${bad.join(
        ", "
      )}. Sono mancanti oppure hanno il valore di prova.`
    );
  }
}
