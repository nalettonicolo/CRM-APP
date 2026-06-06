import type { Product } from "@/lib/api";

export const RENTAL_UNIT = "gg";
export const RENTAL_CATEGORY_PREFIX = "Noleggio";

/** Reparti noleggio (livello 1) — obbligatori per nuovi articoli. */
export const RENTAL_DEPARTMENTS = [
  {
    id: "audio",
    label: "Audio",
    category: "Noleggio - Audio",
    skuPrefix: "AUD",
    badgeClass: "bg-blue-500/15 text-blue-800 dark:text-blue-300",
  },
  {
    id: "luci",
    label: "Luci",
    category: "Noleggio - Luci",
    skuPrefix: "LUC",
    badgeClass: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  },
  {
    id: "video",
    label: "Video",
    category: "Noleggio - Video",
    skuPrefix: "NOL",
    badgeClass: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  },
  {
    id: "strutture",
    label: "Strutture",
    category: "Noleggio - Strutture",
    skuPrefix: "NOL",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
] as const;

export type RentalDepartmentId = (typeof RENTAL_DEPARTMENTS)[number]["id"];

/** Famiglie tecniche (livello 2) per reparto. */
export const RENTAL_FAMILIES: Record<RentalDepartmentId, readonly string[]> = {
  audio: [
    "Diffusione",
    "Amplificazione",
    "Mixer / console",
    "Microfonia",
    "DI / preamp",
    "Monitoraggio",
    "Registrazione",
    "Cavi audio",
    "Accessori audio",
  ],
  luci: [
    "Teste mobili",
    "LED fissi",
    "Controllo luci",
    "Dimmer",
    "Atmosfera",
    "Effetti",
    "Alimentazione DMX",
    "Cavi luci",
    "Accessori luci",
  ],
  video: [
    "Proiezione",
    "LED wall / panel",
    "Mixer video",
    "Sorgenti",
    "Cavi video",
    "Accessori video",
  ],
  strutture: [
    "Truss",
    "Palchi / pedane",
    "Americane",
    "Teloni / fondali",
    "Accessori strutture",
  ],
};

export const RENTAL_CATEGORY_OPTIONS = RENTAL_DEPARTMENTS.map((d) => d.category);

export type RentalFilter = "all" | RentalDepartmentId | "altro";

/** AUD = audio, LUC = luci, NOL = altro noleggio, PRD = vendita */
export function skuPrefixForCategory(category?: string | null): string {
  const dept = rentalDepartmentFromCategory(category);
  if (dept) return dept.skuPrefix;
  const c = category?.trim().toLowerCase() ?? "";
  if (c.startsWith("noleggio")) return "NOL";
  return "PRD";
}

export function rentalDepartmentFromCategory(category?: string | null) {
  const c = category?.trim().toLowerCase() ?? "";
  return (
    RENTAL_DEPARTMENTS.find((d) => c === d.category.toLowerCase()) ??
    RENTAL_DEPARTMENTS.find((d) => c.includes(d.id)) ??
    (c.includes("audio")
      ? RENTAL_DEPARTMENTS.find((d) => d.id === "audio")
      : c.includes("luci") || c.includes("luce")
        ? RENTAL_DEPARTMENTS.find((d) => d.id === "luci")
        : c.includes("video")
          ? RENTAL_DEPARTMENTS.find((d) => d.id === "video")
          : c.includes("struttur")
            ? RENTAL_DEPARTMENTS.find((d) => d.id === "strutture")
            : undefined)
  );
}

export function rentalDepartmentId(category?: string | null): RentalDepartmentId | "altro" {
  const dept = rentalDepartmentFromCategory(category);
  return dept?.id ?? "altro";
}

const FAMILY_RE = /^\[([^\]]+)\]\s*(.*)$/;

/** Estrae famiglia e nome modello da `[Famiglia] Nome`. */
export function parseRentalName(name: string): {
  family: string;
  model: string;
} {
  const m = name.trim().match(FAMILY_RE);
  if (m) {
    return { family: m[1].trim(), model: m[2].trim() || name.trim() };
  }
  return { family: "", model: name.trim() };
}

export function formatRentalName(family: string, model: string): string {
  const f = family.trim();
  const m = model.trim();
  if (!f) return m;
  if (!m) return `[${f}]`;
  return `[${f}] ${m}`;
}

export function rentalFamilyLabel(name: string): string | null {
  const { family } = parseRentalName(name);
  return family || null;
}

export function isRentalProduct(p: Pick<Product, "isRentable" | "category">): boolean {
  if (p.isRentable) return true;
  const c = p.category?.trim().toLowerCase();
  return Boolean(c?.startsWith(RENTAL_CATEGORY_PREFIX.toLowerCase()));
}

export function matchesRentalFilter(
  p: { category?: string | null },
  filter: RentalFilter
): boolean {
  if (filter === "all") return true;
  return rentalDepartmentId(p.category) === filter;
}

export function sortRentalProducts<T extends { name: string; category?: string | null }>(
  items: T[]
): T[] {
  const deptOrder = new Map(
    RENTAL_DEPARTMENTS.map((d, i) => [d.id, i] as const)
  );
  return [...items].sort((a, b) => {
    const da = rentalDepartmentId(a.category);
    const db = rentalDepartmentId(b.category);
    const oa = da === "altro" ? 99 : (deptOrder.get(da) ?? 98);
    const ob = db === "altro" ? 99 : (deptOrder.get(db) ?? 98);
    if (oa !== ob) return oa - ob;
    const fa = rentalFamilyLabel(a.name) ?? "";
    const fb = rentalFamilyLabel(b.name) ?? "";
    if (fa !== fb) return fa.localeCompare(fb, "it");
    return a.name.localeCompare(b.name, "it");
  });
}

export type RentalCatalogItem = {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
};

export type RentalGroup<T extends RentalCatalogItem = RentalCatalogItem> = {
  departmentId: RentalDepartmentId | "altro";
  departmentLabel: string;
  badgeClass: string;
  families: {
    family: string;
    items: T[];
  }[];
};

export function groupRentalCatalog<T extends RentalCatalogItem>(
  products: T[]
): RentalGroup<T>[] {
  const sorted = sortRentalProducts(products);
  const byDept = new Map<RentalDepartmentId | "altro", Map<string, T[]>>();

  for (const p of sorted) {
    const deptId = rentalDepartmentId(p.category);
    const deptMap = byDept.get(deptId) ?? new Map<string, T[]>();
    const family = rentalFamilyLabel(p.name) || "Senza famiglia";
    const list = deptMap.get(family) ?? [];
    list.push(p);
    deptMap.set(family, list);
    byDept.set(deptId, deptMap);
  }

  const order: (RentalDepartmentId | "altro")[] = [
    ...RENTAL_DEPARTMENTS.map((d) => d.id),
    "altro",
  ];

  return order
    .filter((id) => byDept.has(id))
    .map((id) => {
      const dept = RENTAL_DEPARTMENTS.find((d) => d.id === id);
      const familiesMap = byDept.get(id)!;
      const families = Array.from(familiesMap.entries())
        .sort(([a], [b]) => {
          if (a === "Senza famiglia") return 1;
          if (b === "Senza famiglia") return -1;
          return a.localeCompare(b, "it");
        })
        .map(([family, items]) => ({ family, items }));
      return {
        departmentId: id,
        departmentLabel: dept?.label ?? "Altro",
        badgeClass: dept?.badgeClass ?? "bg-muted text-muted-foreground",
        families,
      };
    });
}

/** SKU nel formato AUD-0001 / LUC-0001 in base al reparto. */
export function isStandardRentalSku(
  sku: string,
  category?: string | null
): boolean {
  const prefix = skuPrefixForCategory(category);
  return new RegExp(`^${prefix}-\\d{4}$`, "i").test(sku.trim());
}

/** Etichetta breve per select preventivo: `Audio · Diffusione · nome` */
export function rentalPickerLabel(p: {
  name: string;
  category?: string | null;
  price: number | string;
}): string {
  const dept = rentalDepartmentFromCategory(p.category);
  const { family, model } = parseRentalName(p.name);
  const parts = [
    dept?.label,
    family || undefined,
    model || p.name,
  ].filter(Boolean);
  return `${parts.join(" · ")} (${Number(p.price).toFixed(2)} €/gg)`;
}
