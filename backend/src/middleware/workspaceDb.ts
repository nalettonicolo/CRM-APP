import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";
import {
  isIeDatabaseConfigured,
  prismaCrm,
  prismaIe,
  runWithDb,
} from "../lib/prisma.js";

const IE_API_PREFIXES = [
  "/api/clients",
  "/api/quotes",
  "/api/inventory",
  "/api/invoices",
  "/api/transport-documents",
  "/api/attachments",
  "/api/payment-term-templates",
  "/api/settings",
  "/api/search",
  "/api/job-orders",
  "/api/daily-reports",
  "/api/supplier-catalogs",
  "/api/supplier-bills",
  "/api/client-expenses",
  "/api/payments",
] as const;

function apiPath(req: AuthRequest): string {
  return req.originalUrl.split("?")[0] ?? req.path;
}

export function wantsIeWorkspace(req: AuthRequest): boolean {
  const header = req.headers["x-workspace"];
  if (header !== "ie") return false;
  const path = apiPath(req);
  return IE_API_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function ensureIeActor(userId: string): Promise<void> {
  if (!prismaIe) return;

  const existing = await prismaIe.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (existing) return;

  const crmUser = await prismaCrm.user.findUnique({ where: { id: userId } });
  if (!crmUser) return;

  await prismaIe.user.create({
    data: {
      id: crmUser.id,
      email: crmUser.email,
      passwordHash: crmUser.passwordHash,
      firstName: crmUser.firstName,
      lastName: crmUser.lastName,
      phone: crmUser.phone,
      avatar: crmUser.avatar,
      role: crmUser.role,
      status: crmUser.status,
      clientId: null,
      dashboardLayout: crmUser.dashboardLayout ?? undefined,
      twoFactorEnabled: crmUser.twoFactorEnabled,
      twoFactorSecret: crmUser.twoFactorSecret,
      createdById: null,
    },
  });
}

export async function ensureIeWarehouse(): Promise<void> {
  if (!prismaIe) return;
  const warehouse = await prismaIe.warehouse.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  if (warehouse) return;
  await prismaIe.warehouse.create({
    data: { name: "Magazzino Impianti Elettrici", isDefault: true },
  });
}

/** Seleziona DATABASE_URL_IE per le API dell'area Impianti Elettrici. */
export function workspaceDbMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!wantsIeWorkspace(req)) {
    next();
    return;
  }

  if (!isIeDatabaseConfigured() || !prismaIe) {
    res.status(503).json({
      error:
        "Database Impianti Elettrici non configurato. Imposta DATABASE_URL_IE nel backend.",
    });
    return;
  }

  // enterWith: il contesto resta attivo dopo await nei middleware Express.
  // run(() => next()) esce troppo presto e le query tornano sul DB CRM.
  runWithDb(prismaIe);
  next();
}
