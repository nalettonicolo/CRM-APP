/** Reparti noleggio — allineato a frontend/src/lib/rental-catalog.ts */
export const RENTAL_DEPARTMENT_CATEGORIES = [
  "Noleggio - Audio",
  "Noleggio - Luci",
  "Noleggio - Video",
  "Noleggio - Strutture",
] as const;

export function normalizeRentalCategory(category?: string | null): string | undefined {
  const c = category?.trim();
  if (!c) return undefined;
  const lower = c.toLowerCase();
  if (lower.includes("audio")) return "Noleggio - Audio";
  if (lower.includes("luci") || lower.includes("luce")) return "Noleggio - Luci";
  if (lower.includes("video")) return "Noleggio - Video";
  if (lower.includes("struttur")) return "Noleggio - Strutture";
  if (lower.startsWith("noleggio")) return c;
  return c;
}

export function isAllowedRentalCategory(category?: string | null): boolean {
  const normalized = normalizeRentalCategory(category);
  if (!normalized) return false;
  return (
    RENTAL_DEPARTMENT_CATEGORIES.includes(
      normalized as (typeof RENTAL_DEPARTMENT_CATEGORIES)[number]
    ) || normalized.toLowerCase().startsWith("noleggio")
  );
}
