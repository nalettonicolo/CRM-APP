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

const siteVisitInclude = {
  event: {
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      endAt: true,
      clientId: true,
      quoteId: true,
    },
  },
  client: { select: { id: true, companyName: true, contactName: true } },
  quote: { select: { id: true, number: true, title: true, eventLocation: true } },
  conductedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

async function generateSiteVisitNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SPL-${year}-`;
  const last = await prisma.siteVisit.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const next = last
    ? Number.parseInt(last.number.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

async function ensureSiteVisitForEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { siteVisit: true },
  });
  if (!event) throw new NotFoundError();

  if (event.type !== "SITE_VISIT") {
    await prisma.event.update({
      where: { id: eventId },
      data: { type: "SITE_VISIT" },
    });
  }

  if (event.siteVisit) {
    return prisma.siteVisit.findUniqueOrThrow({
      where: { id: event.siteVisit.id },
      include: siteVisitInclude,
    });
  }

  const number = await generateSiteVisitNumber();
  const location = event.location?.trim() || undefined;

  return prisma.siteVisit.create({
    data: {
      number,
      eventId: event.id,
      clientId: event.clientId,
      quoteId: event.quoteId,
      conductedById: userId,
      location,
      conductedAt: event.startAt,
      status: "DRAFT",
    },
    include: siteVisitInclude,
  });
}

const updateSchema = z.object({
  location: z.string().optional(),
  venueNotes: z.string().optional(),
  audioNotes: z.string().optional(),
  lightingNotes: z.string().optional(),
  accessNotes: z.string().optional(),
  generalNotes: z.string().optional(),
  conductedAt: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).optional(),
});

const router = Router();
router.use(authenticate);

router.get("/", requirePermission("events", "READ"), async (_req, res, next) => {
  try {
    const sheets = await prisma.siteVisit.findMany({
      include: siteVisitInclude,
      orderBy: { updatedAt: "desc" },
    });
    res.json(sheets);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/by-event/:eventId",
  requirePermission("events", "READ"),
  async (req: AuthRequest, res, next) => {
    try {
      const sheet = await ensureSiteVisitForEvent(paramId(req, "eventId"), req.user!.userId);
      res.json(sheet);
    } catch (e) {
      next(e);
    }
  }
);

router.get("/:id", requirePermission("events", "READ"), async (req, res, next) => {
  try {
    const sheet = await prisma.siteVisit.findUnique({
      where: { id: paramId(req) },
      include: siteVisitInclude,
    });
    if (!sheet) throw new NotFoundError();
    res.json(sheet);
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/:id",
  requirePermission("events", "UPDATE"),
  async (req: AuthRequest, res, next) => {
    try {
      const data = updateSchema.parse(req.body);
      const existing = await prisma.siteVisit.findUnique({
        where: { id: paramId(req) },
      });
      if (!existing) throw new NotFoundError();

      const sheet = await prisma.siteVisit.update({
        where: { id: existing.id },
        data: {
          ...(data.location !== undefined && { location: data.location || null }),
          ...(data.venueNotes !== undefined && {
            venueNotes: data.venueNotes || null,
          }),
          ...(data.audioNotes !== undefined && {
            audioNotes: data.audioNotes || null,
          }),
          ...(data.lightingNotes !== undefined && {
            lightingNotes: data.lightingNotes || null,
          }),
          ...(data.accessNotes !== undefined && {
            accessNotes: data.accessNotes || null,
          }),
          ...(data.generalNotes !== undefined && {
            generalNotes: data.generalNotes || null,
          }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.conductedAt && { conductedAt: new Date(data.conductedAt) }),
        },
        include: siteVisitInclude,
      });

      await logActivity({
        userId: req.user!.userId,
        clientId: sheet.clientId ?? undefined,
        action: "UPDATE",
        entityType: "site_visit",
        entityId: sheet.id,
        details: { status: sheet.status },
      });

      res.json(sheet);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
