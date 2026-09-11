import { prisma } from "./prisma.js";

interface AuditParams {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/** Registra un evento nell'audit trail enterprise (best-effort, non blocca la request). */
export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as never,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error("audit log fallito", err);
  }
}
