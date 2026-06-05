import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  staffOnly,
  requirePermission,
} from "../middleware/auth.js";
import { buildOrContains, sanitizeSearchTerm } from "../utils/queryInput.js";

const router = Router();
router.use(authenticate, staffOnly, requirePermission("search", "READ"));

router.get("/", async (req, res, next) => {
  try {
    const q = sanitizeSearchTerm(req.query.q);
    if (!q || q.length < 2) {
      res.json({ clients: [], quotes: [], interventions: [] });
      return;
    }

    const clientOr = buildOrContains(q, [
      "companyName",
      "contactName",
      "email",
      "phone",
      "firstName",
      "lastName",
    ]);
    const quoteOr = buildOrContains(q, ["number", "title"]);
    const interventionOr = buildOrContains(q, ["number", "title"]);

    const [clients, quotes, interventions] = await Promise.all([
      prisma.client.findMany({
        where: { OR: clientOr },
        take: 10,
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          status: true,
        },
      }),
      prisma.quote.findMany({
        where: { OR: quoteOr },
        take: 10,
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          client: { select: { companyName: true, contactName: true } },
        },
      }),
      prisma.intervention.findMany({
        where: { OR: interventionOr },
        take: 10,
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          client: { select: { companyName: true, contactName: true } },
        },
      }),
    ]);

    res.json({ clients, quotes, interventions });
  } catch (e) {
    next(e);
  }
});

export default router;
