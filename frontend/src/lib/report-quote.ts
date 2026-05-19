import type { Quote } from "@/lib/api";
import { quoteStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate, formatEventDateRange } from "@/lib/utils";

export function buildQuoteReferenceBlock(quote: Quote): string {
  const lines = [
    "--- Riferimento preventivo ---",
    `N. ${quote.number}`,
  ];
  if (quote.title?.trim()) {
    lines.push(`Oggetto: ${quote.title.trim()}`);
  }
  if (quote.eventLocation?.trim()) {
    lines.push(`Luogo: ${quote.eventLocation.trim()}`);
  }
  const eventRange = formatEventDateRange(quote.eventAt, quote.eventEndAt);
  if (eventRange) {
    lines.push(`Evento: ${eventRange}`);
  }
  if (quote.validUntil) {
    lines.push(`Validità: ${formatDate(quote.validUntil)}`);
  }
  lines.push(`Stato: ${quoteStatusLabels[quote.status] || quote.status}`);
  if (quote.total != null) {
    lines.push(`Importo: ${formatCurrency(quote.total)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function buildQuoteItemsBlock(quote: Quote): string {
  const items = quote.items ?? [];
  if (items.length === 0) {
    return "--- Dettaglio preventivo ---\n(Nessuna voce in elenco)\n---";
  }
  const lines = ["--- Dettaglio preventivo ---", `N. ${quote.number}`];
  if (quote.title?.trim()) {
    lines.push(quote.title.trim());
  }
  lines.push("");
  for (const item of items) {
    const qty = Number(item.quantity);
    const unit = item.unit ? ` ${item.unit}` : "";
    const price = formatCurrency(item.unitPrice);
    const lineTotal = formatCurrency(item.total);
    lines.push(
      `• ${item.description} — ${qty}${unit} × ${price} = ${lineTotal}`
    );
  }
  if (quote.total != null) {
    lines.push("", `Totale preventivo: ${formatCurrency(quote.total)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function appendToDescription(current: string, block: string): string {
  const trimmed = current.trim();
  if (!trimmed) return block;
  if (trimmed.includes(block)) return trimmed;
  return `${trimmed}\n\n${block}`;
}
