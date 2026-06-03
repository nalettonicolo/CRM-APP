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
  }
): void {
  if (doc.y > 620) doc.addPage();

  doc.moveDown(1.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
  doc.text(
    options.label || DOCUMENT_COPY.quote.acceptanceHeading,
    50,
    doc.y,
    { underline: true }
  );
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(9).fillColor("#52525b");

  const sig = options.clientSignature?.trim();
  if (sig?.startsWith("data:image")) {
    try {
      const base64 = sig.includes(",") ? sig.split(",")[1]! : sig;
      const buf = Buffer.from(base64, "base64");
      const y = doc.y;
      doc.image(buf, 50, y, { width: 200, height: 70, fit: [200, 70] });
      doc.y = y + 78;
      if (options.signedAt) {
        doc.text(
          `Firmato digitalmente il ${options.signedAt.toLocaleDateString("it-IT")} alle ${options.signedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          50
        );
      }
      doc.text(DOCUMENT_COPY.quote.acceptanceDigital, 50, doc.y, { width: 480 });
      doc.moveDown(0.3);
      doc.text(DOCUMENT_COPY.quote.acceptanceDigitalChannel, 50, doc.y, {
        width: 480,
      });
    } catch {
      drawEmptySignatureLines(doc);
    }
  } else {
    drawEmptySignatureLines(doc);
  }

  doc.fillColor("#000000");
}

function drawEmptySignatureLines(doc: PdfDoc): void {
  doc.moveDown(0.5);
  doc.text(DOCUMENT_COPY.quote.acceptancePaper, 50, doc.y, { width: 480 });
  doc.moveDown(1);
  doc.text(DOCUMENT_COPY.quote.paperDateLine, 50);
  doc.moveDown(0.8);
  doc.text(DOCUMENT_COPY.quote.paperSignLine, 50);
  doc.moveDown(0.5);
  doc.fontSize(8).text(DOCUMENT_COPY.quote.paperNote, 50, doc.y, { width: 480 });
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

/** Piede: coordinate bancarie a sinistra, totali (e scadenza) a destra. */
export function drawPdfCourtesyFooter(
  doc: PdfDoc,
  company: CompanyInfo,
  input: {
    totalLines: PdfFooterTotalLine[];
    paymentLineLeft?: string | null;
    dueLabelRight?: string | null;
    dueDateRight?: string | null;
  }
): number {
  const totalsX = PDF_LAYOUT.totalsX;
  const totalsLineCount =
    input.totalLines.length + (input.dueDateRight ? 1 : 0);
  const summaryHeight = Math.max(72, totalsLineCount * 15 + 48) + 40;
  const summaryY = Math.max(doc.y + 10, doc.page.height - summaryHeight - 52);

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

  const paymentRowY = Math.max(cursorY, bankBottomY) + 14;
  const paymentLine = input.paymentLineLeft?.trim();
  const dueDate = input.dueDateRight?.trim();
  const dueLabel = input.dueLabelRight?.trim() || "Scadenza";

  if (paymentLine) {
    const paymentWidth = totalsX - PDF_LAYOUT.margin - 28;
    doc.fontSize(9).font("Helvetica").text(paymentLine, PDF_LAYOUT.margin, paymentRowY, {
      width: paymentWidth,
      lineGap: 1,
    });
  }

  if (dueDate) {
    doc.font("Helvetica-Bold").text(dueLabel, totalsX, paymentRowY, { width: 62 });
    doc.font("Helvetica").text(dueDate, totalsX + 66, paymentRowY, {
      width: PDF_LAYOUT.pageRight - (totalsX + 66),
      align: "right",
    });
  }

  const paymentRowHeight = paymentLine
    ? doc.heightOfString(paymentLine, {
        width: totalsX - PDF_LAYOUT.margin - 28,
      })
    : 11;

  return paymentRowY + paymentRowHeight + 4;
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
