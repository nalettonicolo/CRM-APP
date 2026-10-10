/** Prezzo noleggio €/gg = prezzo acquisto × (percentuale / 100). Es. 100 € × 3% = 3 €. */
export function rentalPriceFromCost(
  cost: number | string | null | undefined,
  percent: number
): number | null {
  const base = Number(cost);
  if (!Number.isFinite(base) || base <= 0) return null;
  const rate = Number.isFinite(percent) ? percent : 0;
  return Math.round(base * (rate / 100) * 100) / 100;
}

/** Alias usato dal catalogo noleggio. */
export const rentalUnitPriceFromCost = rentalPriceFromCost;

/** Percentuale implicita da prezzo noleggio e costo acquisto (modifica preventivo). */
export function rentalMarkupFromPrice(
  cost: number | string | null | undefined,
  unitPrice: number
): number | null {
  const base = Number(cost);
  if (!Number.isFinite(base) || base <= 0) return null;
  if (!Number.isFinite(unitPrice)) return null;
  return Math.round((unitPrice / base) * 100 * 100) / 100;
}
