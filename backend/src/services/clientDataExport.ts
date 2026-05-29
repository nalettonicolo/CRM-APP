import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

export async function exportClientData(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      quotes: {
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          paymentTerms: { orderBy: { sortOrder: "asc" } },
        },
      },
      reports: { include: { materials: true } },
      invoicePreviews: true,
      interventions: true,
      activities: { orderBy: { createdAt: "desc" }, take: 500 },
      attachments: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
      payments: true,
    },
  });

  if (!client) throw new NotFoundError("Cliente non trovato");

  return {
    exportedAt: new Date().toISOString(),
    purpose: "Esportazione dati personali (diritti GDPR artt. 15-20)",
    client,
  };
}
