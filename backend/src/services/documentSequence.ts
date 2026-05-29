import { prisma } from "../lib/prisma.js";
import { ValidationError } from "../utils/errors.js";

export type DocumentEntityType = "invoice" | "quote" | "report";

export function parseDocumentNumber(number: string): {
  prefix: string;
  year: number;
  seq: number;
} | null {
  const match = number.match(/^([A-Z]+)-(\d{4})-(\d+)$/);
  if (!match) return null;
  return {
    prefix: match[1]!,
    year: Number(match[2]),
    seq: Number(match[3]),
  };
}

function extractNumberFromDeleteLog(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  if (!("number" in details)) return null;
  return String(details.number);
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
    return rows.map((row) => row.number);
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

async function fetchDeletedNumbers(
  entityType: DocumentEntityType,
  prefix: string
): Promise<string[]> {
  const logs = await prisma.activityLog.findMany({
    where: { entityType, action: "DELETE" },
    select: { details: true },
  });
  return logs
    .map((log) => extractNumberFromDeleteLog(log.details))
    .filter((number): number is string => number !== null && number.startsWith(prefix));
}

export async function hasSubsequentDocumentNumber(
  entityType: DocumentEntityType,
  documentNumber: string
): Promise<boolean> {
  const parsed = parseDocumentNumber(documentNumber);
  if (!parsed) return true;

  const prefix = `${parsed.prefix}-${parsed.year}-`;
  const [active, deleted] = await Promise.all([
    fetchActiveNumbers(entityType, prefix),
    fetchDeletedNumbers(entityType, prefix),
  ]);

  return [...active, ...deleted].some((number) => {
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
