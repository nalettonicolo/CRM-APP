import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requirePermission, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// KPI executive: aggregazioni pronte per la dashboard BI (schede + grafici).
router.get("/overview", requirePermission("reports", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const organizationId = req.auth!.organizationId;

    const [taskByStatus, taskByPriority, activeProjects, hoursLast30Days, openTasks, overdueTasks] =
      await Promise.all([
        prisma.task.groupBy({
          by: ["status"],
          where: { project: { organizationId } },
          _count: { _all: true },
        }),
        prisma.task.groupBy({
          by: ["priority"],
          where: { project: { organizationId } },
          _count: { _all: true },
        }),
        prisma.project.count({ where: { organizationId, archivedAt: null } }),
        prisma.timeEntry.aggregate({
          where: {
            organizationId,
            startedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
            durationSec: { not: null },
          },
          _sum: { durationSec: true },
        }),
        prisma.task.count({ where: { project: { organizationId }, status: { not: "DONE" } } }),
        prisma.task.count({
          where: {
            project: { organizationId },
            status: { not: "DONE" },
            dueDate: { lt: new Date() },
          },
        }),
      ]);

    res.json({
      activeProjects,
      openTasks,
      overdueTasks,
      hoursLast30Days: Math.round(((hoursLast30Days._sum.durationSec ?? 0) / 3600) * 10) / 10,
      taskByStatus: taskByStatus.map((t) => ({ status: t.status, count: t._count._all })),
      taskByPriority: taskByPriority.map((t) => ({ priority: t.priority, count: t._count._all })),
    });
  } catch (err) {
    next(err);
  }
});

// Ore per utente negli ultimi 30 giorni (per report di produttività/billing).
router.get("/time-by-user", requirePermission("reports", "READ"), async (req: AuthRequest, res, next) => {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        startedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
        durationSec: { not: null },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const byUser = new Map<string, { name: string; seconds: number }>();
    for (const e of entries) {
      const key = e.userId;
      const name = `${e.user.firstName} ${e.user.lastName}`;
      const current = byUser.get(key) ?? { name, seconds: 0 };
      current.seconds += e.durationSec ?? 0;
      byUser.set(key, current);
    }

    res.json(
      Array.from(byUser.values())
        .map((v) => ({ name: v.name, hours: Math.round((v.seconds / 3600) * 10) / 10 }))
        .sort((a, b) => b.hours - a.hours),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
