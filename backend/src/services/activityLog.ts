import { prisma } from "../lib/prisma.js";
import type { ActivityAction, Prisma } from "@prisma/client";

export async function logActivity(params: {
  userId?: string;
  clientId?: string;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        clientId: params.clientId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (e) {
    console.error("[ActivityLog]", e);
  }
}
