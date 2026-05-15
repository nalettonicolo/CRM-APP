import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { ForbiddenError } from "../utils/errors.js";

const router = Router();
router.use(authenticate);

router.get("/dashboard", async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== "CLIENT" || !req.user!.clientId) {
      throw new ForbiddenError("Solo clienti");
    }
    const clientId = req.user!.clientId;

    const [quotes, reports, interventions, invoices, events] =
      await Promise.all([
        prisma.quote.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.interventionReport.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.intervention.findMany({
          where: { clientId },
          orderBy: { scheduledAt: "desc" },
          take: 5,
        }),
        prisma.invoicePreview.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.event.findMany({
          where: { clientId, startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
          take: 5,
        }),
      ]);

    res.json({ quotes, reports, interventions, invoices, events });
  } catch (e) {
    next(e);
  }
});

export default router;
