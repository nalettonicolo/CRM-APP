/**
 * Uniforma i numeri documenti cortesia storici:
 * - da FPR-YYYY-NNNN
 * - a  YYYY-NNN
 *
 * Dry-run (default):
 *   npm run db:normalize:invoice-numbers --workspace=backend
 *
 * Applica modifiche:
 *   npm run db:normalize:invoice-numbers --workspace=backend -- --apply
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

type InvoiceRow = {
  id: string;
  number: string;
  createdAt: Date;
};

function padSeq(seq: number): string {
  return String(seq).padStart(3, "0");
}

function parseLegacyNumber(number: string): { year: number; seq: number } | null {
  const match = number.match(/^FPR-(\d{4})-(\d+)$/);
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
}

function parseCurrentNumber(number: string): { year: number; seq: number } | null {
  const match = number.match(/^(\d{4})-(\d+)$/);
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
}

async function main() {
  const rows = (await prisma.invoicePreview.findMany({
    where: { number: { not: null } },
    select: { id: true, number: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })) as InvoiceRow[];

  if (rows.length === 0) {
    console.log("Nessun documento con numero da normalizzare.");
    return;
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const used = new Set(rows.map((row) => row.number));

  const updates: { id: string; from: string; to: string }[] = [];

  for (const row of rows) {
    const legacy = parseLegacyNumber(row.number);
    if (!legacy) continue;

    let candidate = `${legacy.year}-${padSeq(legacy.seq)}`;
    if (candidate === row.number) continue;

    if (used.has(candidate)) {
      const takenSeq = rows
        .map((r) => (r.id === row.id ? null : parseCurrentNumber(r.number)))
        .filter((v): v is { year: number; seq: number } => v !== null && v.year === legacy.year)
        .map((v) => v.seq);
      const maxSeq = takenSeq.length ? Math.max(...takenSeq) : 0;
      candidate = `${legacy.year}-${padSeq(maxSeq + 1)}`;
    }

    used.delete(row.number);
    used.add(candidate);
    rows.splice(rows.indexOf(row), 1, { ...row, number: candidate });
    byId.set(row.id, { ...row, number: candidate });
    updates.push({ id: row.id, from: row.number, to: candidate });
  }

  if (updates.length === 0) {
    console.log("Nessuna normalizzazione necessaria.");
    return;
  }

  console.log(`Documenti da aggiornare: ${updates.length}`);
  for (const item of updates) {
    console.log(`- ${item.from} -> ${item.to} (${item.id})`);
  }

  if (!APPLY) {
    console.log("\nDry-run completato. Esegui con --apply per salvare.");
    return;
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.invoicePreview.update({
        where: { id: item.id },
        data: { number: item.to },
      })
    )
  );

  console.log("\nNormalizzazione completata.");
}

main()
  .catch((error) => {
    console.error("Errore normalizzazione numeri documento:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

