import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { toDecimal } from "../services/quoteCalculator.js";
import { logActivity } from "../services/activityLog.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import { hasPermission } from "../utils/permissions.js";
import { isRentalCategory, RENTAL_UNIT } from "../constants/rental.js";
import { sanitizeSearchTerm } from "../utils/queryInput.js";

function requireCatalogDelete(resource: "products" | "services") {
  return (req: AuthRequest, _res: import("express").Response, next: import("express").NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError());
      return;
    }
    const role = req.user.role;
    if (
      hasPermission(role, resource, "DELETE") ||
      hasPermission(role, "inventory", "DELETE") ||
      hasPermission(role, resource, "*") ||
      hasPermission(role, "inventory", "*")
    ) {
      next();
      return;
    }
    next(
      new ForbiddenError(
        "Non hai il permesso di eliminare voci dal catalogo. Contatta un amministratore."
      )
    );
  };
}

async function performServiceDelete(req: AuthRequest, id: string) {
  const existing = await prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { quoteItems: true } } },
  });
  if (!existing) throw new NotFoundError("Servizio non trovato");

  try {
    await prisma.$transaction(async (tx) => {
      if (existing._count.quoteItems > 0) {
        await tx.quoteItem.updateMany({
          where: { serviceId: id },
          data: { serviceId: null },
        });
      }
      await tx.service.delete({ where: { id } });
    });
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "P2003") {
      throw new ValidationError(
        "Impossibile eliminare il servizio: è ancora collegato ad altri dati."
      );
    }
    throw e;
  }

  await logActivity({
    userId: req.user!.userId,
    action: "DELETE",
    entityType: "service",
    entityId: id,
    details: { name: existing.name },
  });

  return { success: true as const };
}

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("inventory", "READ"), async (req, res, next) => {
  try {
    const { search, lowStock } = req.query;
    const items = await prisma.inventory.findMany({
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    let filtered = items;
    if (search) {
      const s = sanitizeSearchTerm(search).toLowerCase();
      filtered = items.filter((i: (typeof items)[number]) =>
          i.product.name.toLowerCase().includes(s) ||
          i.product.sku.toLowerCase().includes(s)
      );
    }
    if (lowStock === "true") {
      filtered = filtered.filter((i: (typeof items)[number]) =>
        Number(i.quantity) <= Number(i.minStock)
      );
    }

    res.json(filtered);
  } catch (e) {
    next(e);
  }
});

router.post("/movements", requirePermission("inventory", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        inventoryId: z.string(),
        type: z.enum(["IN", "OUT", "ADJUSTMENT", "TRANSFER", "RESERVATION", "RELEASE"]),
        quantity: z.number().positive(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const inventory = await prisma.inventory.findUnique({
      where: { id: body.inventoryId },
    });
    if (!inventory) throw new Error("Inventario non trovato");

    const qty = Number(body.quantity);
    let newQty = Number(inventory.quantity);

    if (["IN", "RELEASE"].includes(body.type)) newQty += qty;
    else if (["OUT", "RESERVATION"].includes(body.type)) {
      if (newQty < qty) throw new Error("Stock insufficiente");
      newQty -= qty;
    } else if (body.type === "ADJUSTMENT") newQty = qty;

    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryId: body.inventoryId,
          type: body.type,
          quantity: toDecimal(body.quantity),
          reference: body.reference,
          notes: body.notes,
          createdById: req.user!.userId,
        },
      }),
      prisma.inventory.update({
        where: { id: body.inventoryId },
        data: { quantity: toDecimal(newQty) },
      }),
    ]);

    await logActivity({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "inventory",
      entityId: body.inventoryId,
      details: { type: body.type, quantity: body.quantity },
    });

    res.status(201).json(movement);
  } catch (e) {
    next(e);
  }
});

const productInclude = {
  inventory: true,
  supplier: true,
} as const;

router.get("/products", requirePermission("products", "READ"), async (req, res, next) => {
  try {
    const excludeRental =
      req.query.excludeRental === "1" || req.query.excludeRental === "true";
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(excludeRental
          ? {
              isRentable: false,
              OR: [
                { category: null },
                {
                  NOT: {
                    category: {
                      startsWith: "Noleggio",
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
});

router.get("/rentals", requirePermission("products", "READ"), async (_req, res, next) => {
  try {
    const rentals = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { isRentable: true },
          {
            category: {
              startsWith: "Noleggio",
              mode: "insensitive",
            },
          },
        ],
      },
      include: productInclude,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json(rentals);
  } catch (e) {
    next(e);
  }
});

router.get("/services", requirePermission("services", "READ"), async (req, res, next) => {
  try {
    const all = req.query.all === "1" || req.query.all === "true";
    const services = await prisma.service.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json(services);
  } catch (e) {
    next(e);
  }
});

router.get("/warehouses", requirePermission("inventory", "READ"), async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });
    res.json(warehouses);
  } catch (e) {
    next(e);
  }
});

router.post("/products", requirePermission("products", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        name: z.string(),
        sku: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        isRentable: z.boolean().optional(),
        unit: z.string().optional(),
        price: z.number(),
        cost: z.number().optional(),
        vatRate: z.number().optional(),
        supplierId: z.string().optional(),
        barcode: z.string().optional(),
        warehouseId: z.string().optional(),
        initialQty: z.number().optional(),
      })
      .parse(req.body);

    const isRentable =
      data.isRentable === true || isRentalCategory(data.category);
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        description: data.description,
        category: data.category,
        isRentable,
        unit: isRentable ? data.unit?.trim() || RENTAL_UNIT : data.unit?.trim(),
        price: toDecimal(data.price),
        cost: data.cost != null ? toDecimal(data.cost) : undefined,
        vatRate: toDecimal(data.vatRate ?? 22),
        supplierId: data.supplierId,
        barcode: data.barcode,
      },
    });

    if (data.warehouseId) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          warehouseId: data.warehouseId,
          quantity: toDecimal(data.initialQty ?? 0),
        },
      });
    }

    await logActivity({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "product",
      entityId: product.id,
    });

    res.status(201).json(product);
  } catch (e) {
    next(e);
  }
});

router.patch("/products/:id", requirePermission("products", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        isRentable: z.boolean().optional(),
        unit: z.string().optional(),
        price: z.number().optional(),
        cost: z.number().optional(),
        vatRate: z.number().optional(),
        supplierId: z.string().optional(),
        barcode: z.string().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const existing = await prisma.product.findUnique({ where: { id: paramId(req) } });
    if (!existing) throw new NotFoundError();

    const nextCategory =
      data.category !== undefined ? data.category : existing.category;
    const isRentable =
      data.isRentable !== undefined
        ? data.isRentable
        : existing.isRentable || isRentalCategory(nextCategory);

    const product = await prisma.product.update({
      where: { id: paramId(req) },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        isRentable,
        unit:
          data.unit !== undefined
            ? data.unit.trim() || null
            : isRentable
              ? existing.unit || RENTAL_UNIT
              : undefined,
        price: data.price != null ? toDecimal(data.price) : undefined,
        cost: data.cost != null ? toDecimal(data.cost) : undefined,
        vatRate: data.vatRate != null ? toDecimal(data.vatRate) : undefined,
        supplierId: data.supplierId,
        barcode: data.barcode,
        isActive: data.isActive,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "product",
      entityId: product.id,
    });

    res.json(product);
  } catch (e) {
    next(e);
  }
});

router.post("/services", requirePermission("services", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string().optional(),
        price: z.number(),
        unit: z.string().optional(),
        vatRate: z.number().optional(),
        vatExempt: z.boolean().optional(),
        duration: z.number().optional(),
        operatorCost: z.number().optional(),
      })
      .parse(req.body);

    const vatExempt = data.vatExempt === true;
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit?.trim() || undefined,
        price: toDecimal(data.price),
        vatExempt,
        vatRate: toDecimal(vatExempt ? 0 : (data.vatRate ?? 22)),
        duration: data.duration,
        operatorCost:
          data.operatorCost != null ? toDecimal(data.operatorCost) : undefined,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "service",
      entityId: service.id,
    });

    res.status(201).json(service);
  } catch (e) {
    next(e);
  }
});

router.patch("/services/:id", requirePermission("services", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        price: z.number().optional(),
        unit: z.string().optional(),
        vatRate: z.number().optional(),
        vatExempt: z.boolean().optional(),
        duration: z.number().optional(),
        operatorCost: z.number().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const existing = await prisma.service.findUnique({ where: { id: paramId(req) } });
    if (!existing) throw new NotFoundError();

    const vatExempt = data.vatExempt ?? existing.vatExempt;
    const vatRate = vatExempt
      ? 0
      : data.vatRate != null
        ? data.vatRate
        : Number(existing.vatRate);

    const service = await prisma.service.update({
      where: { id: paramId(req) },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        unit:
          data.unit !== undefined
            ? data.unit.trim() || null
            : undefined,
        price: data.price != null ? toDecimal(data.price) : undefined,
        vatExempt: data.vatExempt,
        vatRate: toDecimal(vatRate),
        duration: data.duration,
        operatorCost:
          data.operatorCost != null ? toDecimal(data.operatorCost) : undefined,
        isActive: data.isActive,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "service",
      entityId: service.id,
    });

    res.json(service);
  } catch (e) {
    next(e);
  }
});

router.post("/warehouses", requirePermission("inventory", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        name: z.string(),
        address: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
      .parse(req.body);

    if (data.isDefault) {
      await prisma.warehouse.updateMany({
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: data.name,
        address: data.address,
        isDefault: data.isDefault ?? false,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "warehouse",
      entityId: warehouse.id,
    });

    res.status(201).json(warehouse);
  } catch (e) {
    next(e);
  }
});

router.delete(
  "/products/:id",
  requireCatalogDelete("products"),
  async (req: AuthRequest, res, next) => {
    try {
      const id = paramId(req);
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();

      await prisma.$transaction(async (tx) => {
        await tx.quoteItem.updateMany({
          where: { productId: id },
          data: { productId: null },
        });
        await tx.reportMaterial.updateMany({
          where: { productId: id },
          data: { productId: null },
        });
        await tx.inventory.deleteMany({ where: { productId: id } });
        await tx.product.delete({ where: { id } });
      });

      await logActivity({
        userId: req.user!.userId,
        action: "DELETE",
        entityType: "product",
        entityId: id,
        details: { name: existing.name, sku: existing.sku },
      });

      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

async function handleServiceDelete(req: AuthRequest, res: import("express").Response, next: import("express").NextFunction) {
  try {
    const result = await performServiceDelete(req, paramId(req));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

router.delete(
  "/services/:id",
  requireCatalogDelete("services"),
  handleServiceDelete
);

/** POST senza "/delete" nel path (compatibile proxy Netlify / tunnel). */
router.post(
  "/services/remove",
  requireCatalogDelete("services"),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = z.object({ id: z.string().min(1) }).parse(req.body);
      const result = await performServiceDelete(req, id);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

/** POST alternativo: alcuni proxy/tunnel bloccano DELETE; stessa logica di sopra. */
router.post(
  "/services/:id/delete",
  requireCatalogDelete("services"),
  handleServiceDelete
);

router.patch("/warehouses/:id", requirePermission("inventory", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().optional(),
        address: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
      .parse(req.body);

    const existing = await prisma.warehouse.findUnique({ where: { id: paramId(req) } });
    if (!existing) throw new NotFoundError();

    if (data.isDefault) {
      await prisma.warehouse.updateMany({
        data: { isDefault: false },
      });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: paramId(req) },
      data: {
        name: data.name,
        address: data.address,
        isDefault: data.isDefault,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "warehouse",
      entityId: warehouse.id,
    });

    res.json(warehouse);
  } catch (e) {
    next(e);
  }
});

export default router;
