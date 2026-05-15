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
      const s = (search as string).toLowerCase();
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

router.get("/products", requirePermission("products", "READ"), async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { inventory: true, supplier: true },
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
});

router.get("/services", requirePermission("services", "READ"), async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json(services);
  } catch (e) {
    next(e);
  }
});

export default router;
