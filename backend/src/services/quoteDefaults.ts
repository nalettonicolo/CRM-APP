import { prisma } from "../lib/prisma.js";

export type QuoteDefaults = {
  withholdingTaxPercent: number;
  stampDutyAmount: number;
  /** Markup % sul costo acquisto → prezzo noleggio €/gg suggerito. */
  defaultRentalMarkupPercent: number;
};

const FALLBACK: QuoteDefaults = {
  withholdingTaxPercent: 0,
  stampDutyAmount: 0,
  defaultRentalMarkupPercent: 30,
};

/** Default ritenuta / marca da bollo / markup noleggio (Impostazioni → quote_defaults). */
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
