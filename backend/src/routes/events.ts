import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { ensureSiteVisitForEvent } from "../services/siteVisit.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import { parseOptionalDate } from "../utils/queryInput.js";
import { EVENT_TYPE_VALUES } from "../constants/eventTypes.js";
import { findScheduleConflicts } from "../services/eventConflicts.js";

const eventTypeSchema = z.enum(EVENT_TYPE_VALUES);

const eventInclude = {
  client: { select: { id: true, companyName: true, contactName: true } },
  assignee: { select: { firstName: true, lastName: true } },
  intervention: {
    select: { id: true, number: true, title: true, status: true },
  },
  quote: {
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      total: true,
      eventLocation: true,
    },
  },
} as const;

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("events", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const { from, to } = req.query;
    const where: Record<string, unknown> = {};
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      where.clientId = req.user!.clientId;
    }
    const fromDate = parseOptionalDate(from);
    const toDate = parseOptionalDate(to);
    if (fromDate || toDate) {
      const overlap: Record<string, unknown>[] = [];
      if (toDate) overlap.push({ startAt: { lte: toDate } });
      if (fromDate) {
        overlap.push({
          OR: [
            { endAt: { gte: fromDate } },
            { endAt: null, startAt: { gte: fromDate } },
          ],
        });
      }
      if (overlap.length) where.AND = overlap;
    }

    const events = await prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startAt: "asc" },
    });
    res.json(events);
  } catch (e) {
    next(e);
  }
});

router.post("/", requirePermission("events", "CREATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        title: z.string(),
        description: z.string().optional(),
        type: eventTypeSchema,
        startAt: z.string().datetime(),
        endAt: z.string().datetime().optional(),
        allDay: z.boolean().optional(),
        clientId: z.string().optional(),
        assigneeId: z.string().optional(),
        interventionId: z.string().optional(),
        quoteId: z.string().optional(),
        location: z.string().optional(),
        color: z.string().optional(),
        allowOverlap: z.boolean().optional(),
      })
      .parse(req.body);

    const startAt = new Date(data.startAt);
    const endAt = data.endAt ? new Date(data.endAt) : undefined;

    if (!data.allowOverlap) {
      const conflicts = await findScheduleConflicts({ startAt, endAt });
      if (conflicts.length) {
        throw new ConflictError(
          "Esistono già impegni in questo orario. Conferma per sovrascrivere la regola.",
          conflicts
        );
      }
    }

    const { allowOverlap: _allow, ...createData } = data;
    const event = await prisma.event.create({
      data: {
        ...createData,
        location: data.location?.trim() || undefined,
        startAt,
        endAt,
      },
      include: eventInclude,
    });
    if (event.type === "SITE_VISIT") {
      await ensureSiteVisitForEvent(event.id, req.user!.userId);
    }
    res.status(201).json(event);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("events", "UPDATE"), async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        type: eventTypeSchema.optional(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        location: z.string().optional(),
        assigneeId: z.string().optional(),
        clientId: z.string().nullable().optional(),
        allowOverlap: z.boolean().optional(),
      })
      .parse(req.body);

    const accessWhere: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      accessWhere.clientId = req.user!.clientId;
    }
    const existing = await prisma.event.findFirst({ where: accessWhere });
    if (!existing) throw new NotFoundError();

    const startAt = data.startAt ? new Date(data.startAt) : existing.startAt;
    const endAt =
      data.endAt !== undefined
        ? data.endAt
          ? new Date(data.endAt)
          : null
        : existing.endAt;

    if (
      !data.allowOverlap &&
      (data.startAt !== undefined || data.endAt !== undefined)
    ) {
      const conflicts = await findScheduleConflicts({
        startAt,
        endAt,
        excludeEventId: existing.id,
      });
      if (conflicts.length) {
        throw new ConflictError(
          "Esistono già impegni in questo orario. Conferma per sovrascrivere la regola.",
          conflicts
        );
      }
    }

    const event = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
        ...(data.location !== undefined && {
          location: data.location?.trim() || null,
        }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
      },
      include: eventInclude,
    });
    if (event.type === "SITE_VISIT") {
      await ensureSiteVisitForEvent(event.id, req.user!.userId);
    }
    res.json(event);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("events", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    const accessWhere: Record<string, unknown> = { id: paramId(req) };
    if (req.user!.role === "CLIENT" && req.user!.clientId) {
      accessWhere.clientId = req.user!.clientId;
    }
    const existing = await prisma.event.findFirst({ where: accessWhere });
    if (!existing) throw new NotFoundError();

    await prisma.event.delete({ where: { id: existing.id } });

    await logActivity({
      userId: req.user!.userId,
      clientId: existing.clientId ?? undefined,
      action: "DELETE",
      entityType: "event",
      entityId: existing.id,
      details: { title: existing.title },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
