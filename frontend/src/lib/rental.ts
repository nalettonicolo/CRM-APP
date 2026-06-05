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

/** AUD = audio, LUC = luci, NOL = altro noleggio, PRD = vendita */
export function skuPrefixForCategory(category?: string | null): string {
  const c = category?.trim().toLowerCase() ?? "";
  if (c.includes("audio") || c === "audio") return "AUD";
  if (c.includes("luci") || c === "luci" || c.includes("luce")) return "LUC";
  if (c.startsWith("noleggio")) return "NOL";
  return "PRD";
}

export function isRentalProduct(p: Pick<Product, "isRentable" | "category">): boolean {
  if (p.isRentable) return true;
  const c = p.category?.trim().toLowerCase();
  return Boolean(c?.startsWith(RENTAL_CATEGORY_PREFIX.toLowerCase()));
}
