import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission } from "../middleware/auth.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("events", "READ"), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.startAt = {};
      if (from) (where.startAt as Record<string, Date>).gte = new Date(from as string);
      if (to) (where.startAt as Record<string, Date>).lte = new Date(to as string);
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        client: { select: { companyName: true, contactName: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
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
        type: z.enum([
          "APPOINTMENT",
          "INTERVENTION",
          "DEADLINE",
          "REMINDER",
          "MEETING",
          "OTHER",
        ]),
        startAt: z.string().datetime(),
        endAt: z.string().datetime().optional(),
        allDay: z.boolean().optional(),
        clientId: z.string().optional(),
        assigneeId: z.string().optional(),
        color: z.string().optional(),
      })
      .parse(req.body);

    const event = await prisma.event.create({
      data: {
        ...data,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : undefined,
      },
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
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        assigneeId: z.string().optional(),
      })
      .parse(req.body);

    const event = await prisma.event.update({
      where: { id: paramId(req) },
      data: {
        ...data,
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
      },
    });
    res.json(event);
  } catch (e) {
    next(e);
  }
});

export default router;
