import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  requirePermission,
  type AuthRequest,
} from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";
import { EVENT_TYPE_VALUES } from "../constants/eventTypes.js";

const eventTypeSchema = z.enum(EVENT_TYPE_VALUES);

const eventInclude = {
  client: { select: { id: true, companyName: true, contactName: true } },
  assignee: { select: { firstName: true, lastName: true } },
  intervention: {
    select: { id: true, number: true, title: true, status: true },
  },
  quote: {
    select: { id: true, number: true, title: true, status: true, total: true },
  },
} as const;

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("events", "READ"), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where: Record<string, unknown> = {};
    if (from || to) {
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;
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

router.post("/", requirePermission("events", "CREATE"), async (req, res, next) => {
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
        color: z.string().optional(),
      })
      .parse(req.body);

    const event = await prisma.event.create({
      data: {
        ...data,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : undefined,
      },
      include: eventInclude,
    });
    res.status(201).json(event);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requirePermission("events", "UPDATE"), async (req, res, next) => {
  try {
    const data = z
      .object({
        title: z.string().optional(),
        type: eventTypeSchema.optional(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        assigneeId: z.string().optional(),
      })
      .parse(req.body);

    const event = await prisma.event.update({
      where: { id: paramId(req) },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
      },
      include: eventInclude,
    });
    res.json(event);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requirePermission("events", "DELETE"), async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.event.findUnique({ where: { id: paramId(req) } });
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
