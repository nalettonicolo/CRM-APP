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

const catalogDir = path.join(config.upload.dir, "supplier-catalogs");

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
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.originalname);
    cb(null, ok);
  },
});

const router = Router();
router.use(authenticate);

const kindSchema = z.enum(["PDF", "PRICE_LIST"]);

const itemSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1),
  unit: z.string().optional(),
  listPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const catalogInclude = {
  supplier: { select: { id: true, name: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
};

router.get("/", requirePermission("products", "READ"), async (req, res, next) => {
  try {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const catalogs = await prisma.supplierCatalog.findMany({
      where: {
        ...(kind ? { kind: kind as never } : {}),
        isActive: true,
      },
      include: catalogInclude,
      orderBy: { updatedAt: "desc" },
    });
    res.json(catalogs);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("products", "READ"), async (req, res, next) => {
  try {
    const catalog = await prisma.supplierCatalog.findUnique({
      where: { id: paramId(req) },
      include: catalogInclude,
    });
    if (!catalog) throw new NotFoundError("Catalogo non trovato");
    res.json(catalog);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("products", "CREATE"), async (req, res, next) => {
  try {
    const data = z
      .object({
        supplierId: z.string().optional(),
        supplierName: z.string().min(1),
        title: z.string().min(1),
        kind: kindSchema.default("PRICE_LIST"),
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

router.post(
  "/:id/pdf",
  requirePermission("products", "UPDATE"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.supplierCatalog.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Catalogo non trovato");
      if (!req.file) throw new ValidationError("File PDF mancante");

      if (existing.filePath) {
        const abs = path.join(config.upload.dir, existing.filePath.replace(/^\/uploads\//, ""));
        // path stored as /uploads/supplier-catalogs/...
        const fileAbs = path.join(
          config.upload.dir,
          "..",
          existing.filePath.replace(/^\//, "")
        );
        // Prefer relative under upload.dir
        const preferred = path.join(
          config.upload.dir,
          existing.filePath.replace(/^\/?uploads\//, "")
        );
        for (const p of [preferred, fileAbs, abs]) {
          try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          } catch {
            /* ignore */
          }
        }
      }

      const relative = `/uploads/supplier-catalogs/${req.file.filename}`;
      const catalog = await prisma.supplierCatalog.update({
        where: { id },
        data: {
          kind: "PDF",
          filePath: relative,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        },
        include: catalogInclude,
      });
      res.json(catalog);
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

router.delete("/:id", requirePermission("products", "DELETE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.supplierCatalog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Catalogo non trovato");
    await prisma.supplierCatalog.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
