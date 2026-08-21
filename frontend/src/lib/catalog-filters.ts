/** Macro-categorie per scremare il listino in preventivo IE. */
export const CATALOG_MACROS = [
  {
    id: "civile",
    label: "Civile classico",
    hint: "Interruttori, prese, placche",
    lines: ["Living Light", "Matix", "Axolute", "Magic", "Light Tech"],
  },
  {
    id: "domotica",
    label: "Domotica",
    hint: "Living Now, Matix Go, MyHome",
    lines: ["Living Now", "Matix Go", "MyHome", "Smarther"],
  },
  {
    id: "citofonia",
    label: "Citofonia / video",
    hint: "Sfera, Terraneo",
    lines: ["Sfera", "Terraneo"],
  },
  {
    id: "rete",
    label: "Rete / cassette",
    hint: "BTNet, Interlink, Multibox…",
    lines: ["BTNet", "Interlink", "Multibox", "Idrobox"],
  },
] as const;

export type CatalogMacroId = (typeof CATALOG_MACROS)[number]["id"];

export type CatalogTechFilter = "BUS" | "ZIGBEE" | "TRADIZIONALE";

const BUS_RE = /\b(SCS|MY\s*HOME|MYHOME|BUS)\b/i;
const ZIGBEE_RE =
  /\b(ZIGBEE|ZIG\s*BEE|WIRELESS|CONNESSO|CONNESSA|NETATMO|GATEWAY|HUB\b|SMART)\b/i;

/** Inferisce tecnologia apparato (BUS SCS vs Zigbee/wireless vs tradizionale). */
export function inferCatalogTech(
  name: string,
  sku?: string | null,
  productLine?: string | null
): CatalogTechFilter {
  const hay = `${sku || ""} ${name || ""} ${productLine || ""}`;
  const line = (productLine || "").toLowerCase();

  if (line.includes("myhome") || BUS_RE.test(hay)) return "BUS";
  if (ZIGBEE_RE.test(hay) || line.includes("matix go") || line.includes("smarther")) {
    return "ZIGBEE";
  }
  // Living Now senza keyword connesso → tradizionale (cablato classico)
  return "TRADIZIONALE";
}

export function linesForMacro(macroId: string | undefined | null): string[] | undefined {
  if (!macroId) return undefined;
  const m = CATALOG_MACROS.find((x) => x.id === macroId);
  return m ? [...m.lines] : undefined;
}

export const CATALOG_TECH_OPTIONS: {
  id: CatalogTechFilter;
  label: string;
  hint: string;
}[] = [
  {
    id: "BUS",
    label: "BUS / SCS",
    hint: "MyHome e apparati su bus",
  },
  {
    id: "ZIGBEE",
    label: "Zigbee / wireless",
    hint: "Connessi senza bus dedicato",
  },
  {
    id: "TRADIZIONALE",
    label: "Tradizionale",
    hint: "Cablaggio classico",
  },
];
