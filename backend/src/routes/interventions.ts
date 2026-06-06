import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import {
  assertCanEditDocumentCreatedAt,
  canEditDocumentCreatedAt,
} from "../services/documentSequence.js";
import { deleteInterventionById } from "../services/deleteIntervention.js";
import { deleteReportById } from "../services/deleteReport.js";
import { dispatchReportEmail } from "../services/reportEmail.js";
import { generateReportPdf } from "../services/reportPdf.js";
import { loadCompanySettings } from "../services/quotePdf.js";
import { toDecimal } from "../services/quoteCalculator.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

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

function reportAccessWhere(req: AuthRequest, id?: string) {
  const where: Record<string, unknown> = {};
  if (id) where.id = id;
  if (req.user!.role === "TECHNICIAN") {
    where.technicianId = req.user!.userId;
  }
  if (req.user!.role === "CLIENT" && req.user!.clientId) {
    where.clientId = req.user!.clientId;
  }
  return where;
}

const reportQuoteInclude = {
  select: {
    id: true,
    number: true,
    title: true,
    status: true,
    total: true,
    eventAt: true,
    eventEndAt: true,
    eventLocation: true,
    validUntil: true,
    items: {
      orderBy: { sortOrder: "asc" as const },
      select: {
        description: true,
        quantity: true,
        unit: true,
        unitPrice: true,
        total: true,
      },
    },
  },
};

async function assertQuoteForClient(
  quoteId: string | undefined | null,
  clientId: string
) {
  if (!quoteId) return;
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { clientId: true },
  });
  if (!quote) throw new ValidationError("Preventivo non trovato");
  if (quote.clientId !== clientId) {
    throw new ValidationError(
      "Il preventivo non appartiene al cliente selezionato"
    );
  }
}

async function assertInterventionForClient(
  interventionId: string | undefined | null,
  clientId: string
) {
  if (!interventionId) return;
  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    select: { clientId: true },
  });
  if (!intervention) throw new ValidationError("Intervento non trovato");
  if (intervention.clientId !== clientId) {
    throw new ValidationError(
      "L'intervento non appartiene al cliente selezionato"
    );
  }
}

async function loadReportForAction(req: AuthRequest, id: string) {
  const report = await prisma.interventionReport.findFirst({
    where: reportAccessWhere(req, id),
    include: {
      client: true,
      quote: reportQuoteInclude,
      technician: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      materials: true,
    },
  });
  if (!report) throw new NotFoundError();
  return report;
}

const reportBodySchema = z.object({
  clientId: z.string(),
  quoteId: z.string().optional().nullable(),
  interventionId: z.string().optional(),
  description: z.string().optional(),
  workHours: z.number().optional(),
  kmTraveled: z.number().min(0).optional(),
  expensesAmount: z.number().min(0).optional(),
  expensesNotes: z.string().optional(),
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
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
});

const reportPatchSchema = z.object({
  quoteId: z.string().optional().nullable(),
  description: z.string().optional(),
  workHours: z.number().optional(),
  kmTraveled: z.number().min(0).optional(),
  expensesAmount: z.number().min(0).optional(),
  expensesNotes: z.string().optional(),
  checklist: z.any().optional(),
  technicianSignature: z.string().optional(),
  clientSignature: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "ARCHIVED"]).optional(),
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
});

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
    const reports = await prisma.interventionReport.findMany({
      where: reportAccessWhere(req),
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

router.post(
  "/reports/draft",
  requirePermission("reports", "CREATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const data = reportBodySchema.parse(req.body);
      await assertQuoteForClient(data.quoteId, data.clientId);
      await assertInterventionForClient(data.interventionId, data.clientId);
      const number = await generateNumber("RPT", "report");

      const report = await prisma.interventionReport.create({
        data: {
          number,
          clientId: data.clientId,
          quoteId: data.quoteId || null,
          interventionId: data.interventionId,
          technicianId: req.user!.userId,
          description: data.description,
          workHours: data.workHours ?? 0,
          kmTraveled: toDecimal(data.kmTraveled ?? 0),
          expensesAmount: toDecimal(data.expensesAmount ?? 0),
          expensesNotes: data.expensesNotes,
          checklist: data.checklist,
          technicianSignature: data.technicianSignature,
          clientSignature: data.clientSignature,
          latitude: data.latitude,
          longitude: data.longitude,
          checkInAt: data.checkInAt ? new Date(data.checkInAt) : undefined,
          checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : undefined,
          status: "DRAFT",
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
        include: { materials: true, client: true, quote: reportQuoteInclude },
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: data.clientId,
        action: "CREATE",
        entityType: "report",
        entityId: report.id,
        details: { status: "DRAFT", quoteId: data.quoteId || null },
      });

      res.status(201).json(report);
    } catch (e) {
      next(e);
    }
  }
);

router.get("/reports/:id", requirePermission("reports", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const report = await prisma.interventionReport.findFirst({
      where: reportAccessWhere(req, paramId(req)),
      include: {
        client: true,
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        materials: { include: { product: true } },
        quote: reportQuoteInclude,
        intervention: {
          include: {
            client: true,
            technician: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
    if (!report) throw new NotFoundError();
    res.json({
      ...report,
      canEditCreatedAt: await canEditDocumentCreatedAt("report", report.number),
    });
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/reports/:id",
  requirePermission("reports", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const data = reportPatchSchema.parse(req.body);
      const existing = await loadReportForAction(req, paramId(req));

      if (data.quoteId !== undefined) {
        await assertQuoteForClient(data.quoteId, existing.clientId);
      }

      if (existing.status !== "DRAFT" && data.status === undefined) {
        const allowed =
          req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
        if (!allowed) {
          throw new ValidationError("Solo i report in bozza sono modificabili");
        }
      }

      if (data.createdAt) {
        await assertCanEditDocumentCreatedAt(
          "report",
          existing.number,
          existing.createdAt,
          new Date(data.createdAt)
        );
      }

      const report = await prisma.$transaction(async (tx) => {
        if (data.materials) {
          await tx.reportMaterial.deleteMany({
            where: { reportId: existing.id },
          });
        }

        return tx.interventionReport.update({
          where: { id: existing.id },
          data: {
            ...(data.quoteId !== undefined && {
              quoteId: data.quoteId || null,
            }),
            description: data.description,
            workHours:
              data.workHours != null ? toDecimal(data.workHours) : undefined,
            kmTraveled:
              data.kmTraveled != null ? toDecimal(data.kmTraveled) : undefined,
            expensesAmount:
              data.expensesAmount != null
                ? toDecimal(data.expensesAmount)
                : undefined,
            expensesNotes: data.expensesNotes,
            checklist: data.checklist,
            technicianSignature: data.technicianSignature,
            clientSignature: data.clientSignature,
            latitude: data.latitude,
            longitude: data.longitude,
            checkInAt: data.checkInAt ? new Date(data.checkInAt) : undefined,
            checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : undefined,
            ...(data.createdAt !== undefined && {
              createdAt: new Date(data.createdAt),
            }),
            status: data.status,
            ...(data.status === "SUBMITTED" && { submittedAt: new Date() }),
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
          include: {
            materials: true,
            client: true,
            quote: reportQuoteInclude,
          },
        });
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: report.clientId,
        action: "UPDATE",
        entityType: "report",
        entityId: report.id,
      });

      res.json({
        ...report,
        canEditCreatedAt: await canEditDocumentCreatedAt("report", report.number),
      });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/reports/:id/pdf",
  requirePermission("reports", "READ"),
  async (req: AuthRequest, res, next) => {
    try {
      const report = await loadReportForAction(req, paramId(req));
      const company = await loadCompanySettings();
      const pdf = await generateReportPdf(report, company);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="report-${report.number}.pdf"`
      );
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/reports/:id/send-email",
  requirePermission("reports", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const report = await loadReportForAction(req, paramId(req));
      const { to } = await dispatchReportEmail(report);

      await logActivity({
        userId: req.user!.userId,
        clientId: report.clientId,
        action: "SEND_EMAIL",
        entityType: "report",
        entityId: report.id,
        details: { to },
      });

      res.json({
        success: true,
        mock: false,
        message: `Email inviata a ${to}`,
        to,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/reports/:id",
  requirePermission("reports", "DELETE"),
  async (req: AuthRequest, res, next) => {
    try {
      const report = await loadReportForAction(req, paramId(req));
      await deleteReportById(report.id);
      await logActivity({
        userId: req.user!.userId,
        clientId: report.clientId,
        action: "DELETE",
        entityType: "report",
        entityId: report.id,
        details: { number: report.number },
      });
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

router.post("/reports", requirePermission("reports", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = reportBodySchema.parse(req.body);
    await assertQuoteForClient(data.quoteId, data.clientId);
    await assertInterventionForClient(data.interventionId, data.clientId);

    const number = await generateNumber("RPT", "report");
    const report = await prisma.interventionReport.create({
      data: {
        number,
        clientId: data.clientId,
        quoteId: data.quoteId || null,
        interventionId: data.interventionId,
        technicianId: req.user!.userId,
        description: data.description,
        workHours: data.workHours || 0,
        kmTraveled: data.kmTraveled != null ? toDecimal(data.kmTraveled) : 0,
        expensesAmount:
          data.expensesAmount != null ? toDecimal(data.expensesAmount) : 0,
        expensesNotes: data.expensesNotes,
        checklist: data.checklist,
        technicianSignature: data.technicianSignature,
        clientSignature: data.clientSignature,
        latitude: data.latitude,
        longitude: data.longitude,
        checkInAt: data.checkInAt ? new Date(data.checkInAt) : undefined,
        checkOutAt: data.checkOutAt ? new Date(data.checkOutAt) : undefined,
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

    await logActivity({
      userId: req.user!.userId,
      clientId: data.clientId,
      action: "CREATE",
      entityType: "report",
      entityId: report.id,
      details: { status: "SUBMITTED" },
    });

    res.status(201).json(report);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("interventions", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const where: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "TECHNICIAN") {
      where.technicianId = req.user!.userId;
    }
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }

    const intervention = await prisma.intervention.findFirst({
      where,
      include: {
        client: true,
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reports: {
          include: {
            materials: { include: { product: true } },
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!intervention) throw new NotFoundError();
    res.json(intervention);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("interventions", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum([
            "SCHEDULED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
            "ON_HOLD",
          ])
          .optional(),
        technicianId: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        location: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        startedAt: z.string().datetime().optional(),
        completedAt: z.string().datetime().optional(),
      })
      .parse(req.body);

    const where: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "TECHNICIAN") {
      where.technicianId = req.user!.userId;
    }

    const existing = await prisma.intervention.findFirst({ where });
    if (!existing) throw new NotFoundError();

    const intervention = await prisma.intervention.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        technicianId: data.technicianId,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      },
      include: { client: true, technician: true },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId: intervention.clientId,
      action: "UPDATE",
      entityType: "intervention",
      entityId: intervention.id,
    });

    res.json(intervention);
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

    await logActivity({
      userId: req.user!.userId,
      clientId: data.clientId,
      action: "CREATE",
      entityType: "intervention",
      entityId: intervention.id,
    });

    res.status(201).json(intervention);
  } catch (e) {
    next(e);
  }
});

router.delete(
  "/:id",
  requirePermission("interventions", "DELETE"),
  async (req: AuthRequest, res, next) => {
    try {
      const where: Record<string, unknown> = { id: paramId(req) };
      if (req.user!.role === "TECHNICIAN") {
        where.technicianId = req.user!.userId;
      }
      const existing = await prisma.intervention.findFirst({ where });
      if (!existing) throw new NotFoundError();

      await deleteInterventionById(existing.id);
      await logActivity({
        userId: req.user!.userId,
        clientId: existing.clientId,
        action: "DELETE",
        entityType: "intervention",
        entityId: existing.id,
        details: { number: existing.number },
      });
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
