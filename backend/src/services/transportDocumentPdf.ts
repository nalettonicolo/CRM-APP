import PDFDocument from "pdfkit";
import type {
  Client,
  TransportDocument,
  TransportDocumentLine,
} from "@prisma/client";
import {
  drawPdfLetterhead,
  loadCompanySettings,
  loadLogoFilePath,
  pdfMoney,
  PDF_LAYOUT,
  type CompanyInfo,
} from "./pdfBranding.js";
import {
  TRANSPORT_CARRIER_LABELS,
  TRANSPORT_REASON_LABELS,
} from "../constants/transportDocument.js";
import { formatTransportDocumentNumber } from "./transportDocumentNumber.js";

type PdfDoc = InstanceType<typeof PDFDocument>;

type DdtWithRelations = TransportDocument & {
  client: Client;
  lines: TransportDocumentLine[];
  quote?: { number: string; title?: string | null } | null;
};

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function clientDisplayName(client: Client): string {
  return (
    client.companyName ||
    client.contactName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    "Destinatario"
  );
}

function addressBlock(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(", ") || "—";
}

function drawBox(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  title: string,
  lines: string[]
) {
  const h = 18 + lines.length * 12 + 8;
  doc
    .rect(x, y, w, h)
    .strokeColor("#d4d4d8")
    .lineWidth(0.75)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#52525b")
    .text(title.toUpperCase(), x + 8, y + 6, { width: w - 16 });
  doc.font("Helvetica").fontSize(9).fillColor("#111827");
  let ly = y + 20;
  for (const line of lines) {
    doc.text(line, x + 8, ly, { width: w - 16 });
    ly += 12;
  }
  return y + h;
}

export async function generateTransportDocumentPdf(
  document: DdtWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const companyInfo = company ?? (await loadCompanySettings());
  const logoPath = await loadLogoFilePath();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const number = formatTransportDocumentNumber(document.number);
    drawPdfLetterhead(doc, companyInfo, logoPath, {
      titleRight: "DOCUMENTO DI TRASPORTO",
      subtitleRight: [`N. ${number}`, `Data: ${formatDate(document.issueDate)}`],
    });

    let y = doc.y + 16;
    const pageW = doc.page.width - PDF_LAYOUT.margin * 2;
    const colW = (pageW - 12) / 2;

    const recipientName =
      document.recipientName?.trim() || clientDisplayName(document.client);
    const recipientLines = [
      recipientName,
      addressBlock([
        document.recipientAddress || document.client.address,
        document.recipientPostalCode || document.client.postalCode,
        document.recipientCity || document.client.city,
        document.recipientProvince || document.client.province,
      ]),
      document.recipientVat || document.client.vatNumber
        ? `P.IVA: ${document.recipientVat || document.client.vatNumber}`
        : null,
      document.recipientFiscalCode || document.client.fiscalCode
        ? `C.F.: ${document.recipientFiscalCode || document.client.fiscalCode}`
        : null,
    ].filter(Boolean) as string[];

    const senderLines = [
      companyInfo.name || "Mittente",
      companyInfo.address || "—",
      companyInfo.vat ? `P.IVA: ${companyInfo.vat}` : null,
      [companyInfo.phone, companyInfo.email].filter(Boolean).join(" · ") || null,
    ].filter(Boolean) as string[];

    const boxBottom = Math.max(
      drawBox(doc, PDF_LAYOUT.margin, y, colW, "Mittente", senderLines),
      drawBox(doc, PDF_LAYOUT.margin + colW + 12, y, colW, "Destinatario", recipientLines)
    );

    y = boxBottom + 14;

    const destLines = addressBlock([
      document.destinationAddress,
      document.destinationPostalCode,
      document.destinationCity,
      document.destinationProvince,
    ]);
    if (destLines !== "—") {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#52525b").text("LUOGO DI DESTINAZIONE", PDF_LAYOUT.margin, y);
      doc.font("Helvetica").fontSize(9).fillColor("#111827").text(destLines, PDF_LAYOUT.margin, y + 12, { width: pageW });
      y = doc.y + 12;
    }

    const meta = [
      `Causale trasporto: ${TRANSPORT_REASON_LABELS[document.reason] || document.reason}`,
      `Trasporto a cura del: ${TRANSPORT_CARRIER_LABELS[document.carrier] || document.carrier}`,
      document.carrierName ? `Vettore: ${document.carrierName}` : null,
      document.vehiclePlate ? `Targa: ${document.vehiclePlate}` : null,
      document.driverName ? `Autista: ${document.driverName}` : null,
      document.transportStartAt
        ? `Inizio trasporto: ${formatDateTime(document.transportStartAt)}`
        : null,
      document.referenceDoc ? `Riferimento: ${document.referenceDoc}` : null,
      document.quote
        ? `Preventivo collegato: ${document.quote.number}${document.quote.title ? ` — ${document.quote.title}` : ""}`
        : null,
    ].filter(Boolean) as string[];

    doc.font("Helvetica").fontSize(9).fillColor("#111827");
    for (const line of meta) {
      doc.text(line, PDF_LAYOUT.margin, y, { width: pageW });
      y = doc.y + 2;
    }
    y += 8;

    const tableTop = y;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Descrizione", PDF_LAYOUT.margin, tableTop, { width: 280 });
    doc.text("Q.tà", 340, tableTop, { width: 50, align: "right" });
    doc.text("U.M.", 400, tableTop, { width: 40 });
    doc.text("Codice", 450, tableTop, { width: 80 });
    y = tableTop + 14;
    doc
      .moveTo(PDF_LAYOUT.margin, y)
      .lineTo(PDF_LAYOUT.pageRight, y)
      .strokeColor("#d4d4d8")
      .stroke();
    y += 6;

    doc.font("Helvetica").fontSize(9);
    const sortedLines = [...document.lines].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const line of sortedLines) {
      if (y > 680) {
        doc.addPage();
        y = 50;
      }
      const desc = line.notes?.trim()
        ? `${line.description}\n${line.notes.trim()}`
        : line.description;
      doc.text(desc, PDF_LAYOUT.margin, y, { width: 280 });
      const rowH = Math.max(14, doc.heightOfString(desc, { width: 280 }) + 4);
      doc.text(pdfMoney(line.quantity), 340, y, { width: 50, align: "right" });
      doc.text(line.unit || "pz", 400, y, { width: 40 });
      doc.text(line.sku || "—", 450, y, { width: 80 });
      y += rowH;
    }

    y += 10;
    const logistics = [
      document.packagesCount != null
        ? `N. colli: ${document.packagesCount}`
        : null,
      document.grossWeightKg != null
        ? `Peso lordo: ${pdfMoney(document.grossWeightKg)} kg`
        : null,
      document.appearance ? `Aspetto beni: ${document.appearance}` : null,
    ].filter(Boolean) as string[];

    if (logistics.length) {
      doc.font("Helvetica-Bold").fontSize(9).text("Dati logistici", PDF_LAYOUT.margin, y);
      y += 12;
      doc.font("Helvetica").fontSize(9);
      for (const line of logistics) {
        doc.text(line, PDF_LAYOUT.margin, y);
        y = doc.y + 2;
      }
      y += 8;
    }

    if (document.notes?.trim()) {
      doc.font("Helvetica-Bold").fontSize(9).text("Annotazioni", PDF_LAYOUT.margin, y);
      y += 12;
      doc.font("Helvetica").fontSize(9).text(document.notes.trim(), PDF_LAYOUT.margin, y, {
        width: pageW,
      });
      y = doc.y + 12;
    }

    const signY = Math.min(Math.max(y + 24, 640), 720);
    const signW = (pageW - 24) / 3;
    const labels = ["Firma mittente", "Firma vettore", "Firma destinatario"];
    for (let i = 0; i < 3; i++) {
      const x = PDF_LAYOUT.margin + i * (signW + 12);
      doc.font("Helvetica").fontSize(8).fillColor("#52525b").text(labels[i], x, signY);
      doc
        .moveTo(x, signY + 36)
        .lineTo(x + signW, signY + 36)
        .strokeColor("#d4d4d8")
        .stroke();
    }

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#71717a")
      .text(
        "Documento di trasporto (DDT) — conservare per eventuali controlli e abbinamento a documenti fiscali.",
        PDF_LAYOUT.margin,
        doc.page.height - 40,
        { width: pageW, align: "center" }
      );

    doc.end();
  });
}
