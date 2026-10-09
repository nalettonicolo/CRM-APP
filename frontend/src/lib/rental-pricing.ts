/** Prezzo noleggio suggerito = costo acquisto × (1 + markup%/100). */
export function rentalPriceFromCost(
  cost: number | string | null | undefined,
  markupPercent: number
): number | null {
  const c = Number(cost);
  if (!Number.isFinite(c) || c <= 0) return null;
  const m = Number.isFinite(markupPercent) ? markupPercent : 0;
  return Math.round(c * (1 + m / 100) * 100) / 100;
}

/** Alias esplicito. */
export const rentalUnitPriceFromCost = rentalPriceFromCost;
