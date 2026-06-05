/** Sanitizzazione e parsing sicuro dei parametri query (anti LIKE-wildcard e input malformati). */

const LIKE_WILDCARD_RE = /[\0%_]/g;
const SUSPICIOUS_ID_RE = /['";\\]|--|\/\*/;

export function sanitizeSearchTerm(raw: unknown, maxLength = 120): string {
  return String(raw ?? "")
    .trim()
    .slice(0, maxLength)
    .replace(LIKE_WILDCARD_RE, "");
}

export function parsePagination(
  page: unknown,
  limit: unknown,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {}
) {
  const basePage = defaults.page ?? 1;
  const baseLimit = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 100;

  const pageNum = Math.max(1, Number.parseInt(String(page ?? basePage), 10) || basePage);
  const take = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(String(limit ?? baseLimit), 10) || baseLimit)
  );

  return { page: pageNum, take, skip: (pageNum - 1) * take };
}

export function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value);
  return (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
}

/** ID da query string: trim, lunghezza massima, scarta pattern SQL-like (defense in depth). */
export function optionalId(value: unknown, maxLength = 64): string | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value).trim().slice(0, maxLength);
  if (!s || SUSPICIOUS_ID_RE.test(s)) return undefined;
  return s;
}

export function parseOptionalDate(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined;
  const d = new Date(String(value).trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function prismaContains(term: unknown, maxLength = 120) {
  const sanitized = sanitizeSearchTerm(term, maxLength);
  if (!sanitized) return undefined;
  return { contains: sanitized, mode: "insensitive" as const };
}

export function buildOrContains(
  term: unknown,
  fields: string[],
  maxLength = 120
): Record<string, { contains: string; mode: "insensitive" }>[] | undefined {
  const filter = prismaContains(term, maxLength);
  if (!filter) return undefined;
  return fields.map((field) => ({ [field]: filter }));
}
