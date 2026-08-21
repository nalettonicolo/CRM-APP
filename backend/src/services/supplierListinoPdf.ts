import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  dataBuffer: Buffer
) => Promise<{ text?: string }>;
const XLSX = require("xlsx") as typeof import("xlsx");

export type ParsedCatalogLine = {
  sku: string;
  name: string;
  listPrice: number;
  sourceLabel?: string;
  productLine?: string | null;
};

const CODE_RE = /^[A-Z0-9][A-Z0-9._/-]{2,24}$/i;
const SKIP_RE =
  /^(LISTINO|PREZZI|INDICE|Codice|Descrizione|SMART|CIVILE|pagina|IVA|unitario)/i;

/** Linee civili / serie più comuni nei listini BTicino-Legrand (ordine = priorità match). */
const PRODUCT_LINE_RULES: { label: string; re: RegExp }[] = [
  { label: "Living Now", re: /\bL\.?\s*NOW\b|LIVING\s*NOW/i },
  { label: "Living Light", re: /LIVING\s*LIGHT|LIVINGLIGHT|\bLL\b/i },
  { label: "Matix Go", re: /MATIX\s*GO|MATIXGO/i },
  { label: "Matix", re: /\bMATIX\b/i },
  { label: "Axolute", re: /\bAXOLUTE\b|\bAXO\b/i },
  { label: "Magic", re: /\bMAGIC\b/i },
  { label: "Light Tech", re: /LIGHT\s*TECH/i },
  { label: "MyHome", re: /MY\s*HOME|MYHOME|\bSCS\b/i },
  { label: "Sfera", re: /\bSFERA\b/i },
  { label: "Terraneo", re: /\bTERRANEO\b/i },
  { label: "BTNet", re: /\bBTNET\b/i },
  { label: "Interlink", re: /\bINTERLINK\b/i },
  { label: "Multibox", re: /\bMULTIBOX\b/i },
  { label: "Idrobox", re: /\bIDROBOX\b/i },
  { label: "Smarther", re: /\bSMARTHER\b/i },
];

export function inferProductLine(
  name: string,
  sku?: string | null
): string | null {
  const hay = `${sku || ""} ${name || ""}`.trim();
  if (!hay) return null;
  for (const rule of PRODUCT_LINE_RULES) {
    if (rule.re.test(hay)) return rule.label;
  }
  return null;
}

function parseItalianPrice(rawLine: string): number | null {
  const m = String(rawLine)
    .trim()
    .match(/^([\d.\s]+,[\d\s]{2,6})\s*€?$/);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseLoosePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  const s = String(value ?? "").trim();
  if (!s) return null;
  const it = parseItalianPrice(s);
  if (it != null) return it;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Estrae voci codice/descrizione/prezzo da un PDF listino/catalogo. */
export async function parseSupplierListinoPdf(
  filePath: string,
  sourceLabel?: string
): Promise<ParsedCatalogLine[]> {
  const buf = fs.readFileSync(filePath);
  const data = await pdfParse(buf);
  const lines = String(data.text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedCatalogLine[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const code = lines[i];
    if (!CODE_RE.test(code) || SKIP_RE.test(code)) continue;

    const descParts: string[] = [];
    let price: number | null = null;
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      const p = parseItalianPrice(lines[j]);
      if (p != null) {
        price = p;
        i = j;
        break;
      }
      if (CODE_RE.test(lines[j]) && j > i + 1) break;
      descParts.push(lines[j]);
    }
    if (price == null || price < 0) continue;
    const name = descParts.join(" ").replace(/\s+/g, " ").trim();
    if (!name || name.length < 2) continue;
    const key = code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const clipped = name.slice(0, 500);
    items.push({
      sku: code,
      name: clipped,
      listPrice: price,
      sourceLabel,
      productLine: inferProductLine(clipped, code),
    });
  }

  return items;
}

/**
 * Estrae codice + descrizione da Excel (es. computo Living Now).
 * Prezzo opzionale; se assente resta 0 (serve ad arricchire il listino).
 */
export function parseSupplierCatalogExcel(
  filePath: string,
  sourceLabel?: string
): ParsedCatalogLine[] {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const items: ParsedCatalogLine[] = [];
  const seen = new Set<string>();

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as (string | number)[][];
    if (!rows.length) continue;

    let headerIdx = -1;
    let skuCol = -1;
    let nameCol = -1;
    let priceCol = -1;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r].map((c) => String(c).trim().toLowerCase());
      const cSku = row.findIndex((c) =>
        /^(codice|sku|code|art\.?|articolo)$/i.test(c)
      );
      const cName = row.findIndex((c) =>
        /^(descrizione|description|nome|articolo)$/i.test(c)
      );
      const cSku2 = row.findIndex((c) => c.includes("codice"));
      const cName2 = row.findIndex((c) => c.includes("descrizione"));
      const skuI = cSku >= 0 ? cSku : cSku2;
      const nameI = cName >= 0 ? cName : cName2;
      if (skuI >= 0 && nameI >= 0 && skuI !== nameI) {
        headerIdx = r;
        skuCol = skuI;
        nameCol = nameI;
        priceCol = row.findIndex((c) =>
          /prezzo|price|listino|€|euro/.test(c)
        );
        break;
      }
    }

    if (headerIdx < 0) continue;

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const sku = String(row[skuCol] ?? "").trim();
      const name = String(row[nameCol] ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (!CODE_RE.test(sku) || SKIP_RE.test(sku) || name.length < 2) continue;
      const key = sku.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const price =
        priceCol >= 0 ? parseLoosePrice(row[priceCol]) ?? 0 : 0;
      const clipped = name.slice(0, 500);
      items.push({
        sku,
        name: clipped,
        listPrice: price,
        sourceLabel,
        productLine: inferProductLine(clipped, sku),
      });
    }
  }

  return items;
}

/** Parser unico PDF / Excel in base all'estensione. */
export async function parseSupplierCatalogFile(
  filePath: string,
  sourceLabel?: string
): Promise<ParsedCatalogLine[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    return parseSupplierCatalogExcel(filePath, sourceLabel);
  }
  return parseSupplierListinoPdf(filePath, sourceLabel);
}

export type MergeSource = {
  role: "PRICE_LIST" | "CATALOG" | "OTHER";
  label: string;
  lines: ParsedCatalogLine[];
};

/**
 * Unisce più estrazioni per SKU:
 * - prezzo: priorità listino prezzi (PRICE_LIST)
 * - descrizione: tiene la più completa; catalogo può arricchire
 */
export function mergeParsedCatalogSources(
  sources: MergeSource[]
): ParsedCatalogLine[] {
  type Acc = {
    sku: string;
    name: string;
    listPrice: number;
    priceFromListino: boolean;
    sources: string[];
  };
  const map = new Map<string, Acc>();

  const apply = (
    lines: ParsedCatalogLine[],
    role: MergeSource["role"],
    label: string
  ) => {
    const isListino = role === "PRICE_LIST";
    for (const line of lines) {
      const key = line.sku.toUpperCase();
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          sku: line.sku,
          name: line.name,
          listPrice: line.listPrice,
          priceFromListino: isListino && line.listPrice > 0,
          sources: [label],
        });
        continue;
      }
      if (!prev.sources.includes(label)) prev.sources.push(label);
      if (isListino) {
        if (line.listPrice > 0) {
          prev.listPrice = line.listPrice;
          prev.priceFromListino = true;
        }
        if (line.name.length >= prev.name.length) prev.name = line.name;
      } else {
        if (line.name.length > prev.name.length) prev.name = line.name;
        if (!prev.priceFromListino && line.listPrice > 0) {
          prev.listPrice = line.listPrice;
        }
      }
    }
  };

  for (const s of sources.filter((x) => x.role === "PRICE_LIST")) {
    apply(s.lines, s.role, s.label);
  }
  for (const s of sources.filter((x) => x.role !== "PRICE_LIST")) {
    apply(s.lines, s.role, s.label);
  }

  return [...map.values()]
    .filter((r) => r.name && (r.priceFromListino || r.listPrice > 0))
    .map((r) => ({
      sku: r.sku,
      name: r.name,
      listPrice: r.listPrice,
      sourceLabel: r.sources.join(" + "),
      productLine: inferProductLine(r.name, r.sku),
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku, "it"));
}
