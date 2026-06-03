import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { DOCUMENT_COPY } from "../constants/documentCopy.js";
import { prisma } from "../lib/prisma.js";

type PdfDoc = InstanceType<typeof PDFDocument>;
import { config } from "../config/index.js";

export type CompanyInfo = {
  name?: string;
  vat?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
};

export async function loadCompanySettings(): Promise<CompanyInfo> {
  const row = await prisma.setting.findUnique({ where: { key: "company" } });
  return (row?.value || {}) as CompanyInfo;
}

export async function loadLogoFilePath(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: "logo" } });
  const url = (row?.value as { url?: string })?.url;
  if (!url || !url.startsWith("/uploads/")) return null;
  const rel = url.replace(/^\/uploads\//, "");
  const full = path.join(config.upload.dir, rel);
  return fs.existsSync(full) ? full : null;
}

/** Intestazione PDF: logo (se presente) + dati azienda; opzionale titolo a destra. */
export function drawPdfLetterhead(
  doc: PdfDoc,
  company: CompanyInfo,
  logoPath: string | null,
  options?: { titleRight?: string; subtitleRight?: string[] }
): void {
  const margin = 50;
  const top = 50;
  const logoSize = 72;
  let textX = margin;

  if (logoPath) {
    try {
      doc.image(logoPath, margin, top, { fit: [logoSize, logoSize] });
      textX = margin + logoSize + 14;
    } catch {
      textX = margin;
    }
  }

  const companyName = company.name || "Documento";
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000");
  doc.text(companyName, textX, top, { width: 280, lineBreak: false });

  doc.font("Helvetica").fontSize(10).fillColor("#52525b");
  let y = top + 22;
  const lines = [
    company.address,
    company.vat ? `P.IVA: ${company.vat}` : null,
    [company.phone, company.email].filter(Boolean).join(" · "),
    company.website,
  ].filter(Boolean) as string[];

  for (const line of lines) {
    doc.text(line, textX, y, { width: 280 });
    y = doc.y + 2;
  }

  if (options?.titleRight) {
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(14);
    doc.text(options.titleRight, margin, top, {
      align: "right",
      width: doc.page.width - margin * 2,
    });
    if (options.subtitleRight?.length) {
      doc.font("Helvetica").fontSize(10).fillColor("#52525b");
      for (const line of options.subtitleRight) {
        doc.text(line, margin, doc.y, {
          align: "right",
          width: doc.page.width - margin * 2,
        });
      }
    }
  }

  doc.fillColor("#000000").font("Helvetica");
  const headerBottom = Math.max(y, top + logoSize) + 12;
  doc.y = headerBottom;
  doc.x = margin;
}

export function drawPdfSignatureBlock(
  doc: PdfDoc,
  options: {
    clientSignature?: string | null;
    signedAt?: Date | null;
    label?: string;
  },
  layout?: { startY?: number }
): number {
  const x = PDF_LAYOUT.margin;
  let y = layout?.startY ?? doc.y;

  if (layout?.startY == null) {
    const pageBottom = pdfPageBottomY(doc);
    const blockHeight = estimateSignatureBlockHeight(
      Boolean(options.clientSignature?.trim()?.startsWith("data:image"))
    );
    if (y + blockHeight > pageBottom) {
      doc.addPage();
      y = PDF_LAYOUT.margin;
    } else {
      y += 6;
    }
  }

  doc.x = x;
  doc.y = y;
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
  doc.text(options.label || DOCUMENT_COPY.quote.acceptanceHeading, x, y, {
    width: 480,
    underline: true,
  });
  y += 16;
  doc.font("Helvetica").fontSize(9).fillColor("#52525b");

  const sig = options.clientSignature?.trim();
  if (sig?.startsWith("data:image")) {
    try {
      const base64 = sig.includes(",") ? sig.split(",")[1]! : sig;
      const buf = Buffer.from(base64, "base64");
      doc.image(buf, x, y, { width: 200, height: 70, fit: [200, 70] });
      y += 76;
      if (options.signedAt) {
        const signedLine = `Firmato digitalmente il ${options.signedAt.toLocaleDateString("it-IT")} alle ${options.signedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
        doc.text(signedLine, x, y, { width: 480 });
        y += doc.heightOfString(signedLine, { width: 480 }) + 3;
      }
      doc.text(DOCUMENT_COPY.quote.acceptanceDigital, x, y, { width: 480 });
      y += doc.heightOfString(DOCUMENT_COPY.quote.acceptanceDigital, { width: 480 }) + 3;
      doc.text(DOCUMENT_COPY.quote.acceptanceDigitalChannel, x, y, { width: 480 });
      y += doc.heightOfString(DOCUMENT_COPY.quote.acceptanceDigitalChannel, {
        width: 480,
      });
    } catch {
      y = drawEmptySignatureLinesAt(doc, x, y);
    }
  } else {
    y = drawEmptySignatureLinesAt(doc, x, y);
  }

  doc.fillColor("#000000");
  doc.y = y;
  return y;
}

function drawEmptySignatureLinesAt(doc: PdfDoc, x: number, y: number): number {
  doc.text(DOCUMENT_COPY.quote.acceptancePaper, x, y, { width: 480 });
  y += doc.heightOfString(DOCUMENT_COPY.quote.acceptancePaper, { width: 480 }) + 10;
  doc.text(DOCUMENT_COPY.quote.paperDateLine, x, y);
  y += 14;
  doc.text(DOCUMENT_COPY.quote.paperSignLine, x, y);
  y += 16;
  doc.fontSize(8).text(DOCUMENT_COPY.quote.paperNote, x, y, { width: 480 });
  y += doc.heightOfString(DOCUMENT_COPY.quote.paperNote, { width: 480 }) + 2;
  return y;
}

export type ClientPdfInput = {
  companyName?: string | null;
  contactName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function resolveClientPdfName(client: ClientPdfInput): string {
  return (
    client.companyName ||
    client.contactName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    "Cliente"
  );
}

export function clientPdfDetailLines(client: ClientPdfInput): string[] {
  const clientName = resolveClientPdfName(client);
  const contactName = client.contactName?.trim();
  const referenceName =
    client.companyName && contactName && contactName !== clientName
      ? contactName
      : null;
  return [
    client.address
      ? [client.address, client.postalCode, client.city, client.province]
          .filter(Boolean)
          .join(" ")
      : null,
    referenceName ? `Referente: ${referenceName}` : null,
    client.email || null,
    client.phone || null,
  ].filter(Boolean) as string[];
}

/** Dati cliente senza intestazione «Cliente». */
export function drawPdfClientBlock(
  doc: PdfDoc,
  client: ClientPdfInput,
  top: number,
  x: number,
  width: number,
  align: "left" | "right" = "right"
): number {
  const clientName = resolveClientPdfName(client);
  const lines = clientPdfDetailLines(client);
  let y = top;

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
  doc.text(clientName, x, y, { width, align });
  y += 14;
  doc.font("Helvetica").fontSize(10);
  for (const line of lines) {
    doc.text(line, x, y, { width, align });
    y += doc.heightOfString(line, { width }) + 4;
  }
  return y;
}

export const PDF_LAYOUT = {
  margin: 50,
  pageRight: 545,
  sectionTopMin: 118,
  clientBlockX: 300,
  clientBlockWidth: 245,
  leftRefX: 50,
  leftRefWidth: 280,
  totalsX: 380,
  tableCols: { desc: 50, qty: 320, price: 380, total: 480 },
} as const;

export function pdfMoney(n: number | { toString(): string }): string {
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Blocco sinistro con titolo sottolineato (es. Riferimenti preventivo). */
export function drawPdfReferencesBlock(
  doc: PdfDoc,
  top: number,
  heading: string,
  lines: string[]
): number {
  const { leftRefX: x, leftRefWidth: width } = PDF_LAYOUT;
  let y = top;
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
  doc.text(heading, x, y, { width, underline: true });
  y += 16;
  doc.font("Helvetica").fontSize(10);
  for (const line of lines) {
    doc.text(line, x, y, { width });
    y += doc.heightOfString(line, { width }) + 4;
  }
  return y;
}

/** Meta documento a sinistra (grigio) + cliente a destra — layout documento di cortesia. */
export function drawPdfLeftMetaClientRow(
  doc: PdfDoc,
  input: {
    metaLines: string[];
    client: ClientPdfInput;
  }
): number {
  const sectionTop = Math.max(doc.y, PDF_LAYOUT.sectionTopMin) + 6;
  const { leftRefX: x, leftRefWidth: width } = PDF_LAYOUT;
  let leftY = sectionTop;

  doc.font("Helvetica").fontSize(9).fillColor("#52525b");
  for (const line of input.metaLines) {
    doc.text(line, x, leftY, { width });
    leftY += doc.heightOfString(line, { width }) + 5;
  }
  doc.fillColor("#000000");

  const clientBottom = drawPdfClientBlock(
    doc,
    input.client,
    sectionTop,
    PDF_LAYOUT.clientBlockX,
    PDF_LAYOUT.clientBlockWidth,
    "right"
  );
  doc.y = Math.max(leftY, clientBottom) + 12;
  doc.x = PDF_LAYOUT.margin;
  return doc.y;
}

export type PdfFooterTotalLine = {
  label: string;
  value: string;
  bold?: boolean;
};

export function estimateCourtesyFooterHeight(
  company: CompanyInfo,
  input: {
    totalLines: PdfFooterTotalLine[];
    paymentLineLeft?: string | null;
    dueDateRight?: string | null;
  }
): number {
  const bankLines = [
    company.bankName?.trim(),
    company.iban?.trim(),
    company.bic?.trim(),
  ].filter(Boolean).length;
  const bankBlock = bankLines > 0 ? 16 + bankLines * 13 : 0;
  const totalsBlock = input.totalLines.length * 13 + 6;
  const paymentBlock =
    input.paymentLineLeft?.trim() || input.dueDateRight?.trim() ? 22 : 0;
  return bankBlock + totalsBlock + paymentBlock + 10;
}

export function estimateSignatureBlockHeight(
  hasDigitalSignature: boolean
): number {
  return hasDigitalSignature ? 132 : 98;
}

/** Altezza reale del blocco firma (stessi font del disegno). */
export function measurePdfSignatureBlockHeight(
  doc: PdfDoc,
  options: {
    clientSignature?: string | null;
    signedAt?: Date | null;
    label?: string;
  }
): number {
  const w = 480;
  let h = 16;
  const sig = options.clientSignature?.trim();
  if (sig?.startsWith("data:image")) {
    h += 76 + 3;
    if (options.signedAt) {
      h += 12 + 3;
    }
    h +=
      doc.heightOfString(DOCUMENT_COPY.quote.acceptanceDigital, { width: w }) +
      3;
    h += doc.heightOfString(DOCUMENT_COPY.quote.acceptanceDigitalChannel, {
      width: w,
    });
  } else {
    h +=
      doc.heightOfString(DOCUMENT_COPY.quote.acceptancePaper, { width: w }) + 10;
    h += 14 + 16;
    doc.fontSize(8);
    h += doc.heightOfString(DOCUMENT_COPY.quote.paperNote, { width: w }) + 2;
    doc.fontSize(9);
  }
  return h;
}

/** Se c'è spazio, ancorare il blocco finale al margine inferiore (come documento di cortesia). */
export function alignPdfClosingToPageBottom(
  doc: PdfDoc,
  blockHeight: number,
  minGapAfterContent = 8
): void {
  const pageBottom = pdfPageBottomY(doc);
  let startY = doc.y + minGapAfterContent;

  if (startY + blockHeight <= pageBottom) {
    doc.y = pageBottom - blockHeight;
    doc.x = PDF_LAYOUT.margin;
    return;
  }

  if (doc.y + blockHeight > pageBottom) {
    doc.addPage();
    doc.y = PDF_LAYOUT.margin;
    startY = doc.y + minGapAfterContent;
    if (startY + blockHeight <= pageBottom) {
      doc.y = pageBottom - blockHeight;
    }
  }
  doc.x = PDF_LAYOUT.margin;
}

function pdfPageBottomY(doc: PdfDoc): number {
  return doc.page.height - PDF_LAYOUT.margin;
}

/** Piede: banca sx, totali dx, pagamento sx (come documento di cortesia). */
export function drawPdfCourtesyFooter(
  doc: PdfDoc,
  company: CompanyInfo,
  input: {
    totalLines: PdfFooterTotalLine[];
    paymentLineLeft?: string | null;
    dueLabelRight?: string | null;
    dueDateRight?: string | null;
  },
  options?: {
    reserveBelow?: number;
    skipLeadingGap?: boolean;
    startY?: number;
  }
): number {
  const totalsX = PDF_LAYOUT.totalsX;
  const reserveBelow = options?.reserveBelow ?? 0;
  const footerHeight = estimateCourtesyFooterHeight(company, input);
  const pageBottom = pdfPageBottomY(doc);

  let summaryY = options?.startY ?? doc.y;
  if (options?.startY == null) {
    if (!options?.skipLeadingGap) {
      doc.moveDown(0.4);
    }
    summaryY = doc.y;
    if (summaryY + footerHeight + reserveBelow > pageBottom) {
      doc.addPage();
      summaryY = PDF_LAYOUT.margin;
      doc.x = PDF_LAYOUT.margin;
      doc.y = summaryY;
    }
  } else {
    doc.x = PDF_LAYOUT.margin;
    doc.y = summaryY;
  }

  const bankBottomY = drawPdfBankDetailsAt(
    doc,
    company,
    PDF_LAYOUT.margin,
    summaryY
  );

  const addTotalLine = (
    label: string,
    value: string,
    y: number,
    bold = false
  ) => {
    if (bold) doc.font("Helvetica-Bold");
    doc.fontSize(10).fillColor("#000000").text(label, totalsX, y, {
      continued: true,
    });
    doc.text(value, { align: "right" });
    if (bold) doc.font("Helvetica");
    return doc.y;
  };

  let cursorY = summaryY;
  for (const line of input.totalLines) {
    cursorY = addTotalLine(line.label, line.value, cursorY, line.bold);
  }

  const blockBottom = Math.max(cursorY, bankBottomY);
  const paymentRowY = blockBottom + 12;
  const paymentLine = input.paymentLineLeft?.trim();
  const dueDate = input.dueDateRight?.trim();
  const dueLabel = input.dueLabelRight?.trim() || "Scadenza";
  const paymentWidth = totalsX - PDF_LAYOUT.margin - 28;

  let rowHeight = 11;
  if (paymentLine) {
    doc.fontSize(9).font("Helvetica").text(paymentLine, PDF_LAYOUT.margin, paymentRowY, {
      width: paymentWidth,
      lineGap: 1,
    });
    rowHeight = Math.max(
      rowHeight,
      doc.heightOfString(paymentLine, { width: paymentWidth })
    );
  }

  if (dueDate) {
    doc.font("Helvetica-Bold").fontSize(9).text(dueLabel, totalsX, paymentRowY, {
      width: 62,
    });
    doc.font("Helvetica").text(dueDate, totalsX + 66, paymentRowY, {
      width: PDF_LAYOUT.pageRight - (totalsX + 66),
      align: "right",
    });
    rowHeight = Math.max(rowHeight, 11);
  }

  doc.fillColor("#000000");
  return paymentRowY + rowHeight + 4;
}

/** Preventivo: piede + firma; la firma è l'ultima riga della pagina. */
export function layoutPdfQuoteClosing(
  doc: PdfDoc,
  company: CompanyInfo,
  footerInput: {
    totalLines: PdfFooterTotalLine[];
    paymentLineLeft?: string | null;
  },
  signatureOptions: {
    clientSignature?: string | null;
    signedAt?: Date | null;
    label?: string;
  }
): void {
  const pageBottom = pdfPageBottomY(doc);
  const contentEnd = doc.y;
  const gapAfterContent = 14;
  const gapFooterSignature = 10;

  const sigHeight = measurePdfSignatureBlockHeight(doc, signatureOptions);
  const footerHeight = estimateCourtesyFooterHeight(company, {
    ...footerInput,
    dueDateRight: null,
  });
  const closingHeight = footerHeight + gapFooterSignature + sigHeight;
  const minFooterTop = contentEnd + gapAfterContent;

  let footerTop = minFooterTop;
  let signatureTop = footerTop + footerHeight + gapFooterSignature;
  const canAnchorToBottom =
    minFooterTop + closingHeight <= pageBottom + 0.5;

  if (canAnchorToBottom) {
    signatureTop = pageBottom - sigHeight;
    footerTop = signatureTop - gapFooterSignature - footerHeight;
    if (footerTop < minFooterTop) {
      footerTop = minFooterTop;
      signatureTop = footerTop + footerHeight + gapFooterSignature;
    }
  } else if (minFooterTop + closingHeight > pageBottom) {
    doc.addPage();
    doc.x = PDF_LAYOUT.margin;
    doc.y = PDF_LAYOUT.margin;
    footerTop = PDF_LAYOUT.margin;
    signatureTop = footerTop + footerHeight + gapFooterSignature;
  }

  const footerEnd = drawPdfCourtesyFooter(doc, company, footerInput, {
    startY: footerTop,
    skipLeadingGap: true,
  });

  signatureTop = Math.max(signatureTop, footerEnd + gapFooterSignature);
  if (canAnchorToBottom) {
    signatureTop = pageBottom - sigHeight;
    if (signatureTop < footerEnd + gapFooterSignature) {
      signatureTop = footerEnd + gapFooterSignature;
    }
  }

  drawPdfSignatureBlock(doc, signatureOptions, { startY: signatureTop });
}

export type PdfPaymentScheduleLine = {
  label: string;
  amount: string;
};

/** Acconti e saldi sopra le note (non nella colonna totali). */
export function drawPdfPaymentScheduleSection(
  doc: PdfDoc,
  lines: PdfPaymentScheduleLine[]
): void {
  if (lines.length === 0) return;

  const blockHeight = 22 + lines.length * 14;
  const pageBottom = doc.page.height - PDF_LAYOUT.margin;
  if (doc.y + blockHeight > pageBottom) {
    doc.addPage();
    doc.x = PDF_LAYOUT.margin;
    doc.y = PDF_LAYOUT.margin;
  }

  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
  doc.text("Piano di pagamento", PDF_LAYOUT.margin, doc.y, { underline: true });
  doc.moveDown(0.45);
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  for (const line of lines) {
    doc.text(`${line.label}: ${line.amount}`, PDF_LAYOUT.margin, doc.y, {
      width: 495,
    });
    doc.moveDown(0.3);
  }
  doc.fillColor("#000000");
  doc.moveDown(0.2);
}

/** Note a tutta larghezza, allineate a sinistra (documento di cortesia). */
export function drawPdfNotesSectionLeft(doc: PdfDoc, notes?: string | null): void {
  const text = notes?.trim();
  if (!text) return;
  doc.x = PDF_LAYOUT.margin;
  doc.fillColor("#52525b").fontSize(9).text("Note", { underline: true });
  doc.fillColor("#111827").fontSize(9).text(text, {
    width: 495,
  });
  doc.moveDown(0.6);
  doc.fillColor("#000000");
}

/** Intestazione + cliente affiancati (verbali e varianti con titolo sottolineato). */
export function drawPdfHeaderClientRow(
  doc: PdfDoc,
  input: {
    referencesHeading: string;
    referenceLines: string[];
    client: ClientPdfInput;
  }
): number {
  const sectionTop = Math.max(doc.y, PDF_LAYOUT.sectionTopMin) + 6;
  const leftY = drawPdfReferencesBlock(
    doc,
    sectionTop,
    input.referencesHeading,
    input.referenceLines
  );
  const clientBottom = drawPdfClientBlock(
    doc,
    input.client,
    sectionTop,
    PDF_LAYOUT.clientBlockX,
    PDF_LAYOUT.clientBlockWidth,
    "right"
  );
  doc.y = Math.max(leftY, clientBottom) + 12;
  doc.x = PDF_LAYOUT.margin;
  return doc.y;
}

export type PdfLineItem = {
  description: string;
  quantity: number | { toString(): string };
  unit?: string | null;
  unitPrice: number | { toString(): string };
  total: number | { toString(): string };
};

/** Tabella voci (Descrizione, Q.tà, Prezzo, Totale). */
export function drawPdfLineItemsTable(doc: PdfDoc, items: PdfLineItem[]): void {
  if (items.length === 0) return;

  const { desc, qty, price, total } = PDF_LAYOUT.tableCols;
  const tableTop = doc.y;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Descrizione", desc, tableTop);
  doc.text("Q.tà", qty, tableTop, { width: 50, align: "right" });
  doc.text("Prezzo", price, tableTop, { width: 70, align: "right" });
  doc.text("Totale", total, tableTop, { width: 70, align: "right" });
  doc.font("Helvetica");
  doc.moveDown(0.5);
  doc
    .moveTo(PDF_LAYOUT.margin, doc.y)
    .lineTo(PDF_LAYOUT.pageRight, doc.y)
    .strokeColor("#e4e4e7")
    .stroke();
  doc.moveDown(0.3);

  for (const item of items) {
    const y = doc.y;
    if (y > 700) doc.addPage();
    doc.fontSize(9).text(item.description, desc, y, { width: 250 });
    const qtyText = item.unit
      ? `${pdfMoney(item.quantity)} ${item.unit}`
      : pdfMoney(item.quantity);
    doc.text(qtyText, qty, y, { width: 50, align: "right" });
    doc.text(`€ ${pdfMoney(item.unitPrice)}`, price, y, {
      width: 70,
      align: "right",
    });
    doc.text(`€ ${pdfMoney(item.total)}`, total, y, {
      width: 70,
      align: "right",
    });
    doc.moveDown(0.8);
  }
  doc.moveDown();
}

export function createPdfTotalsWriter(doc: PdfDoc, x = PDF_LAYOUT.totalsX) {
  return (label: string, value: string, bold = false) => {
    if (bold) doc.font("Helvetica-Bold");
    doc.fontSize(10).text(label, x, doc.y, { continued: true });
    doc.text(value, { align: "right" });
    if (bold) doc.font("Helvetica");
  };
}

/** Sottotitolo allineato a destra (es. Piano di pagamento). */
export function drawPdfTotalsSubheading(doc: PdfDoc, title: string): void {
  const x = PDF_LAYOUT.totalsX;
  const width = PDF_LAYOUT.pageRight - x;
  doc.moveDown(0.3);
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
  doc.text(title, x, doc.y, { width, align: "right" });
  doc.font("Helvetica");
  doc.moveDown(0.2);
}

/** @deprecated Usare drawPdfNotesSectionLeft per layout cortesia/preventivo. */
export function drawPdfNotesSection(doc: PdfDoc, notes?: string | null): void {
  drawPdfNotesSectionLeft(doc, notes);
}

/** Titolo di sezione sottolineato (verbali e sezioni aggiuntive). */
export function drawPdfSectionHeading(doc: PdfDoc, title: string): void {
  if (doc.y > 700) doc.addPage();
  doc.moveDown(0.4);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
  doc.text(title, PDF_LAYOUT.margin, doc.y, { underline: true });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(10).fillColor("#000000");
}

export function formatEventDatesPdf(
  eventAt?: Date | null,
  eventEndAt?: Date | null
): string {
  if (!eventAt) return "";
  const end = eventEndAt ?? eventAt;
  const sameDay = eventAt.toDateString() === end.toDateString();
  return sameDay
    ? eventAt.toLocaleDateString("it-IT")
    : `${eventAt.toLocaleDateString("it-IT")} – ${end.toLocaleDateString("it-IT")}`;
}

/** Località a sinistra, date evento a destra — sopra la tabella voci. */
export function drawPdfEventInfoRow(
  doc: PdfDoc,
  input: {
    location?: string | null;
    eventAt?: Date | null;
    eventEndAt?: Date | null;
  }
): number {
  const location = input.location?.trim() || "";
  const dates = formatEventDatesPdf(input.eventAt, input.eventEndAt);
  if (!location && !dates) return doc.y;

  const y = doc.y;
  const datesWidth = 210;
  const gap = 16;
  const locationWidth = dates ? 545 - 50 - datesWidth - gap : 495;
  const datesX = location ? 50 + locationWidth + gap : 545 - datesWidth;

  doc.fontSize(10).font("Helvetica").fillColor("#111827");
  if (location) {
    doc.text(location, 50, y, { width: locationWidth });
  }
  if (dates) {
    doc.text(dates, datesX, y, { width: datesWidth, align: "right" });
  }
  const rowHeight = Math.max(
    location ? doc.heightOfString(location, { width: locationWidth }) : 0,
    dates ? doc.heightOfString(dates, { width: datesWidth }) : 11,
    11
  );
  doc.y = y + rowHeight + 12;
  doc.fillColor("#000000");
  return doc.y;
}

/** Coordinate bancarie a posizione fissa; ritorna Y sotto l’ultima riga. */
export function drawPdfBankDetailsAt(
  doc: PdfDoc,
  company: CompanyInfo,
  x: number,
  top: number,
  width = 280
): number {
  const iban = company.iban?.trim();
  const bankName = company.bankName?.trim();
  const bic = company.bic?.trim();
  if (!iban && !bankName && !bic) return top;

  let y = top;
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
  doc.text("Coordinate bancarie", x, y, { width, underline: true });
  y += 14;
  doc.font("Helvetica").fontSize(9).fillColor("#52525b");
  const lines = [
    bankName ? `Banca: ${bankName}` : null,
    iban ? `IBAN: ${iban}` : null,
    bic ? `BIC/SWIFT: ${bic}` : null,
  ].filter(Boolean) as string[];
  for (const line of lines) {
    doc.text(line, x, y, { width });
    y += doc.heightOfString(line, { width }) + 3;
  }
  doc.fillColor("#000000");
  return y;
}

export function drawPdfBankDetails(doc: PdfDoc, company: CompanyInfo): void {
  const bottom = drawPdfBankDetailsAt(doc, company, 50, doc.y);
  doc.y = bottom;
}
