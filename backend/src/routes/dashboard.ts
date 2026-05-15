import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, staffOnly, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, staffOnly);

router.get("/stats", async (req: AuthRequest, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      interventionsToday,
      openQuotes,
      acceptedQuotes,
      upcomingEvents,
      recentActivity,
      technicians,
    ] = await Promise.all([
      prisma.intervention.count({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        },
      }),
      prisma.quote.count({
        where: { status: { in: ["DRAFT", "SENT"] } },
      }),
      prisma.quote.count({ where: { status: "ACCEPTED" } }),
      prisma.event.findMany({
        where: { startAt: { gte: today } },
        take: 5,
        orderBy: { startAt: "asc" },
        include: {
          client: { select: { companyName: true, contactName: true } },
        },
      }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.user.count({
        where: { role: "TECHNICIAN", status: "ACTIVE" },
      }),
    ]);

    const lowStockItems = await prisma.$queryRaw<
      { id: string; quantity: number; minStock: number; productName: string }[]
    >`
      SELECT i.id, i.quantity::float, i."minStock"::float, p.name as "productName"
      FROM "Inventory" i
      JOIN "Product" p ON p.id = i."productId"
      WHERE i.quantity <= i."minStock"
      LIMIT 10
    `.catch(() => []);

    res.json({
      interventionsToday,
      openQuotes,
      acceptedQuotes,
      lowStock: lowStockItems,
      upcomingEvents,
      recentActivity,
      techniciansAvailable: technicians,
      kpis: {
        clients: await prisma.client.count({ where: { status: "ACTIVE" } }),
        revenue: await prisma.quote.aggregate({
          where: { status: "ACCEPTED" },
          _sum: { total: true },
        }),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
