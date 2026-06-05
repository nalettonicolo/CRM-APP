import { prisma } from "../lib/prisma.js";

/** Prefissi SKU: Audio → AUD, Luci → LUC, altro noleggio → NOL, vendita → PRD */
export function skuPrefixForCategory(category?: string | null): string {
  const c = category?.trim().toLowerCase() ?? "";
  if (c.includes("audio") || c === "audio") return "AUD";
  if (c.includes("luci") || c === "luci" || c.includes("luce")) return "LUC";
  if (c.startsWith("noleggio")) return "NOL";
  return "PRD";
}

export async function generateProductSku(category?: string | null): Promise<string> {
  const prefix = skuPrefixForCategory(category);
  const like = `${prefix}-%`;
  const rows = await prisma.product.findMany({
    where: { sku: { startsWith: prefix } },
    select: { sku: true },
    orderBy: { sku: "desc" },
    take: 50,
  });

  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  for (const row of rows) {
    const m = row.sku.match(re);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }

  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
