/** Parte pura (senza database) della numerazione progressiva dei documenti. */

export function parseDocumentNumber(number: string): {
  prefix: string;
  year: number;
  seq: number;
} | null {
  const match = number.match(/^(?:(?<prefix>[A-Z]+)-)?(?<year>\d{4})-(?<seq>\d+)$/);
  if (!match) return null;
  return {
    prefix: match.groups?.prefix || "",
    year: Number(match.groups?.year),
    seq: Number(match.groups?.seq),
  };
}

/** Visualizzazione uniforme (es. PRV-2026-003, 2026-003). */
export function formatSequentialDocumentNumber(
  number: string | null | undefined,
  options?: { padLength?: number; fallback?: string }
): string {
  if (!number?.trim()) return options?.fallback ?? "BOZZA";
  if (number.startsWith("BOZZA")) return number;
  const parsed = parseDocumentNumber(number.trim());
  if (!parsed) return number;
  const padLength = options?.padLength ?? 3;
  const seq = String(parsed.seq).padStart(padLength, "0");
  return parsed.prefix
    ? `${parsed.prefix}-${parsed.year}-${seq}`
    : `${parsed.year}-${seq}`;
}

/** Dato l'elenco dei numeri già usati, calcola il prossimo numero dell'anno. */
export function nextSequentialDocumentNumber(
  numbers: string[],
  year: number,
  options: {
    prefix?: string;
    padLength?: number;
    legacyPrefixes?: string[];
  } = {}
): string {
  const prefix = options.prefix?.trim() || "";
  const padLength = options.padLength ?? 3;
  const legacyPrefixes = options.legacyPrefixes ?? [];

  const prefixPattern =
    prefix || legacyPrefixes.length > 0
      ? `^(?:(?:${[prefix, ...legacyPrefixes].filter(Boolean).join("|")})-)?`
      : "^(?:FPR-)?";

  const max = numbers.reduce((highest, number) => {
    const match = number.match(
      new RegExp(`${prefixPattern}(\\d{4})-(\\d+)$`)
    );
    if (!match) return highest;
    if (Number(match[1]) !== year) return highest;
    return Math.max(highest, Number(match[2]));
  }, 0);

  const seq = String(max + 1).padStart(padLength, "0");
  return prefix ? `${prefix}-${year}-${seq}` : `${year}-${seq}`;
}
