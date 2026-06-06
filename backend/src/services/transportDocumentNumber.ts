import { prisma } from "../lib/prisma.js";

export async function generateTransportDocumentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DDT-${year}-`;
  const rows = await prisma.transportDocument.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });

  let max = 0;
  const re = new RegExp(`^DDT-${year}-(\\d+)$`);
  for (const row of rows) {
    const m = row.number.match(re);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function formatTransportDocumentNumber(number: string): string {
  const m = number.match(/^DDT-(\d{4})-(\d+)$/);
  if (!m) return number;
  return `DDT-${m[1]}-${m[2].padStart(4, "0")}`;
}
