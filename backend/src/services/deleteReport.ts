import fs from "fs";
import path from "path";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

function attachmentFilePath(storedPath: string): string {
  return path.join(config.upload.dir, storedPath.replace(/^\/uploads\//, ""));
}

export async function deleteReportById(reportId: string): Promise<void> {
  const report = await prisma.interventionReport.findUnique({
    where: { id: reportId },
    include: { attachments: true },
  });
  if (!report) throw new NotFoundError("Verbale non trovato");

  const filePaths = report.attachments.map((a) => attachmentFilePath(a.path));

  await prisma.$transaction(async (tx) => {
    await tx.attachment.deleteMany({ where: { reportId } });
    await tx.reportMaterial.deleteMany({ where: { reportId } });
    await tx.interventionReport.delete({ where: { id: reportId } });
  });

  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
