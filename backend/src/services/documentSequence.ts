import { prisma } from "../lib/prisma.js";
import { ValidationError } from "../utils/errors.js";

export type DocumentEntityType = "invoice" | "quote" | "report";

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

const LOG_ENTITY_BY_TYPE: Record<DocumentEntityType, string> = {
  invoice: "invoice",
  quote: "quote",
  report: "report",
};

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

/** Prossimo numero progressivo per anno (stessa logica per fatture e preventivi). */
export async function generateSequentialDocumentNumber(
  entityType: DocumentEntityType,
  options: {
    prefix?: string;
    padLength?: number;
    legacyPrefixes?: string[];
  } = {}
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = options.prefix?.trim() || "";
  const padLength = options.padLength ?? 3;
  const legacyPrefixes = options.legacyPrefixes ?? [];

  const existing = await fetchActiveNumbers(entityType, prefix ? `${prefix}-${year}-` : `${year}-`);
  const bareYearExisting =
    prefix && entityType === "quote"
      ? await fetchActiveNumbers(entityType, `${year}-`)
      : [];
  const legacyExisting = await Promise.all(
    legacyPrefixes.map((legacy) =>
      fetchActiveNumbers(entityType, `${legacy}-${year}-`)
    )
  );
  const deletedLogs = await prisma.activityLog.findMany({
    where: {
      entityType: LOG_ENTITY_BY_TYPE[entityType],
      action: "DELETE",
    },
    select: { details: true },
  });

  const numbers = [
    ...existing,
    ...bareYearExisting,
    ...legacyExisting.flat(),
    ...deletedLogs
      .map((log) =>
        log.details &&
        typeof log.details === "object" &&
        !Array.isArray(log.details) &&
        "number" in log.details
          ? String(log.details.number)
          : ""
      )
      .filter(Boolean),
  ];

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

async function fetchActiveNumbers(
  entityType: DocumentEntityType,
  prefix: string
): Promise<string[]> {
  if (entityType === "invoice") {
    const rows = await prisma.invoicePreview.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    });
    return rows
      .map((row) => row.number)
      .filter((number): number is string => typeof number === "string");
  }
  if (entityType === "quote") {
    const rows = await prisma.quote.findMany({
      where: { number: { startsWith: prefix } },
      select: { number: true },
    });
    return rows.map((row) => row.number);
  }
  const rows = await prisma.interventionReport.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });
  return rows.map((row) => row.number);
}

export async function hasSubsequentDocumentNumber(
  entityType: DocumentEntityType,
  documentNumber: string
): Promise<boolean> {
  const parsed = parseDocumentNumber(documentNumber);
  // Legacy/custom numbering must not block date edits.
  if (!parsed) return false;

  const prefix = parsed.prefix
    ? `${parsed.prefix}-${parsed.year}-`
    : `${parsed.year}-`;
  const active = await fetchActiveNumbers(entityType, prefix);

  return active.some((number) => {
    const candidate = parseDocumentNumber(number);
    return (
      candidate &&
      candidate.prefix === parsed.prefix &&
      candidate.year === parsed.year &&
      candidate.seq > parsed.seq
    );
  });
}

export async function canEditDocumentCreatedAt(
  entityType: DocumentEntityType,
  documentNumber: string
): Promise<boolean> {
  return !(await hasSubsequentDocumentNumber(entityType, documentNumber));
}

export async function assertCanEditDocumentCreatedAt(
  entityType: DocumentEntityType,
  documentNumber: string,
  currentCreatedAt: Date,
  nextCreatedAt: Date | undefined
): Promise<void> {
  if (!nextCreatedAt) return;
  if (nextCreatedAt.getTime() === currentCreatedAt.getTime()) return;

  const allowed = await canEditDocumentCreatedAt(entityType, documentNumber);
  if (!allowed) {
    throw new ValidationError(
      "Non è possibile modificare la data di emissione: esiste già un documento con numero progressivo successivo."
    );
  }
}
