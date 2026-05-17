import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  authenticate,
  staffOnly,
  requirePermission,
} from "../middleware/auth.js";

const router = Router();
router.use(authenticate, staffOnly, requirePermission("search", "READ"));

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) {
      res.json({ clients: [], quotes: [], interventions: [] });
      return;
    }

    const [clients, quotes, interventions] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        },
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
        where: {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
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
        where: {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
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
