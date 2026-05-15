import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { NotFoundError } from "../utils/errors.js";

const router = Router();
router.use(authenticate);

async function generateNumber(prefix: string, model: "intervention" | "report") {
  const year = new Date().getFullYear();
  const count =
    model === "intervention"
      ? await prisma.intervention.count()
      : await prisma.interventionReport.count();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

router.get("/", requirePermission("interventions", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.user!.role === "TECHNICIAN") {
      where.technicianId = req.user!.userId;
    }
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const interventions = await prisma.intervention.findMany({
      where,
      include: {
        client: { select: { companyName: true, contactName: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });
    res.json(interventions);
  } catch (e) {
    next(e);
  }
});

router.get("/reports", requirePermission("reports", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.user!.role === "TECHNICIAN") {
      where.technicianId = req.user!.userId;
    }
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const reports = await prisma.interventionReport.findMany({
      where,
      include: {
        client: { select: { companyName: true, contactName: true } },
        technician: { select: { firstName: true, lastName: true } },
        materials: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("interventions", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        clientId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        technicianId: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        location: z.string().optional(),
      })
      .parse(req.body);

    const number = await generateNumber("INT", "intervention");
    const intervention = await prisma.intervention.create({
      data: {
        ...data,
        number,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        technicianId: data.technicianId || req.user!.userId,
      },
      include: { client: true },
    });
    res.status(201).json(intervention);
  } catch (e) {
    next(e);
  }
});

router.post("/reports", requirePermission("reports", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        clientId: z.string(),
        interventionId: z.string().optional(),
        description: z.string().optional(),
        workHours: z.number().optional(),
        checklist: z.any().optional(),
        materials: z
          .array(
            z.object({
              productId: z.string().optional(),
              name: z.string(),
              quantity: z.number(),
              unit: z.string().optional(),
            })
          )
          .optional(),
        technicianSignature: z.string().optional(),
        clientSignature: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .parse(req.body);

    const number = await generateNumber("RPT", "report");
    const report = await prisma.interventionReport.create({
      data: {
        number,
        clientId: data.clientId,
        interventionId: data.interventionId,
        technicianId: req.user!.userId,
        description: data.description,
        workHours: data.workHours || 0,
        checklist: data.checklist,
        technicianSignature: data.technicianSignature,
        clientSignature: data.clientSignature,
        latitude: data.latitude,
        longitude: data.longitude,
        status: "SUBMITTED",
        submittedAt: new Date(),
        materials: data.materials
          ? {
              create: data.materials.map((m) => ({
                productId: m.productId,
                name: m.name,
                quantity: m.quantity,
                unit: m.unit || "pz",
              })),
            }
          : undefined,
      },
      include: { materials: true, client: true },
    });

    if (data.materials?.length) {
      for (const m of data.materials) {
        if (!m.productId) continue;
        const inv = await prisma.inventory.findUnique({
          where: { productId: m.productId },
        });
        if (inv) {
          const newQty = Math.max(0, Number(inv.quantity) - m.quantity);
          await prisma.inventory.update({
            where: { id: inv.id },
            data: { quantity: newQty },
          });
          await prisma.inventoryMovement.create({
            data: {
              inventoryId: inv.id,
              type: "OUT",
              quantity: m.quantity,
              reference: report.number,
              notes: "Scarico automatico da report",
              createdById: req.user!.userId,
            },
          });
        }
      }
    }

    res.status(201).json(report);
  } catch (e) {
    next(e);
  }
});

export default router;
