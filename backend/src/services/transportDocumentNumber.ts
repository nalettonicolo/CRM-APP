import { prisma } from "../lib/prisma.js";
import { nextTransportDocumentNumber } from "./transportDocumentFormat.js";

export { formatTransportDocumentNumber } from "./transportDocumentFormat.js";

export async function generateTransportDocumentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DDT-${year}-`;
  const rows = await prisma.transportDocument.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });

  return nextTransportDocumentNumber(
    rows.map((row) => row.number),
    year
  );
}
