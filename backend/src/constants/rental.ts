/** Unità predefinita per articoli a noleggio (prezzo al giorno). */
export const RENTAL_UNIT = "gg";

export const RENTAL_CATEGORY_PREFIX = "Noleggio";

export function isRentalCategory(category?: string | null): boolean {
  if (!category?.trim()) return false;
  return category.trim().toLowerCase().startsWith(RENTAL_CATEGORY_PREFIX.toLowerCase());
}
