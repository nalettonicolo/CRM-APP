import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";

export async function prunePrivacyData() {
  const now = Date.now();
  const leadCutoff = new Date(
    now - config.privacy.leadRetentionDays * 86_400_000
  );
  const logCutoff = new Date(
    now - config.privacy.activityLogRetentionDays * 86_400_000
  );

  const [deletedLeads, deletedLogs] = await Promise.all([
    prisma.lead.deleteMany({
      where: {
        clientId: null,
        createdAt: { lt: leadCutoff },
        status: { in: ["new", "closed", "lost", "spam"] },
      },
    }),
    prisma.activityLog.deleteMany({
      where: { createdAt: { lt: logCutoff } },
    }),
  ]);

  return {
    deletedLeads: deletedLeads.count,
    deletedActivityLogs: deletedLogs.count,
    leadRetentionDays: config.privacy.leadRetentionDays,
    activityLogRetentionDays: config.privacy.activityLogRetentionDays,
  };
}
