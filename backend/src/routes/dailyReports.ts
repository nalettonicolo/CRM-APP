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

const reportInclude = {
  jobOrder: {
    select: {
      id: true,
      number: true,
      title: true,
      clientId: true,
      client: {
        select: { id: true, companyName: true, contactName: true },
      },
    },
  },
  author: { select: { firstName: true, lastName: true } },
};

router.get("/", requirePermission("reports", "READ"), async (req, res, next) => {
  try {
    const unlinked = req.query.unlinked === "1" || req.query.unlinked === "true";
    const jobOrderId =
      typeof req.query.jobOrderId === "string" ? req.query.jobOrderId : undefined;

    const reports = await prisma.jobDailyReport.findMany({
      where: {
        ...(unlinked ? { jobOrderId: null } : {}),
        ...(jobOrderId ? { jobOrderId } : {}),
      },
      include: reportInclude,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
    res.json(reports);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requirePermission("reports", "READ"), async (req, res, next) => {
  try {
    const report = await prisma.jobDailyReport.findUnique({
      where: { id: paramId(req) },
      include: reportInclude,
    });
    if (!report) throw new NotFoundError("Report non trovato");
    res.json(report);
  } catch (e) {
    next(e);
  }
});

/** Crea un report giornaliero anche senza commessa (collegabile dopo). */
router.post("/", requirePermission("reports", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        jobOrderId: z.string().optional(),
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

    let job: { id: string; number: string; title: string; location: string | null } | null =
      null;
    if (data.jobOrderId) {
      job = await prisma.jobOrder.findUnique({
        where: { id: data.jobOrderId },
        select: { id: true, number: true, title: true, location: true },
      });
      if (!job) throw new ValidationError("Commessa non valida");
    }

    const workDate = new Date(data.workDate);
    workDate.setHours(12, 0, 0, 0);

    if (data.jobOrderId) {
      const clash = await prisma.jobDailyReport.findFirst({
        where: { jobOrderId: data.jobOrderId, workDate },
      });
      if (clash) {
        throw new ValidationError(
          `Esiste già un report per questa commessa in data ${workDate.toLocaleDateString("it-IT")}`
        );
      }
    }

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
          title: job
            ? `Commessa ${job.number}: ${job.title}`
            : `Report ${number}`,
          description: job
            ? `Report giornaliero ${number}`
            : "Report giornaliero IE (non ancora collegato a commessa)",
          type: "INTERVENTION",
          startAt,
          endAt,
          location: job?.location || undefined,
          color: "#0284c7",
        },
      });
    }

    const report = await prisma.jobDailyReport.create({
      data: {
        number,
        jobOrderId: data.jobOrderId || null,
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
      include: reportInclude,
    });

    if (job && (await prisma.jobOrder.findUnique({ where: { id: job.id } }))) {
      const current = await prisma.jobOrder.findUnique({
        where: { id: job.id },
        select: { status: true },
      });
      if (current?.status === "DRAFT" || current?.status === "PLANNED") {
        await prisma.jobOrder.update({
          where: { id: job.id },
          data: { status: "IN_PROGRESS" },
        });
      }
    }

    res.status(201).json(report);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("reports", "UPDATE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.jobDailyReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Report non trovato");

    const data = z
      .object({
        jobOrderId: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        workHours: z.number().nonnegative().optional(),
        expensesAmount: z.number().nonnegative().optional(),
        expensesNotes: z.string().nullable().optional(),
        materials: z.any().optional(),
        notes: z.string().nullable().optional(),
        workDate: z
          .string()
          .datetime()
          .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
          .optional(),
        status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "ARCHIVED"]).optional(),
      })
      .parse(req.body);

    if (data.jobOrderId) {
      const job = await prisma.jobOrder.findUnique({
        where: { id: data.jobOrderId },
      });
      if (!job) throw new ValidationError("Commessa non valida");

      const workDate = data.workDate
        ? new Date(data.workDate)
        : existing.workDate;
      workDate.setHours(12, 0, 0, 0);

      const clash = await prisma.jobDailyReport.findFirst({
        where: {
          jobOrderId: data.jobOrderId,
          workDate,
          id: { not: id },
        },
      });
      if (clash) {
        throw new ValidationError(
          `Esiste già un report per questa commessa in data ${workDate.toLocaleDateString("it-IT")}`
        );
      }
    }

    const report = await prisma.jobDailyReport.update({
      where: { id },
      data: {
        ...(data.jobOrderId !== undefined && { jobOrderId: data.jobOrderId }),
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
        ...(data.workDate !== undefined && {
          workDate: (() => {
            const d = new Date(data.workDate!);
            d.setHours(12, 0, 0, 0);
            return d;
          })(),
        }),
        ...(data.status !== undefined && {
          status: data.status,
          submittedAt:
            data.status === "SUBMITTED" ? new Date() : existing.submittedAt,
        }),
      },
      include: reportInclude,
    });

    if (data.jobOrderId) {
      const job = await prisma.jobOrder.findUnique({
        where: { id: data.jobOrderId },
        select: { status: true },
      });
      if (job?.status === "DRAFT" || job?.status === "PLANNED") {
        await prisma.jobOrder.update({
          where: { id: data.jobOrderId },
          data: { status: "IN_PROGRESS" },
        });
      }
    }

    res.json(report);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("reports", "DELETE"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const existing = await prisma.jobDailyReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Report non trovato");
    await prisma.jobDailyReport.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
