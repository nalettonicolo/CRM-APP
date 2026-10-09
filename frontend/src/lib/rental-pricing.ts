/** Prezzo noleggio €/gg = costo acquisto × (1 + markup%/100). */
export function rentalPriceFromCost(
  cost: number | string | null | undefined,
  markupPercent: number
): number | null {
  const base = Number(cost);
  if (!Number.isFinite(base) || base <= 0) return null;
  const markup = Number.isFinite(markupPercent) ? markupPercent : 0;
  return Math.round(base * (1 + markup / 100) * 100) / 100;
}

/** Alias usato dal catalogo noleggio. */
export const rentalUnitPriceFromCost = rentalPriceFromCost;
