import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import type { Attachment } from "@prisma/client";
import { config } from "../config/index.js";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;

function attachmentPath(attachment: Attachment): string {
  return path.join(
    config.upload.dir,
    attachment.path.replace(/^\/uploads\//, "")
  );
}

function isImageMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/jpeg") ||
    mimeType.startsWith("image/jpg") ||
    mimeType === "image/png"
  );
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export async function appendAttachmentsToInvoicePdf(
  receiptPdf: Buffer,
  attachments: Attachment[]
): Promise<Buffer> {
  if (attachments.length === 0) return receiptPdf;

  const pdfDoc = await PDFDocument.load(receiptPdf);

  for (const attachment of attachments) {
    const filePath = attachmentPath(attachment);
    if (!fs.existsSync(filePath)) continue;

    const bytes = fs.readFileSync(filePath);
    const mime = attachment.mimeType.toLowerCase();

    if (isPdfMime(mime)) {
      const source = await PDFDocument.load(bytes);
      const pages = await pdfDoc.copyPages(source, source.getPageIndices());
      for (const page of pages) {
        pdfDoc.addPage(page);
      }
      continue;
    }

    if (!isImageMime(mime)) continue;

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const { width, height } = page.getSize();
    const maxW = width - MARGIN * 2;
    const maxH = height - MARGIN * 2;

    const embedded =
      mime === "image/png"
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);

    const scaled = embedded.scaleToFit(maxW, maxH);
    page.drawImage(embedded, {
      x: (width - scaled.width) / 2,
      y: (height - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });

    page.drawText(attachment.originalName, {
      x: MARGIN,
      y: MARGIN / 2,
      size: 8,
    });
  }

  return Buffer.from(await pdfDoc.save());
}
