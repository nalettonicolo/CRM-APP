import fs from "fs";
import path from "path";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

function attachmentFilePath(storedPath: string): string {
  return path.join(config.upload.dir, storedPath.replace(/^\/uploads\//, ""));
}

function collectPaths(paths: string[], attachments: { path: string }[]) {
  for (const attachment of attachments) {
    paths.push(attachmentFilePath(attachment.path));
  }
}

export async function deleteClientById(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      users: { select: { id: true } },
      quotes: { select: { id: true } },
      invoicePreviews: { include: { attachments: true } },
      reports: { include: { attachments: true } },
      attachments: true,
    },
  });
  if (!client) throw new NotFoundError("Cliente non trovato");

  const filePaths: string[] = [];
  collectPaths(filePaths, client.attachments);
  for (const invoice of client.invoicePreviews) {
    collectPaths(filePaths, invoice.attachments);
  }
  for (const report of client.reports) {
    collectPaths(filePaths, report.attachments);
  }

  const quoteIds = client.quotes.map((q) => q.id);
  if (quoteIds.length > 0) {
    const quoteAttachments = await prisma.attachment.findMany({
      where: { quoteId: { in: quoteIds } },
    });
    collectPaths(filePaths, quoteAttachments);
  }

  await prisma.$transaction(async (tx) => {
    for (const invoice of client.invoicePreviews) {
      await tx.attachment.deleteMany({ where: { invoiceId: invoice.id } });
      await tx.invoicePreview.delete({ where: { id: invoice.id } });
    }

    await tx.clientPayment.deleteMany({ where: { clientId } });

    await tx.reportMaterial.deleteMany({
      where: { report: { clientId } },
    });
    await tx.attachment.deleteMany({
      where: { report: { clientId } },
    });
    await tx.interventionReport.deleteMany({ where: { clientId } });

    for (const quoteId of quoteIds) {
      await tx.event.deleteMany({ where: { quoteId } });
      await tx.attachment.deleteMany({ where: { quoteId } });
      await tx.quotePaymentTerm.deleteMany({ where: { quoteId } });
      await tx.quoteItem.deleteMany({ where: { quoteId } });
      await tx.quote.delete({ where: { id: quoteId } });
    }

    const interventions = await tx.intervention.findMany({
      where: { clientId },
      select: { id: true },
    });
    for (const intervention of interventions) {
      await tx.event.deleteMany({ where: { interventionId: intervention.id } });
    }
    await tx.intervention.deleteMany({ where: { clientId } });

    await tx.event.deleteMany({ where: { clientId } });
    await tx.attachment.deleteMany({ where: { clientId } });
    await tx.activityLog.deleteMany({ where: { clientId } });
    await tx.lead.updateMany({ where: { clientId }, data: { clientId: null } });

    for (const user of client.users) {
      await tx.userPermission.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    }

    await tx.client.delete({ where: { id: clientId } });
  });

  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
