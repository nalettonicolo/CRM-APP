import { Router } from "express";
import { z } from "zod";
import { prisma, prismaCrm } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { generateSequentialDocumentNumber } from "../services/documentSequence.js";
import { findScheduleConflicts } from "../services/eventConflicts.js";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

const statusSchema = z.enum([
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "INVOICED",
]);

const jobInclude = {
  client: {
    select: { id: true, companyName: true, contactName: true },
  },
  quote: { select: { id: true, number: true, title: true } },
  createdBy: { select: { firstName: true, lastName: true } },
  dailyReports: {
    orderBy: { workDate: "asc" as const },
  },
  _count: { select: { dailyReports: true, invoicePreviews: true } },
};

router.get("/", requirePermission("interventions", "READ"), async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const clientId =
      typeof req.query.clientId === "string" ? req.query.clientId : undefined;
    const jobs = await prisma.jobOrder.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: jobInclude,
      orderBy: [{ plannedStart: "desc" }, { createdAt: "desc" }],
    });
    res.json(jobs);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("interventions", "READ"), async (req, res, next) => {
  try {
    const job = await prisma.jobOrder.findUnique({
      where: { id: paramId(req) },
      include: jobInclude,
    });
    if (!job) throw new NotFoundError("Commessa non trovata");
    res.json(job);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("interventions", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        clientId: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        workType: z.string().optional(),
        quoteId: z.string().optional(),
        plannedStart: z.string().datetime().optional(),
        plannedEnd: z.string().datetime().optional(),
        estimatedDays: z.number().int().positive().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        status: statusSchema.optional(),
        scheduleDays: z.boolean().optional(),
        allowOverlap: z.boolean().optional(),
      })
      .parse(req.body);

    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new ValidationError("Cliente non valido");

    const number = await generateSequentialDocumentNumber("jobOrder", {
      prefix: "COM",
    });

    const plannedStart = data.plannedStart ? new Date(data.plannedStart) : null;
    const plannedEnd = data.plannedEnd ? new Date(data.plannedEnd) : null;

    const job = await prisma.jobOrder.create({
      data: {
        number,
        clientId: data.clientId,
        createdById: req.user!.userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        workType: data.workType?.trim() || null,
        quoteId: data.quoteId || null,
        plannedStart,
        plannedEnd,
        estimatedDays: data.estimatedDays ?? null,
        location: data.location?.trim() || null,
        notes: data.notes?.trim() || null,
        status: data.status ?? (plannedStart ? "PLANNED" : "DRAFT"),
      },
      include: jobInclude,
    });

    // Opzionale: blocca i giorni sul calendario CRM condiviso
    if (data.scheduleDays && plannedStart) {
      const days =
        data.estimatedDays ||
        (plannedEnd
          ? Math.max(
              1,
              Math.ceil(
                (plannedEnd.getTime() - plannedStart.getTime()) / (24 * 60 * 60 * 1000)
              ) + 1
            )
          : 1);

      for (let i = 0; i < days; i++) {
        const day = new Date(plannedStart);
        day.setHours(8, 0, 0, 0);
        day.setDate(day.getDate() + i);
        const dayEnd = new Date(day);
        dayEnd.setHours(18, 0, 0, 0);

        if (!data.allowOverlap) {
          const conflicts = await findScheduleConflicts({
            startAt: day,
            endAt: dayEnd,
          });
          if (conflicts.length) {
            throw new ConflictError(
              `Il giorno ${day.toLocaleDateString("it-IT")} è già occupato. Conferma per forzare.`,
              conflicts
            );
          }
        }

        await prismaCrm.event.create({
          data: {
            title: `Commessa ${job.number}: ${job.title}`,
            description: `Commessa IE ${job.number}`,
            type: "INTERVENTION",
            startAt: day,
            endAt: dayEnd,
            location: job.location || undefined,
            color: "#0284c7",
          },
        });

        const reportNumber = await generateSequentialDocumentNumber("dailyReport", {
          prefix: "RG",
        });
        await prisma.jobDailyReport.create({
          data: {
            number: reportNumber,
            jobOrderId: job.id,
            authorId: req.user!.userId,
            workDate: day,
            status: "DRAFT",
            description: `Report giornaliero — giorno ${i + 1}/${days}`,
          },
        });
      }
    }

    const refreshed = await prisma.jobOrder.findUnique({
      where: { id: job.id },
      include: jobInclude,
    });
    res.status(201).json(refreshed);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("interventions", "UPDATE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.jobOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Commessa non trovata");

    const data = z
      .object({
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        workType: z.string().nullable().optional(),
        status: statusSchema.optional(),
        plannedStart: z.string().datetime().nullable().optional(),
        plannedEnd: z.string().datetime().nullable().optional(),
        estimatedDays: z.number().int().positive().nullable().optional(),
        location: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        quoteId: z.string().nullable().optional(),
      })
      .parse(req.body);

    const job = await prisma.jobOrder.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.workType !== undefined && {
          workType: data.workType?.trim() || null,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.plannedStart !== undefined && {
          plannedStart: data.plannedStart ? new Date(data.plannedStart) : null,
        }),
        ...(data.plannedEnd !== undefined && {
          plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : null,
        }),
        ...(data.estimatedDays !== undefined && {
          estimatedDays: data.estimatedDays,
        }),
        ...(data.location !== undefined && {
          location: data.location?.trim() || null,
        }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        ...(data.quoteId !== undefined && { quoteId: data.quoteId }),
      },
      include: jobInclude,
    });
    res.json(job);
  } catch (e) {
    next(e);
  }
});

router.post(
  "/:id/reports",
  requirePermission("reports", "CREATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const jobId = paramId(req);
      const job = await prisma.jobOrder.findUnique({ where: { id: jobId } });
      if (!job) throw new NotFoundError("Commessa non trovata");

      const data = z
        .object({
          workDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
          description: z.string().optional(),
          workHours: z.number().nonnegative().optional(),
          expensesAmount: z.number().nonnegative().optional(),
          expensesNotes: z.string().optional(),
          materials: z.any().optional(),
          notes: z.string().optional(),
          status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "ARCHIVED"]).optional(),
          blockCalendar: z.boolean().optional(),
          allowOverlap: z.boolean().optional(),
        })
        .parse(req.body);

      const workDate = new Date(data.workDate);
      workDate.setHours(12, 0, 0, 0);

      const number = await generateSequentialDocumentNumber("dailyReport", {
        prefix: "RG",
      });

      if (data.blockCalendar) {
        const startAt = new Date(workDate);
        startAt.setHours(8, 0, 0, 0);
        const endAt = new Date(workDate);
        endAt.setHours(18, 0, 0, 0);
        if (!data.allowOverlap) {
          const conflicts = await findScheduleConflicts({ startAt, endAt });
          if (conflicts.length) {
            throw new ConflictError(
              "Giorno già occupato in calendario. Conferma per forzare.",
              conflicts
            );
          }
        }
        await prismaCrm.event.create({
          data: {
            title: `Commessa ${job.number}: ${job.title}`,
            description: `Report giornaliero ${number}`,
            type: "INTERVENTION",
            startAt,
            endAt,
            location: job.location || undefined,
            color: "#0284c7",
          },
        });
      }

      const report = await prisma.jobDailyReport.create({
        data: {
          number,
          jobOrderId: jobId,
          authorId: req.user!.userId,
          workDate,
          description: data.description?.trim() || null,
          workHours: data.workHours ?? 0,
          expensesAmount: data.expensesAmount ?? 0,
          expensesNotes: data.expensesNotes?.trim() || null,
          materials: data.materials ?? undefined,
          notes: data.notes?.trim() || null,
          status: data.status ?? "DRAFT",
          submittedAt: data.status === "SUBMITTED" ? new Date() : null,
        },
      });

      if (job.status === "DRAFT" || job.status === "PLANNED") {
        await prisma.jobOrder.update({
          where: { id: jobId },
          data: { status: "IN_PROGRESS" },
        });
      }

      res.status(201).json(report);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/:id/reports/:reportId",
  requirePermission("reports", "UPDATE"),
  async (req, res, next) => {
    try {
      const jobId = paramId(req);
      const reportId = String(req.params.reportId);
      const existing = await prisma.jobDailyReport.findFirst({
        where: { id: reportId, jobOrderId: jobId },
      });
      if (!existing) throw new NotFoundError("Report non trovato");

      const data = z
        .object({
          description: z.string().nullable().optional(),
          workHours: z.number().nonnegative().optional(),
          expensesAmount: z.number().nonnegative().optional(),
          expensesNotes: z.string().nullable().optional(),
          materials: z.any().optional(),
          notes: z.string().nullable().optional(),
          status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "ARCHIVED"]).optional(),
        })
        .parse(req.body);

      const report = await prisma.jobDailyReport.update({
        where: { id: reportId },
        data: {
          ...(data.description !== undefined && {
            description: data.description?.trim() || null,
          }),
          ...(data.workHours !== undefined && { workHours: data.workHours }),
          ...(data.expensesAmount !== undefined && {
            expensesAmount: data.expensesAmount,
          }),
          ...(data.expensesNotes !== undefined && {
            expensesNotes: data.expensesNotes?.trim() || null,
          }),
          ...(data.materials !== undefined && { materials: data.materials }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
          ...(data.status !== undefined && {
            status: data.status,
            submittedAt:
              data.status === "SUBMITTED" ? new Date() : existing.submittedAt,
          }),
        },
      });
      res.json(report);
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/:id", requirePermission("interventions", "DELETE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.jobOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Commessa non trovata");
    await prisma.jobOrder.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
