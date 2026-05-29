import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { syncQuoteCalendarEvent } from "../services/quoteCalendar.js";
import { PRIVACY_POLICY_VERSION } from "../constants/privacy.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { paramId } from "../utils/params.js";

const router = Router();
router.use(authenticate);

function requireClient(req: AuthRequest) {
  if (req.user!.role !== "CLIENT" || !req.user!.clientId) {
    throw new ForbiddenError("Solo clienti");
  }
  return req.user!.clientId;
}

router.get("/dashboard", async (req: AuthRequest, res, next) => {
  try {
    const clientId = requireClient(req);

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

router.post("/quotes/:id/sign", async (req: AuthRequest, res, next) => {
  try {
    const clientId = requireClient(req);
    const { signature, privacyAccepted } = z
      .object({
        signature: z.string().min(20),
        privacyAccepted: z.literal(true, {
          errorMap: () => ({
            message: "Devi accettare l'informativa privacy per firmare",
          }),
        }),
      })
      .parse(req.body);

    const quote = await prisma.quote.findFirst({
      where: { id: paramId(req), clientId },
    });
    if (!quote) throw new NotFoundError();
    if (!["SENT", "DRAFT"].includes(quote.status)) {
      throw new ValidationError(
        "Il preventivo non può essere firmato in questo stato"
      );
    }

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        signedByClient: true,
        signedAt: new Date(),
        acceptedAt: new Date(),
        status: "ACCEPTED",
        clientSignature: signature,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId,
      action: "SIGN",
      entityType: "quote",
      entityId: quote.id,
      details: {
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        privacyAccepted,
      },
    });

    await syncQuoteCalendarEvent(updated.id);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post("/quotes/:id/accept", async (req: AuthRequest, res, next) => {
  try {
    const clientId = requireClient(req);
    const quote = await prisma.quote.findFirst({
      where: { id: paramId(req), clientId },
    });
    if (!quote) throw new NotFoundError();
    if (!["SENT", "DRAFT"].includes(quote.status)) {
      throw new ValidationError(
        "Il preventivo non può essere confermato in questo stato"
      );
    }

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        signedByClient: true,
        signedAt: new Date(),
      },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId,
      action: "UPDATE",
      entityType: "quote",
      entityId: quote.id,
      details: { accepted: true },
    });

    await syncQuoteCalendarEvent(updated.id);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post("/quotes/:id/reject", async (req: AuthRequest, res, next) => {
  try {
    const clientId = requireClient(req);
    const quote = await prisma.quote.findFirst({
      where: { id: paramId(req), clientId },
    });
    if (!quote) throw new NotFoundError();
    if (!["SENT", "DRAFT"].includes(quote.status)) {
      throw new ValidationError(
        "Il preventivo non può essere rifiutato in questo stato"
      );
    }

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
      },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId,
      action: "UPDATE",
      entityType: "quote",
      entityId: quote.id,
      details: { rejected: true },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.patch("/events/:id/confirm", async (req: AuthRequest, res, next) => {
  try {
    const clientId = requireClient(req);
    const event = await prisma.event.findFirst({
      where: { id: paramId(req), clientId },
    });
    if (!event) throw new NotFoundError();

    const confirmNote = `[Confermato dal cliente: ${new Date().toISOString()}]`;
    const description = event.description
      ? `${event.description}\n\n${confirmNote}`
      : confirmNote;

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        description,
        color: "confirmed",
      },
    });

    await logActivity({
      userId: req.user!.userId,
      clientId,
      action: "UPDATE",
      entityType: "event",
      entityId: event.id,
      details: { confirmed: true },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
