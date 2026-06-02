import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import type { Attachment } from "@prisma/client";
import { config } from "../config/index.js";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const IMAGE_GAP = 18;

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

  let imagePage: ReturnType<PDFDocument["addPage"]> | null = null;
  let imageSlot = 0;

  function nextImageSlot() {
    if (!imagePage) {
      imagePage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      imageSlot = 0;
    }
    if (imageSlot >= 2) {
      imagePage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      imageSlot = 0;
    }
    const { width, height } = imagePage.getSize();
    const slotHeight = (height - MARGIN * 2 - IMAGE_GAP) / 2;
    const yBase = imageSlot === 0 ? height - MARGIN - slotHeight : MARGIN;
    imageSlot += 1;
    return { width, slotHeight, yBase };
  }

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

    const { width, slotHeight, yBase } = nextImageSlot();
    const maxW = width - MARGIN * 2;
    const maxH = slotHeight - 18;

    const embedded =
      mime === "image/png"
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);

    const scaled = embedded.scaleToFit(maxW, maxH);
    imagePage!.drawImage(embedded, {
      x: (width - scaled.width) / 2,
      y: yBase + (slotHeight - scaled.height) / 2 + 6,
      width: scaled.width,
      height: scaled.height,
    });

    imagePage!.drawText(attachment.originalName, {
      x: MARGIN,
      y: yBase + 2,
      size: 8,
    });
  }

  return Buffer.from(await pdfDoc.save());
}
