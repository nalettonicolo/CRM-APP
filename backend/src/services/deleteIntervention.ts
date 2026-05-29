import fs from "fs";
import path from "path";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

function attachmentFilePath(storedPath: string): string {
  return path.join(config.upload.dir, storedPath.replace(/^\/uploads\//, ""));
}

export async function deleteInterventionById(interventionId: string): Promise<void> {
  const intervention = await prisma.intervention.findUnique({
    where: { id: interventionId },
    include: {
      reports: { include: { attachments: true } },
    },
  });
  if (!intervention) throw new NotFoundError("Intervento non trovato");

  const filePaths: string[] = [];
  for (const report of intervention.reports) {
    for (const attachment of report.attachments) {
      filePaths.push(attachmentFilePath(attachment.path));
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const report of intervention.reports) {
      await tx.attachment.deleteMany({ where: { reportId: report.id } });
      await tx.reportMaterial.deleteMany({ where: { reportId: report.id } });
      await tx.interventionReport.delete({ where: { id: report.id } });
    }
    await tx.event.deleteMany({ where: { interventionId } });
    await tx.intervention.delete({ where: { id: interventionId } });
  });

  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
