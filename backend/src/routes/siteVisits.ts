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
  ensureSiteVisitForEvent,
  listSiteVisitEntries,
  siteVisitInclude,
} from "../services/siteVisit.js";
import { NotFoundError } from "../utils/errors.js";
import { paramId } from "../utils/params.js";

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
    const sheets = await listSiteVisitEntries();
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
      const sheet = await ensureSiteVisitForEvent(
        paramId(req, "eventId"),
        req.user!.userId
      );
      res.json(sheet);
    } catch (e) {
      next(e);
    }
  }
);

router.get("/:id", requirePermission("events", "READ"), async (req, res, next) => {
  try {
    const id = paramId(req);
    const byEvent = await prisma.siteVisit.findFirst({
      where: { eventId: id },
      include: siteVisitInclude,
    });
    if (byEvent) {
      res.json(byEvent);
      return;
    }

    const sheet = await prisma.siteVisit.findUnique({
      where: { id },
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
      const id = paramId(req);
      let existing = await prisma.siteVisit.findUnique({ where: { id } });
      if (!existing) {
        existing = await prisma.siteVisit.findFirst({ where: { eventId: id } });
      }
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
