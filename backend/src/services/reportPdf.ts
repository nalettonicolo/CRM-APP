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
  drawPdfEventInfoRow,
  drawPdfHeaderClientRow,
  drawPdfLetterhead,
  drawPdfSectionHeading,
  loadCompanySettings,
  loadLogoFilePath,
  pdfMoney,
  PDF_LAYOUT,
  type CompanyInfo,
} from "./pdfBranding.js";
import { formatSequentialDocumentNumber } from "./documentSequence.js";

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
      doc.image(buf, PDF_LAYOUT.margin, y, { width: 160, height: 55, fit: [160, 55] });
      doc.y = y + 62;
    } catch {
      doc.font("Helvetica").fontSize(9).text("Firma non disponibile", PDF_LAYOUT.margin);
    }
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#52525b")
      .text(DOCUMENT_COPY.report.signatureMissing, PDF_LAYOUT.margin);
  }
  doc.moveDown(0.5);
  doc.fillColor("#000000");
}

function ensureSpace(doc: PdfDoc, height = 90): void {
  if (doc.y + height > 760) doc.addPage();
}

function drawBodyText(doc: PdfDoc, text: string): void {
  ensureSpace(doc, 40);
  doc.fontSize(9).font("Helvetica").fillColor("#111827").text(text, PDF_LAYOUT.margin, doc.y, {
    width: 495,
  });
  doc.fillColor("#000000");
  doc.moveDown(0.4);
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

    const issueDate = report.submittedAt ?? report.createdAt;
    const subtitleRight = [
      `Emesso il: ${issueDate.toLocaleDateString("it-IT")}`,
    ];

    drawPdfLetterhead(doc, companyInfo, logoPath, {
      titleRight: `${DOCUMENT_COPY.report.pdfTitlePrefix} ${report.number}`,
      subtitleRight,
    });

    const technicianName = `${report.technician.firstName} ${report.technician.lastName}`.trim();
    const refLines = [
      `Stato: ${report.status}`,
      `Tecnico: ${technicianName}`,
      report.technician.email ? report.technician.email : null,
      report.technician.phone ? report.technician.phone : null,
      report.quote
        ? `Rif. preventivo: ${formatSequentialDocumentNumber(report.quote.number)}`
        : null,
      report.quote?.title?.trim()
        ? `Oggetto: ${report.quote.title.trim()}`
        : null,
    ].filter(Boolean) as string[];

    drawPdfHeaderClientRow(doc, {
      referencesHeading: DOCUMENT_COPY.report.referencesHeading,
      referenceLines: refLines,
      client: report.client,
    });

    if (report.quote) {
      drawPdfEventInfoRow(doc, {
        location: report.quote.eventLocation,
        eventAt: report.quote.eventAt,
        eventEndAt: report.quote.eventEndAt,
      });
    }

    const km = Number(report.kmTraveled ?? 0);
    const expenses = Number(report.expensesAmount ?? 0);
    drawPdfSectionHeading(doc, "Riepilogo attività");
    const summaryLines = [
      `Ore lavoro: ${pdfMoney(report.workHours)} h`,
      km > 0 ? `Km percorsi: ${pdfMoney(km)} km` : "Km percorsi: —",
      expenses > 0 ? `Costi sostenuti: € ${pdfMoney(expenses)}` : "Costi sostenuti: —",
      report.quote ? `Totale preventivo: € ${pdfMoney(report.quote.total)}` : null,
    ].filter(Boolean) as string[];
    for (const line of summaryLines) {
      doc.fontSize(10).text(line, PDF_LAYOUT.margin);
      doc.moveDown(0.2);
    }
    doc.moveDown(0.3);

    if (report.expensesNotes?.trim()) {
      drawPdfSectionHeading(doc, "Dettaglio costi");
      drawBodyText(doc, report.expensesNotes.trim());
    }

    if (report.description?.trim()) {
      drawPdfSectionHeading(doc, "Descrizione attività");
      drawBodyText(doc, report.description.trim());
    }

    if (report.materials.length > 0) {
      drawPdfSectionHeading(doc, "Materiali utilizzati");
      const tableTop = doc.y;
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Materiale", PDF_LAYOUT.margin, tableTop, { width: 360 });
      doc.text("Q.tà", 430, tableTop, { width: 115, align: "right" });
      doc.font("Helvetica");
      doc.moveDown(0.5);
      doc
        .moveTo(PDF_LAYOUT.margin, doc.y)
        .lineTo(PDF_LAYOUT.pageRight, doc.y)
        .strokeColor("#e4e4e7")
        .stroke();
      doc.moveDown(0.3);

      for (const m of report.materials) {
        ensureSpace(doc, 24);
        const rowY = doc.y;
        doc.fontSize(9).text(m.name, PDF_LAYOUT.margin, rowY, { width: 360 });
        doc.text(`${pdfMoney(m.quantity)} ${m.unit || "pz"}`, 430, rowY, {
          width: 115,
          align: "right",
        });
        doc.moveDown(0.6);
      }
      doc.moveDown(0.3);
    }

    const items = Array.isArray(report.checklist)
      ? (report.checklist as { label?: string; checked?: boolean }[])
      : [];
    if (items.length > 0) {
      drawPdfSectionHeading(doc, DOCUMENT_COPY.report.checklistHeading);
      for (const item of items) {
        const label = typeof item.label === "string" ? item.label.trim() : "";
        if (!label) continue;
        ensureSpace(doc, 24);
        const mark = item.checked ? "[x]" : "[-]";
        doc.fontSize(9).text(`${mark} ${label}`, PDF_LAYOUT.margin, doc.y, {
          width: 495,
        });
        doc.moveDown(0.25);
      }
      doc.moveDown(0.3);
    }

    if (
      report.checkInAt ||
      report.checkOutAt ||
      (report.latitude != null && report.longitude != null)
    ) {
      drawPdfSectionHeading(doc, "Presenze e posizione");
      if (report.checkInAt) {
        doc.fontSize(9).text(`Check-in: ${report.checkInAt.toLocaleString("it-IT")}`);
      }
      if (report.checkOutAt) {
        doc.fontSize(9).text(`Check-out: ${report.checkOutAt.toLocaleString("it-IT")}`);
      }
      if (report.latitude != null && report.longitude != null) {
        doc.fontSize(9).text(`GPS: ${report.latitude}, ${report.longitude}`);
      }
      doc.moveDown(0.4);
    }

    if (doc.y > 580) doc.addPage();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(DOCUMENT_COPY.report.signaturesHeading, PDF_LAYOUT.margin, doc.y, {
        underline: true,
      });
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
      .text(DOCUMENT_COPY.report.footerNote, PDF_LAYOUT.margin, doc.y, { width: 480 });

    doc.end();
  });
}
