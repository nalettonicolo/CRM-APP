import type { Quote } from "@/lib/api";
import { formatDate, formatEventDateRange } from "@/lib/utils";

type QuoteLike = Pick<
  Quote,
  "title" | "eventAt" | "eventEndAt" | "eventLocation" | "validUntil" | "createdAt"
>;

/** Periodo di servizio (date evento). */
export function formatQuoteServicePeriod(
  quote: Pick<QuoteLike, "eventAt" | "eventEndAt">
): string {
  return formatEventDateRange(quote.eventAt, quote.eventEndAt) || "";
}

/** Riga sintetica per elenco preventivi. */
export function formatQuoteListSubtitle(quote: QuoteLike): string {
  const parts: string[] = [];
  const period = formatQuoteServicePeriod(quote);
  if (period) parts.push(period);
  if (quote.eventLocation?.trim()) parts.push(quote.eventLocation.trim());
  return parts.join(" · ");
}
