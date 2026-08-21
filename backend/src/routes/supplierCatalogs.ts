import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import {
  inferProductLine,
  mergeParsedCatalogSources,
  parseSupplierCatalogFile,
  type MergeSource,
} from "../services/supplierListinoPdf.js";
import {
  CATALOG_MACROS,
  inferCatalogTech,
  techMatches,
} from "../services/catalogFilters.js";
import {
  AJAX_CATALOG_META,
  AJAX_SEED_ITEMS,
} from "../data/ajaxCatalog.js";

const catalogDir = path.join(config.upload.dir, "supplier-catalogs");
const catalogCategorySchema = z.enum(["ELECTRICAL", "SECURITY"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(catalogDir, { recursive: true });
    cb(null, catalogDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.catalogMaxSize },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/") ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/csv" ||
      /\.(pdf|png|jpe?g|webp|xlsx|xls|csv)$/i.test(file.originalname);
    cb(null, ok);
  },
});

const router = Router();
router.use(authenticate);

const kindSchema = z.enum(["PDF", "PRICE_LIST"]);
const fileRoleSchema = z.enum(["PRICE_LIST", "CATALOG", "OTHER"]);

const itemSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1),
  unit: z.string().optional(),
  listPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  sellPrice: z.number().nonnegative().nullable().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const itemPatchSchema = z.object({
  sku: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  unit: z.string().nullable().optional(),
  listPrice: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  sellPrice: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  productLine: z.string().nullable().optional(),
});

const catalogInclude = {
  supplier: { select: { id: true, name: true } },
  files: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  items: { orderBy: { sortOrder: "asc" as const }, take: 200 },
};

function resolveCatalogFileAbs(filePath: string): string {
  const preferred = path.join(
    config.upload.dir,
    filePath.replace(/^\/?uploads\//, "")
  );
  if (fs.existsSync(preferred)) return preferred;
  const alt = path.join(config.upload.dir, "..", filePath.replace(/^\//, ""));
  if (fs.existsSync(alt)) return alt;
  return preferred;
}

function unlinkQuiet(filePath: string | null | undefined) {
  if (!filePath) return;
  for (const p of [
    resolveCatalogFileAbs(filePath),
    path.join(config.upload.dir, filePath.replace(/^\/?uploads\//, "")),
  ]) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

/** Migra filePath legacy in SupplierCatalogFile se manca. */
async function ensureLegacyFileMigrated(catalogId: string) {
  const cat = await prisma.supplierCatalog.findUnique({
    where: { id: catalogId },
    include: { files: true },
  });
  if (!cat?.filePath) return cat;
  if (cat.files.length > 0) return cat;
  await prisma.supplierCatalogFile.create({
    data: {
      catalogId,
      role: cat.kind === "PRICE_LIST" ? "PRICE_LIST" : "CATALOG",
      label: cat.fileName || "Allegato",
      filePath: cat.filePath,
      fileName: cat.fileName,
      mimeType: cat.mimeType,
      fileSize: cat.fileSize,
      sortOrder: 0,
    },
  });
  return prisma.supplierCatalog.findUnique({
    where: { id: catalogId },
    include: catalogInclude,
  });
}

async function syncLegacyFileFields(catalogId: string) {
  const files = await prisma.supplierCatalogFile.findMany({
    where: { catalogId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const first = files[0];
  await prisma.supplierCatalog.update({
    where: { id: catalogId },
    data: {
      filePath: first?.filePath ?? null,
      fileName: first?.fileName ?? null,
      mimeType: first?.mimeType ?? null,
      fileSize: first?.fileSize ?? null,
    },
  });
}

type CatalogFileLike = {
  role: string;
  filePath?: string | null;
  fileName?: string | null;
};

/** Bollini UI: Prezzi ok / Foto ok / Uniti X */
async function buildCatalogStatus(
  catalogId: string,
  files: CatalogFileLike[],
  itemCount: number
) {
  const hasPrices =
    itemCount > 0 || files.some((f) => f.role === "PRICE_LIST");
  const hasPhotos = files.some((f) => {
    if (f.role !== "CATALOG") return false;
    const name = `${f.fileName || ""} ${f.filePath || ""}`.toLowerCase();
    return name.includes(".pdf") || !name.includes(".xls");
  });
  const mergedCount = await prisma.supplierCatalogItem.count({
    where: {
      catalogId,
      sourceLabel: { contains: "+" },
    },
  });
  return {
    hasPrices,
    hasPhotos,
    mergedCount,
    itemCount,
  };
}

router.get("/", requirePermission("products", "READ"), async (req, res, next) => {
  try {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const categoryRaw =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    const category =
      categoryRaw === "ELECTRICAL" || categoryRaw === "SECURITY"
        ? categoryRaw
        : undefined;
    const catalogs = await prisma.supplierCatalog.findMany({
      where: {
        ...(kind ? { kind: kind as never } : {}),
        ...(category ? { category } : {}),
        isActive: true,
      },
      // Lista leggera: niente items (24k voci bloccavano la UI ~40s).
      include: {
        supplier: { select: { id: true, name: true } },
        files: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        _count: { select: { items: true, files: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const mergedGroups = await prisma.supplierCatalogItem.groupBy({
      by: ["catalogId"],
      where: {
        catalogId: { in: catalogs.map((c) => c.id) },
        sourceLabel: { contains: "+" },
      },
      _count: { _all: true },
    });
    const mergedByCatalog = new Map(
      mergedGroups.map((g) => [g.catalogId, g._count._all] as const)
    );

    const withStatus = catalogs.map((c) => {
      const files = c.files?.length
        ? c.files
        : c.filePath
          ? [
              {
                role: "PRICE_LIST" as const,
                filePath: c.filePath,
                fileName: c.fileName,
              },
            ]
          : [];
      const itemCount = c._count.items;
      const hasPrices =
        itemCount > 0 || files.some((f) => f.role === "PRICE_LIST");
      const hasPhotos = files.some((f) => {
        if (f.role !== "CATALOG") return false;
        const name = `${f.fileName || ""} ${f.filePath || ""}`.toLowerCase();
        return name.includes(".pdf") || !name.includes(".xls");
      });
      return {
        ...c,
        items: [] as never[],
        status: {
          hasPrices,
          hasPhotos,
          mergedCount: mergedByCatalog.get(c.id) ?? 0,
          itemCount,
        },
      };
    });
    res.json(withStatus);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/items/search",
  requirePermission("products", "READ"),
  async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const catalogId =
        typeof req.query.catalogId === "string" ? req.query.catalogId : undefined;
      const categoryRaw =
        typeof req.query.category === "string" ? req.query.category.trim() : "";
      const category =
        categoryRaw === "ELECTRICAL" || categoryRaw === "SECURITY"
          ? categoryRaw
          : "";
      const lineRaw =
        typeof req.query.line === "string" ? req.query.line.trim() : "";
      const line = lineRaw && lineRaw !== "Tutte" ? lineRaw : "";
      const macro =
        typeof req.query.macro === "string" ? req.query.macro.trim() : "";
      const techRaw =
        typeof req.query.tech === "string"
          ? req.query.tech.trim().toUpperCase()
          : "";
      const tech =
        techRaw === "BUS" || techRaw === "ZIGBEE" || techRaw === "TRADIZIONALE"
          ? techRaw
          : "";
      const limit = Math.min(
        40,
        Math.max(1, parseInt(String(req.query.limit || "25"), 10) || 25)
      );

      const macroLines = macro ? CATALOG_MACROS[macro] : undefined;
      const hasStructuralFilter = Boolean(line || macroLines || tech);

      // Ricerca testo: basta 1 carattere (SKU) o 2 (descrizione)
      if (!hasStructuralFilter && q.length < 1) {
        res.json([]);
        return;
      }
      if (!hasStructuralFilter && q.length === 1 && !/^[a-z0-9]/i.test(q)) {
        res.json([]);
        return;
      }

      type Row = {
        id: string;
        sku: string | null;
        name: string;
        unit: string | null;
        listPrice: number;
        discountPercent: number;
        sellPrice: number | null;
        productLine: string | null;
        sourceLabel: string | null;
        catalogId: string;
        catalogTitle: string;
        supplierName: string;
        defaultDiscountPercent: number;
      };

      let rows: Row[] = [];

      if (q.length >= 1) {
        // Path veloce: SQL + LIMIT (indici trigram su name/sku)
        const esc = (s: string) => s.replace(/[%_\\]/g, "\\$&");
        const pattern = `%${esc(q)}%`;
        const compact = q.replace(/[\s\-_/./]/g, "");
        const compactPattern = `%${esc(compact)}%`;
        const clauses: string[] = [
          `c."isActive" = true`,
          `(
            i.name ILIKE $1
            OR COALESCE(i.sku, '') ILIKE $1
            OR regexp_replace(COALESCE(i.sku, ''), '[\\s\\-_/./]', '', 'g') ILIKE $2
          )`,
        ];
        const params: unknown[] = [pattern, compactPattern];
        let p = 3;
        if (catalogId) {
          clauses.push(`i."catalogId" = $${p++}`);
          params.push(catalogId);
        }
        if (category) {
          clauses.push(`c."category" = $${p++}`);
          params.push(category);
        }
        if (line === "Altre") {
          clauses.push(`i."productLine" IS NULL`);
        } else if (line) {
          clauses.push(`i."productLine" = $${p++}`);
          params.push(line);
        } else if (macroLines?.length) {
          clauses.push(`i."productLine" = ANY($${p++}::text[])`);
          params.push(macroLines);
        }
        const exactIdx = p++;
        const compactExactIdx = p++;
        params.push(q, compact);
        const sqlLimit = tech ? Math.min(300, limit * 10) : limit;
        const limitIdx = p++;
        params.push(sqlLimit);
        rows = await prisma.$queryRawUnsafe<Row[]>(
          `
          SELECT i.id, i.sku, i.name, i.unit,
                 i."listPrice"::float8 AS "listPrice",
                 i."discountPercent"::float8 AS "discountPercent",
                 i."sellPrice"::float8 AS "sellPrice",
                 i."productLine", i."sourceLabel",
                 c.id AS "catalogId", c.title AS "catalogTitle", c."supplierName",
                 c."defaultDiscountPercent"::float8 AS "defaultDiscountPercent"
          FROM "SupplierCatalogItem" i
          INNER JOIN "SupplierCatalog" c ON c.id = i."catalogId"
          WHERE ${clauses.join(" AND ")}
          ORDER BY
            CASE
              WHEN UPPER(COALESCE(i.sku, '')) = UPPER($${exactIdx}) THEN 0
              WHEN UPPER(COALESCE(i.sku, '')) LIKE UPPER($1) THEN 1
              WHEN UPPER(regexp_replace(COALESCE(i.sku, ''), '[\\s\\-_/./]', '', 'g'))
                   = UPPER($${compactExactIdx}) THEN 2
              ELSE 3
            END,
            i.sku ASC NULLS LAST,
            i.name ASC
          LIMIT $${limitIdx}
        `,
          ...params
        );
      } else {
        // Solo filtri strutturali (nessuna query testo)
        const lineFilter = line
          ? line === "Altre"
            ? { productLine: null }
            : { productLine: line }
          : macroLines
            ? { productLine: { in: macroLines } }
            : {};
        const items = await prisma.supplierCatalogItem.findMany({
          where: {
            ...(catalogId ? { catalogId } : {}),
            ...(category ? { catalog: { isActive: true, category } } : { catalog: { isActive: true } }),
            ...lineFilter,
          },
          take: tech ? Math.min(300, limit * 10) : limit,
          orderBy: [{ sku: "asc" }, { name: "asc" }],
          include: {
            catalog: {
              select: {
                id: true,
                title: true,
                supplierName: true,
                defaultDiscountPercent: true,
              },
            },
          },
        });
        rows = items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          listPrice: Number(item.listPrice) || 0,
          discountPercent: Number(item.discountPercent) || 0,
          sellPrice:
            item.sellPrice != null ? Number(item.sellPrice) : null,
          productLine: item.productLine,
          sourceLabel: item.sourceLabel,
          catalogId: item.catalog.id,
          catalogTitle: item.catalog.title,
          supplierName: item.catalog.supplierName,
          defaultDiscountPercent:
            Number(item.catalog.defaultDiscountPercent) || 0,
        }));
      }

      const filtered = tech
        ? rows.filter((item) =>
            techMatches(tech, item.name, item.sku, item.productLine)
          )
        : rows;

      res.json(
        filtered.slice(0, limit).map((item) => {
          const list = Number(item.listPrice) || 0;
          const disc =
            Number(item.discountPercent) ||
            Number(item.defaultDiscountPercent) ||
            0;
          const net = list * (1 - disc / 100);
          const sell =
            item.sellPrice != null && !Number.isNaN(Number(item.sellPrice))
              ? Number(item.sellPrice)
              : null;
          const customerPrice = sell != null ? sell : list;
          return {
            id: item.id,
            sku: item.sku,
            name: item.name,
            unit: item.unit,
            listPrice: list,
            discountPercent: disc,
            netPrice: Math.round(net * 100) / 100,
            sellPrice: sell,
            customerPrice: Math.round(customerPrice * 100) / 100,
            sourceLabel: item.sourceLabel,
            productLine: item.productLine,
            techFamily: inferCatalogTech(item.name, item.sku, item.productLine),
            catalogId: item.catalogId,
            catalogTitle: item.catalogTitle,
            supplierName: item.supplierName,
          };
        })
      );
    } catch (e) {
      next(e);
    }
  }
);

/** Elenco linee prodotto (con conteggio) per filtri UI. */
router.get(
  "/items/lines",
  requirePermission("products", "READ"),
  async (req, res, next) => {
    try {
      const catalogId =
        typeof req.query.catalogId === "string" ? req.query.catalogId : undefined;
      const grouped = await prisma.supplierCatalogItem.groupBy({
        by: ["productLine"],
        where: {
          ...(catalogId ? { catalogId } : {}),
          catalog: { isActive: true },
        },
        _count: { _all: true },
      });
      const lines = grouped
        .map((g) => ({
          line: g.productLine || "Altre",
          count: g._count._all,
        }))
        .sort((a, b) => {
          if (a.line === "Altre") return 1;
          if (b.line === "Altre") return -1;
          return b.count - a.count || a.line.localeCompare(b.line, "it");
        });
      res.json({ lines, total: lines.reduce((s, l) => s + l.count, 0) });
    } catch (e) {
      next(e);
    }
  }
);

/** Assegna productLine alle voci ancora senza (da nome/SKU). */
router.post(
  "/items/backfill-lines",
  requirePermission("products", "UPDATE"),
  async (req, res, next) => {
    try {
      const catalogId =
        typeof req.body?.catalogId === "string" ? req.body.catalogId : undefined;
      let scanned = 0;
      let updated = 0;
      // Più passate: 24k voci senza linea
      for (let pass = 0; pass < 20; pass++) {
        const batch = await prisma.supplierCatalogItem.findMany({
          where: {
            productLine: null,
            ...(catalogId ? { catalogId } : {}),
          },
          select: { id: true, sku: true, name: true },
          take: 2000,
        });
        if (!batch.length) break;
        scanned += batch.length;
        const byLine = new Map<string, string[]>();
        for (const row of batch) {
          const line = inferProductLine(row.name, row.sku);
          if (!line) continue;
          const list = byLine.get(line) || [];
          list.push(row.id);
          byLine.set(line, list);
        }
        if (byLine.size === 0) break;
        for (const [line, ids] of byLine) {
          const chunk = 200;
          for (let i = 0; i < ids.length; i += chunk) {
            const slice = ids.slice(i, i + chunk);
            const r = await prisma.supplierCatalogItem.updateMany({
              where: { id: { in: slice }, productLine: null },
              data: { productLine: line },
            });
            updated += r.count;
          }
        }
      }
      res.json({ scanned, updated });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/:id", requirePermission("products", "READ"), async (req, res, next) => {
  try {
    await ensureLegacyFileMigrated(paramId(req));
    const lineRaw =
      typeof req.query.line === "string" ? req.query.line.trim() : "";
    const line = lineRaw && lineRaw !== "Tutte" ? lineRaw : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(
      500,
      Math.max(1, parseInt(String(req.query.limit || "200"), 10) || 200)
    );
    const lineFilter =
      line === "Altre"
        ? { productLine: null }
        : line
          ? { productLine: line }
          : {};
    const catalog = await prisma.supplierCatalog.findUnique({
      where: { id: paramId(req) },
      include: {
        ...catalogInclude,
        items: {
          where: {
            ...lineFilter,
            ...(q
              ? {
                  OR: [
                    { sku: { contains: q, mode: "insensitive" } },
                    { name: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: [{ productLine: "asc" }, { sku: "asc" }, { sortOrder: "asc" }],
          take: limit,
        },
        _count: { select: { items: true, files: true } },
      },
    });
    if (!catalog) throw new NotFoundError("Catalogo non trovato");
    const status = await buildCatalogStatus(
      catalog.id,
      catalog.files?.length
        ? catalog.files
        : catalog.filePath
          ? [
              {
                role: "PRICE_LIST",
                filePath: catalog.filePath,
                fileName: catalog.fileName,
              },
            ]
          : [],
      catalog._count.items
    );
    res.json({ ...catalog, status });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/ensure-ajax",
  requirePermission("products", "CREATE"),
  async (_req, res, next) => {
    try {
      const existing = await prisma.supplierCatalog.findFirst({
        where: {
          category: "SECURITY",
          supplierName: { equals: AJAX_CATALOG_META.supplierName, mode: "insensitive" },
          isActive: true,
        },
        include: {
          _count: { select: { items: true } },
        },
      });

      if (existing && existing._count.items > 0) {
        res.json({
          catalog: existing,
          created: false,
          imported: existing._count.items,
          message: "Catalogo Ajax già presente",
        });
        return;
      }

      const catalog =
        existing ||
        (await prisma.supplierCatalog.create({
          data: {
            supplierName: AJAX_CATALOG_META.supplierName,
            title: AJAX_CATALOG_META.title,
            category: AJAX_CATALOG_META.category,
            kind: "PRICE_LIST",
            description: AJAX_CATALOG_META.description,
            defaultDiscountPercent: 0,
          },
        }));

      // Sostituisci voci se catalogo vuoto o ricreato
      await prisma.supplierCatalogItem.deleteMany({
        where: { catalogId: catalog.id },
      });
      await prisma.supplierCatalogItem.createMany({
        data: AJAX_SEED_ITEMS.map((item, i) => ({
          catalogId: catalog.id,
          sortOrder: i,
          sku: item.sku,
          name: item.name,
          unit: item.unit || "pz",
          listPrice: item.listPrice,
          discountPercent: 0,
          productLine: item.productLine,
          sourceLabel: "Ajax listino consigliato IT",
        })),
      });

      const full = await prisma.supplierCatalog.findUnique({
        where: { id: catalog.id },
        include: {
          _count: { select: { items: true, files: true } },
          files: true,
        },
      });

      res.json({
        catalog: full,
        created: !existing,
        imported: AJAX_SEED_ITEMS.length,
        message: existing
          ? "Voci Ajax importate sul catalogo esistente"
          : "Catalogo Ajax creato e importato",
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post("/", requirePermission("products", "CREATE"), async (req, res, next) => {
  try {
    const data = z
      .object({
        supplierId: z.string().optional(),
        supplierName: z.string().min(1),
        title: z.string().min(1),
        kind: kindSchema.default("PRICE_LIST"),
        category: catalogCategorySchema.optional(),
        description: z.string().optional(),
        defaultDiscountPercent: z.number().min(0).max(100).optional(),
        validFrom: z.string().datetime().optional(),
        validTo: z.string().datetime().optional(),
        items: z.array(itemSchema).optional(),
      })
      .parse(req.body);

    const catalog = await prisma.supplierCatalog.create({
      data: {
        supplierId: data.supplierId || null,
        supplierName: data.supplierName.trim(),
        title: data.title.trim(),
        kind: data.kind,
        category: data.category ?? "ELECTRICAL",
        description: data.description?.trim() || null,
        defaultDiscountPercent: data.defaultDiscountPercent ?? 0,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        items: data.items?.length
          ? {
              create: data.items.map((item, i) => ({
                sortOrder: item.sortOrder ?? i,
                sku: item.sku?.trim() || null,
                name: item.name.trim(),
                unit: item.unit?.trim() || null,
                listPrice: item.listPrice,
                discountPercent:
                  item.discountPercent ?? data.defaultDiscountPercent ?? 0,
                notes: item.notes?.trim() || null,
              })),
            }
          : undefined,
      },
      include: catalogInclude,
    });
    res.status(201).json(catalog);
  } catch (e) {
    next(e);
  }
});

/** Aggiunge un PDF (listino / catalogo / altro) senza sostituire gli esistenti.
 *  Con replaceSameRole=true sostituisce i file già presenti con lo stesso ruolo. */
router.post(
  "/:id/files",
  requirePermission("products", "UPDATE"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const id = paramId(req);
      await ensureLegacyFileMigrated(id);
      const existing = await prisma.supplierCatalog.findUnique({
        where: { id },
        include: { files: true },
      });
      if (!existing) throw new NotFoundError("Catalogo non trovato");
      if (!req.file) throw new ValidationError("File PDF mancante");

      const role = fileRoleSchema.catch("OTHER").parse(
        typeof req.body?.role === "string" ? req.body.role : "OTHER"
      );
      const label =
        (typeof req.body?.label === "string" && req.body.label.trim()) ||
        req.file.originalname;
      const replaceSameRole =
        req.body?.replaceSameRole === true ||
        req.body?.replaceSameRole === "true" ||
        req.body?.replaceSameRole === "1";

      if (replaceSameRole) {
        const sameRole = existing.files.filter((f) => f.role === role);
        for (const old of sameRole) {
          unlinkQuiet(old.filePath);
          await prisma.supplierCatalogFile.delete({ where: { id: old.id } });
        }
      }

      const relative = `/uploads/supplier-catalogs/${req.file.filename}`;
      const remaining = await prisma.supplierCatalogFile.count({
        where: { catalogId: id },
      });
      await prisma.supplierCatalogFile.create({
        data: {
          catalogId: id,
          role,
          label,
          filePath: relative,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          sortOrder: remaining,
        },
      });
      await syncLegacyFileFields(id);

      const catalog = await prisma.supplierCatalog.findUnique({
        where: { id },
        include: {
          ...catalogInclude,
          _count: { select: { items: true, files: true } },
        },
      });
      res.status(201).json(catalog);
    } catch (e) {
      next(e);
    }
  }
);

/** Compat: upload singolo (aggiunge come file, non sovrascrive più gli altri). */
router.post(
  "/:id/pdf",
  requirePermission("products", "UPDATE"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const id = paramId(req);
      await ensureLegacyFileMigrated(id);
      const existing = await prisma.supplierCatalog.findUnique({
        where: { id },
        include: { files: true },
      });
      if (!existing) throw new NotFoundError("Catalogo non trovato");
      if (!req.file) throw new ValidationError("File PDF mancante");

      const role = fileRoleSchema.catch("CATALOG").parse(
        typeof req.body?.role === "string" ? req.body.role : "CATALOG"
      );
      const label =
        (typeof req.body?.label === "string" && req.body.label.trim()) ||
        req.file.originalname;
      const relative = `/uploads/supplier-catalogs/${req.file.filename}`;

      await prisma.supplierCatalogFile.create({
        data: {
          catalogId: id,
          role,
          label,
          filePath: relative,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          sortOrder: existing.files.length,
        },
      });
      await syncLegacyFileFields(id);

      const catalog = await prisma.supplierCatalog.findUnique({
        where: { id },
        include: {
          ...catalogInclude,
          _count: { select: { items: true, files: true } },
        },
      });
      res.json(catalog);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id/files/:fileId",
  requirePermission("products", "UPDATE"),
  async (req, res, next) => {
    try {
      const catalogId = paramId(req);
      const fileId = String(req.params.fileId || "");
      const file = await prisma.supplierCatalogFile.findFirst({
        where: { id: fileId, catalogId },
      });
      if (!file) throw new NotFoundError("File non trovato");
      unlinkQuiet(file.filePath);
      await prisma.supplierCatalogFile.delete({ where: { id: file.id } });
      await syncLegacyFileFields(catalogId);
      const catalog = await prisma.supplierCatalog.findUnique({
        where: { id: catalogId },
        include: {
          ...catalogInclude,
          _count: { select: { items: true, files: true } },
        },
      });
      res.json(catalog);
    } catch (e) {
      next(e);
    }
  }
);

/**
 * Estrae e unisce voci da tutti i PDF allegati (listino + catalogo).
 * Prezzo da listino; descrizione arricchita dal catalogo quando possibile.
 */
router.post(
  "/:id/import-pdf-items",
  requirePermission("products", "UPDATE"),
  async (req, res, next) => {
    try {
      const id = paramId(req);
      await ensureLegacyFileMigrated(id);
      const existing = await prisma.supplierCatalog.findUnique({
        where: { id },
        include: { files: true },
      });
      if (!existing) throw new NotFoundError("Catalogo non trovato");
      if (!existing.files.length && !existing.filePath) {
        throw new ValidationError("Nessun PDF allegato da cui estrarre le voci");
      }

      const replace =
        req.body?.replace === true ||
        req.body?.replace === "true" ||
        req.query.replace === "1";

      const files =
        existing.files.length > 0
          ? existing.files
          : existing.filePath
            ? [
                {
                  role: "PRICE_LIST" as const,
                  label: existing.fileName || "Allegato",
                  filePath: existing.filePath,
                },
              ]
            : [];

      const sources: MergeSource[] = [];
      const parseErrors: string[] = [];

      for (const f of files) {
        const abs = resolveCatalogFileAbs(f.filePath);
        if (!fs.existsSync(abs)) {
          parseErrors.push(`${f.label || f.filePath}: file mancante`);
          continue;
        }
        try {
          const fileName =
            "fileName" in f && typeof f.fileName === "string"
              ? f.fileName
              : null;
          const label = f.label || fileName || "File";
          const lines = await parseSupplierCatalogFile(abs, label);
          sources.push({
            role: (f.role as MergeSource["role"]) || "OTHER",
            label,
            lines,
          });
        } catch (err) {
          parseErrors.push(
            `${f.label || "File"}: ${err instanceof Error ? err.message : "parse fallita"}`
          );
        }
      }

      const merged = mergeParsedCatalogSources(sources);
      if (!merged.length) {
        throw new ValidationError(
          parseErrors.length
            ? `Nessuna voce unita. ${parseErrors.join(" · ")}`
            : "Nessuna voce riconosciuta nei PDF. Usa almeno un listino prezzi tabellare."
        );
      }

      const defaultDisc = Number(existing.defaultDiscountPercent) || 0;

      let created = 0;
      let updated = 0;

      if (replace) {
        await prisma.supplierCatalogItem.deleteMany({ where: { catalogId: id } });
        const batchSize = 500;
        for (let i = 0; i < merged.length; i += batchSize) {
          const slice = merged.slice(i, i + batchSize);
          await prisma.supplierCatalogItem.createMany({
            data: slice.map((row, idx) => ({
              catalogId: id,
              sortOrder: i + idx,
              sku: row.sku,
              name: row.name,
              listPrice: row.listPrice,
              discountPercent: defaultDisc,
              sourceLabel: row.sourceLabel || null,
              productLine: row.productLine || inferProductLine(row.name, row.sku),
            })),
          });
          created += slice.length;
        }
      } else {
        const existingItems = await prisma.supplierCatalogItem.findMany({
          where: { catalogId: id },
          select: { id: true, sku: true },
        });
        const bySku = new Map(
          existingItems
            .filter((r) => r.sku)
            .map((r) => [r.sku!.toUpperCase(), r.id] as const)
        );

        for (let i = 0; i < merged.length; i++) {
          const row = merged[i];
          const key = row.sku.toUpperCase();
          const prevId = bySku.get(key);
          if (!prevId) {
            await prisma.supplierCatalogItem.create({
              data: {
                catalogId: id,
                sortOrder: i,
                sku: row.sku,
                name: row.name,
                listPrice: row.listPrice,
                discountPercent: defaultDisc,
                sourceLabel: row.sourceLabel || null,
                productLine:
                  row.productLine || inferProductLine(row.name, row.sku),
              },
            });
            created++;
          } else {
            await prisma.supplierCatalogItem.update({
              where: { id: prevId },
              data: {
                name: row.name,
                listPrice: row.listPrice,
                sourceLabel: row.sourceLabel || null,
                productLine:
                  row.productLine || inferProductLine(row.name, row.sku),
                sortOrder: i,
              },
            });
            updated++;
          }
        }
      }

      const catalog = await prisma.supplierCatalog.update({
        where: { id },
        data: { kind: "PRICE_LIST" },
        include: {
          ...catalogInclude,
          items: { orderBy: { sortOrder: "asc" }, take: 100 },
          _count: { select: { items: true, files: true } },
        },
      });

      const totalItems = await prisma.supplierCatalogItem.count({
        where: { catalogId: id },
      });
      const status = await buildCatalogStatus(
        id,
        catalog.files || [],
        totalItems
      );

      res.json({
        ...catalog,
        status,
        imported: created,
        updated,
        parsed: merged.length,
        sources: sources.map((s) => ({
          label: s.label,
          role: s.role,
          lines: s.lines.length,
        })),
        parseErrors,
        totalItems,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.patch("/:id", requirePermission("products", "UPDATE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.supplierCatalog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Catalogo non trovato");

    const data = z
      .object({
        supplierId: z.string().nullable().optional(),
        supplierName: z.string().optional(),
        title: z.string().optional(),
        kind: kindSchema.optional(),
        description: z.string().nullable().optional(),
        defaultDiscountPercent: z.number().min(0).max(100).optional(),
        validFrom: z.string().datetime().nullable().optional(),
        validTo: z.string().datetime().nullable().optional(),
        isActive: z.boolean().optional(),
        items: z.array(itemSchema).optional(),
      })
      .parse(req.body);

    if (data.items) {
      await prisma.supplierCatalogItem.deleteMany({ where: { catalogId: id } });
    }

    const catalog = await prisma.supplierCatalog.update({
      where: { id },
      data: {
        ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
        ...(data.supplierName !== undefined && {
          supplierName: data.supplierName.trim(),
        }),
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.kind !== undefined && { kind: data.kind }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.defaultDiscountPercent !== undefined && {
          defaultDiscountPercent: data.defaultDiscountPercent,
        }),
        ...(data.validFrom !== undefined && {
          validFrom: data.validFrom ? new Date(data.validFrom) : null,
        }),
        ...(data.validTo !== undefined && {
          validTo: data.validTo ? new Date(data.validTo) : null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.items
          ? {
              items: {
                create: data.items.map((item, i) => ({
                  sortOrder: item.sortOrder ?? i,
                  sku: item.sku?.trim() || null,
                  name: item.name.trim(),
                  unit: item.unit?.trim() || null,
                  listPrice: item.listPrice,
                  discountPercent:
                    item.discountPercent ??
                    data.defaultDiscountPercent ??
                    Number(existing.defaultDiscountPercent) ??
                    0,
                  notes: item.notes?.trim() || null,
                })),
              },
            }
          : {}),
      },
      include: catalogInclude,
    });
    res.json(catalog);
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/:id/items/:itemId",
  requirePermission("products", "UPDATE"),
  async (req, res, next) => {
    try {
      const catalogId = paramId(req);
      const itemId = String(req.params.itemId || "");
      const data = itemPatchSchema.parse(req.body);
      const existing = await prisma.supplierCatalogItem.findFirst({
        where: { id: itemId, catalogId },
      });
      if (!existing) throw new NotFoundError("Voce catalogo non trovata");
      const item = await prisma.supplierCatalogItem.update({
        where: { id: itemId },
        data: {
          ...(data.sku !== undefined ? { sku: data.sku?.trim() || null } : {}),
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.unit !== undefined
            ? { unit: data.unit?.trim() || null }
            : {}),
          ...(data.listPrice !== undefined ? { listPrice: data.listPrice } : {}),
          ...(data.discountPercent !== undefined
            ? { discountPercent: data.discountPercent }
            : {}),
          ...(data.sellPrice !== undefined
            ? { sellPrice: data.sellPrice }
            : {}),
          ...(data.notes !== undefined
            ? { notes: data.notes?.trim() || null }
            : {}),
          ...(data.productLine !== undefined
            ? { productLine: data.productLine?.trim() || null }
            : {}),
        },
      });
      res.json(item);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id/items/:itemId",
  requirePermission("products", "DELETE"),
  async (req, res, next) => {
    try {
      const catalogId = paramId(req);
      const itemId = String(req.params.itemId || "");
      const existing = await prisma.supplierCatalogItem.findFirst({
        where: { id: itemId, catalogId },
      });
      if (!existing) throw new NotFoundError("Voce catalogo non trovata");
      await prisma.supplierCatalogItem.delete({ where: { id: itemId } });
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/:id", requirePermission("products", "DELETE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.supplierCatalog.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!existing) throw new NotFoundError("Catalogo non trovato");
    for (const f of existing.files) unlinkQuiet(f.filePath);
    unlinkQuiet(existing.filePath);
    await prisma.supplierCatalog.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
