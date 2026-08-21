/** Macro e tecnologia per ricerca listino (allineato a frontend/src/lib/catalog-filters.ts). */

export const CATALOG_MACROS: Record<string, string[]> = {
  civile: ["Living Light", "Matix", "Axolute", "Magic", "Light Tech"],
  domotica: ["Living Now", "Matix Go", "MyHome", "Smarther"],
  citofonia: ["Sfera", "Terraneo"],
  rete: ["BTNet", "Interlink", "Multibox", "Idrobox"],
};

const BUS_RE = /\b(SCS|MY\s*HOME|MYHOME|BUS)\b/i;
const ZIGBEE_RE =
  /\b(ZIGBEE|ZIG\s*BEE|WIRELESS|CONNESSO|CONNESSA|NETATMO|GATEWAY|HUB\b|SMART)\b/i;

export type CatalogTech = "BUS" | "ZIGBEE" | "TRADIZIONALE";

export function inferCatalogTech(
  name: string,
  sku?: string | null,
  productLine?: string | null
): CatalogTech {
  const hay = `${sku || ""} ${name || ""} ${productLine || ""}`;
  const line = (productLine || "").toLowerCase();
  if (line.includes("myhome") || BUS_RE.test(hay)) return "BUS";
  if (
    ZIGBEE_RE.test(hay) ||
    line.includes("matix go") ||
    line.includes("smarther")
  ) {
    return "ZIGBEE";
  }
  return "TRADIZIONALE";
}

export function techMatches(
  tech: CatalogTech | "",
  name: string,
  sku?: string | null,
  productLine?: string | null
): boolean {
  if (!tech) return true;
  return inferCatalogTech(name, sku, productLine) === tech;
}
