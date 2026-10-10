import { prisma } from "../lib/prisma.js";

export type QuoteDefaults = {
  withholdingTaxPercent: number;
  stampDutyAmount: number;
  /** % del prezzo di acquisto → prezzo noleggio €/gg (tipico 2–5). */
  defaultRentalMarkupPercent: number;
};

const FALLBACK: QuoteDefaults = {
  withholdingTaxPercent: 0,
  stampDutyAmount: 0,
  defaultRentalMarkupPercent: 3,
};

/** Default ritenuta / marca da bollo / percentuale noleggio (Impostazioni → quote_defaults). */
export async function getQuoteDefaults(): Promise<QuoteDefaults> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "quote_defaults" } });
    if (!row?.value || typeof row.value !== "object" || Array.isArray(row.value)) {
      return FALLBACK;
    }
    const raw = row.value as Record<string, unknown>;
    return {
      withholdingTaxPercent: Number(raw.withholdingTaxPercent) || 0,
      stampDutyAmount: Number(raw.stampDutyAmount) || 0,
      defaultRentalMarkupPercent:
        raw.defaultRentalMarkupPercent != null
          ? Number(raw.defaultRentalMarkupPercent) || 0
          : FALLBACK.defaultRentalMarkupPercent,
    };
  } catch {
    return FALLBACK;
  }
}
