import PDFDocument from "pdfkit";
import type {
  Client,
  InterventionReport,
  Quote,
  QuoteItem,
  ReportMaterial,
  User,
} from "@prisma/client";
import { DOCUMENT_COPY } from "../constants/documentCopy.js";
import {
  drawPdfClientBlock,
  drawPdfEventInfoRow,
  drawPdfLetterhead,
  loadCompanySettings,
  loadLogoFilePath,
  type CompanyInfo,
} from "./pdfBranding.js";

type ReportWithRelations = InterventionReport & {
  client: Client;
  technician: Pick<User, "firstName" | "lastName" | "email" | "phone">;
  materials: ReportMaterial[];
  quote?:
    | (Pick<
        Quote,
        "number" | "title" | "status" | "total" | "eventAt" | "eventEndAt" | "eventLocation"
      > & {
        items: Pick<
          QuoteItem,
          "description" | "quantity" | "unit" | "unitPrice" | "total"
        >[];
      })
    | null;
};

function money(n: number | { toString(): string }) {
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function drawSignatureImage(
  doc: PdfDoc,
  label: string,
  dataUrl: string | null | undefined
): void {
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000").text(label);
  const sig = dataUrl?.trim();
  if (sig?.startsWith("data:image")) {
    try {
      const base64 = sig.includes(",") ? sig.split(",")[1]! : sig;
      const buf = Buffer.from(base64, "base64");
      const y = doc.y + 4;
      doc.image(buf, 50, y, { width: 160, height: 55, fit: [160, 55] });
      doc.y = y + 62;
    } catch {
      doc.font("Helvetica").fontSize(9).text("Firma non disponibile", 50);
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#52525b")
      .text(DOCUMENT_COPY.report.signatureMissing, 50);
  }
  doc.moveDown(0.5);
}

function ensureSpace(doc: PdfDoc, height = 90): void {
  if (doc.y + height > 760) doc.addPage();
}

function sectionTitle(doc: PdfDoc, title: string): void {
  ensureSpace(doc, 45);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
  doc.text(title, 50, doc.y);
  doc
    .moveTo(50, doc.y + 3)
    .lineTo(545, doc.y + 3)
    .strokeColor("#e5e7eb")
    .stroke();
  doc.moveDown(0.7);
  doc.fillColor("#000000").font("Helvetica");
}

function drawKeyValue(
  doc: PdfDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
): number {
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#6b7280").text(label, x, y, {
    width,
  });
  doc.font("Helvetica").fontSize(10).fillColor("#111827").text(value || "—", x, y + 12, {
    width,
  });
  return doc.y;
}

function drawInfoCard(
  doc: PdfDoc,
  title: string,
  rows: { label: string; value?: string | null }[],
  x: number,
  y: number,
  width: number
): number {
  const height = 38 + rows.length * 26;
  doc
    .roundedRect(x, y, width, height, 8)
    .fillAndStroke("#f8fafc", "#e5e7eb");
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(title, x + 12, y + 10, {
    width: width - 24,
  });
  let rowY = y + 30;
  for (const row of rows) {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor("#6b7280")
      .text(row.label.toUpperCase(), x + 12, rowY, { width: width - 24 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#111827")
      .text(row.value?.trim() || "—", x + 12, rowY + 10, {
        width: width - 24,
      });
    rowY += 26;
  }
  doc.fillColor("#000000").font("Helvetica");
  return y + height;
}

export async function generateReportPdf(
  report: ReportWithRelations,
  company?: CompanyInfo
): Promise<Buffer> {
  const companyInfo = company ?? (await loadCompanySettings());
  const logoPath = await loadLogoFilePath();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const subtitleRight = [
      `Stato: ${report.status}`,
      `Data: ${report.createdAt.toLocaleDateString("it-IT")}`,
    ];
    if (report.submittedAt) {
      subtitleRight.push(
        `Inviato: ${report.submittedAt.toLocaleDateString("it-IT")}`
      );
    }

    drawPdfLetterhead(doc, companyInfo, logoPath, {
      titleRight: `${DOCUMENT_COPY.report.pdfTitlePrefix} ${report.number}`,
      subtitleRight,
    });

    const technicianName = `${report.technician.firstName} ${report.technician.lastName}`;
    const topY = doc.y;
    const leftBottom = drawPdfClientBlock(doc, report.client, topY, 50, 238, "left");
    const rightBottom = drawInfoCard(
      doc,
      "Tecnico",
      [
        { label: "Nome", value: technicianName },
        { label: "Email", value: report.technician.email },
        { label: "Telefono", value: report.technician.phone },
      ],
      307,
      topY,
      238
    );
    doc.y = Math.max(leftBottom, rightBottom) + 12;

    if (report.quote) {
      const quoteBottom = drawInfoCard(
        doc,
        "Preventivo di riferimento",
        [
          { label: "Numero", value: report.quote.number },
          { label: "Oggetto", value: report.quote.title },
          { label: "Totale", value: `€ ${money(report.quote.total)}` },
        ],
        50,
        doc.y,
        495
      );
      doc.y = quoteBottom + 12;
    }

    const km = Number(report.kmTraveled ?? 0);
    const expenses = Number(report.expensesAmount ?? 0);
    const metricsY = doc.y;
    const metricWidth = 151;
    drawKeyValue(doc, "Ore lavoro", `${money(report.workHours)} h`, 50, metricsY, metricWidth);
    drawKeyValue(doc, "Km percorsi", km > 0 ? `${money(km)} km` : "—", 222, metricsY, metricWidth);
    drawKeyValue(doc, "Costi sostenuti", expenses > 0 ? `€ ${money(expenses)}` : "—", 394, metricsY, metricWidth);
    doc.y = metricsY + 44;

    const expensesNotes = report.expensesNotes;
    if (expensesNotes?.trim()) {
      sectionTitle(doc, "Dettaglio costi");
      doc.fontSize(9).font("Helvetica").fillColor("#111827").text(expensesNotes.trim(), 50, doc.y, {
        width: 495,
      });
      doc.fillColor("#000000");
    }

    if (report.description?.trim()) {
      sectionTitle(doc, "Descrizione attività");
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#111827")
        .text(report.description.trim(), 50, doc.y, { width: 495 });
      doc.fillColor("#000000");
    }

    if (report.quote) {
      drawPdfEventInfoRow(doc, {
        location: report.quote.eventLocation,
        eventAt: report.quote.eventAt,
        eventEndAt: report.quote.eventEndAt,
      });
    }

    if (report.materials.length > 0) {
      sectionTitle(doc, "Materiali utilizzati");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#6b7280");
      doc.text("Materiale", 50, doc.y, { width: 360, continued: true });
      doc.text("Q.tà", { align: "right" });
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(9).fillColor("#111827");
      for (const m of report.materials) {
        ensureSpace(doc, 24);
        const rowY = doc.y;
        doc.text(m.name, 50, rowY, { width: 360 });
        doc.text(`${money(m.quantity)} ${m.unit || "pz"}`, 430, rowY, {
          width: 115,
          align: "right",
        });
        doc.moveDown(0.5);
      }
      doc.fillColor("#000000");
    }

    const items = Array.isArray(report.checklist)
      ? (report.checklist as { label?: string; checked?: boolean }[])
      : [];
    if (items.length > 0) {
      sectionTitle(doc, DOCUMENT_COPY.report.checklistHeading);
      for (const item of items) {
        const label = typeof item.label === "string" ? item.label.trim() : "";
        if (!label) continue;
        ensureSpace(doc, 24);
        const mark = item.checked ? "[x]" : "[-]";
        doc.font("Helvetica").fontSize(9).fillColor("#111827").text(`${mark} ${label}`, 50, doc.y, {
          width: 495,
        });
        doc.moveDown(0.25);
      }
      doc.fillColor("#000000");
    }

    if (report.checkInAt || report.checkOutAt || (report.latitude != null && report.longitude != null)) {
      sectionTitle(doc, "Presenze e posizione");
      if (report.checkInAt) {
        doc.fontSize(9).text(`Check-in: ${report.checkInAt.toLocaleString("it-IT")}`);
      }
      if (report.checkOutAt) {
        doc.fontSize(9).text(`Check-out: ${report.checkOutAt.toLocaleString("it-IT")}`);
      }
      if (report.latitude != null && report.longitude != null) {
        doc.fontSize(9).text(`GPS: ${report.latitude}, ${report.longitude}`);
      }
    }

    if (doc.y > 580) doc.addPage();
    doc
      .fontSize(11)
      .text(DOCUMENT_COPY.report.signaturesHeading, { underline: true });
    doc.moveDown(0.5);
    drawSignatureImage(
      doc,
      DOCUMENT_COPY.report.technicianSignLabel,
      report.technicianSignature
    );
    drawSignatureImage(
      doc,
      DOCUMENT_COPY.report.clientSignLabel,
      report.clientSignature
    );

    doc.moveDown();
    doc
      .fontSize(8)
      .fillColor("#71717a")
      .text(DOCUMENT_COPY.report.footerNote, 50, doc.y, { width: 480 });

    doc.end();
  });
}
