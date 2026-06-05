import type { Product } from "@/lib/api";

export const RENTAL_UNIT = "gg";
export const RENTAL_CATEGORY_PREFIX = "Noleggio";

export const RENTAL_CATEGORY_OPTIONS = [
  "Noleggio",
  "Noleggio - Audio",
  "Noleggio - Luci",
  "Noleggio - Video",
  "Noleggio - Strutture",
] as const;

export function isRentalProduct(p: Pick<Product, "isRentable" | "category">): boolean {
  if (p.isRentable) return true;
  const c = p.category?.trim().toLowerCase();
  return Boolean(c?.startsWith(RENTAL_CATEGORY_PREFIX.toLowerCase()));
}
