import PDFDocument from "pdfkit";
import type {
  Client,
  InterventionReport,
  ReportMaterial,
  User,
} from "@prisma/client";
import {
  drawPdfLetterhead,
  loadCompanySettings,
  loadLogoFilePath,
  type CompanyInfo,
} from "./pdfBranding.js";

type ReportWithRelations = InterventionReport & {
  client: Client;
  technician: Pick<User, "firstName" | "lastName" | "email" | "phone">;
  materials: ReportMaterial[];
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
    doc.font("Helvetica").fontSize(9).fillColor("#52525b").text("Non presente", 50);
  }
  doc.moveDown(0.5);
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
      titleRight: `Report ${report.number}`,
      subtitleRight,
    });

    const clientName =
      report.client.companyName ||
      report.client.contactName ||
      [report.client.firstName, report.client.lastName]
        .filter(Boolean)
        .join(" ") ||
      "Cliente";
    doc.fontSize(11).text("Cliente", { underline: true });
    doc.fontSize(10).text(clientName);
    if (report.client.email) doc.text(report.client.email);
    if (report.client.phone) doc.text(report.client.phone);
    doc.moveDown();

    doc.fontSize(11).text("Tecnico", { underline: true });
    doc.fontSize(10).text(
      `${report.technician.firstName} ${report.technician.lastName}`
    );
    if (report.technician.email) doc.text(report.technician.email);
    doc.moveDown();

    doc.fontSize(11).text("Ore lavoro", { underline: true });
    doc.fontSize(10).text(`${money(report.workHours)} h`);
    doc.moveDown();

    if (report.description) {
      doc.fontSize(11).text("Descrizione lavori", { underline: true });
      doc.fontSize(10).text(report.description);
      doc.moveDown();
    }

    if (report.materials.length > 0) {
      doc.fontSize(11).text("Materiali utilizzati", { underline: true });
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text("Materiale", 50, doc.y, { continued: true });
      doc.text("Q.tà", { align: "right" });
      doc.font("Helvetica").moveDown(0.3);
      for (const m of report.materials) {
        doc
          .fontSize(9)
          .text(m.name, 50, doc.y, { continued: true })
          .text(`${money(m.quantity)} ${m.unit || "pz"}`, { align: "right" });
        doc.moveDown(0.4);
      }
      doc.moveDown();
    }

    if (report.checklist) {
      doc.fontSize(11).text("Checklist", { underline: true });
      doc.moveDown(0.2);
      const items = Array.isArray(report.checklist)
        ? (report.checklist as { label?: string; checked?: boolean }[])
        : [];
      if (items.length === 0) {
        doc.fontSize(9).font("Helvetica").text("—");
      } else {
        for (const item of items) {
          const label =
            typeof item.label === "string" ? item.label : "Voce";
          const mark = item.checked ? "[x]" : "[ ]";
          doc.fontSize(9).font("Helvetica").text(`${mark} ${label}`);
          doc.moveDown(0.2);
        }
      }
      doc.moveDown();
    }

    if (report.checkInAt || report.checkOutAt) {
      doc.fontSize(11).text("Presenze", { underline: true });
      if (report.checkInAt) {
        doc
          .fontSize(10)
          .text(`Check-in: ${report.checkInAt.toLocaleString("it-IT")}`);
      }
      if (report.checkOutAt) {
        doc
          .fontSize(10)
          .text(`Check-out: ${report.checkOutAt.toLocaleString("it-IT")}`);
      }
      if (report.latitude != null && report.longitude != null) {
        doc.text(`GPS: ${report.latitude}, ${report.longitude}`);
      }
      doc.moveDown();
    }

    if (doc.y > 580) doc.addPage();
    doc.fontSize(11).text("Firme", { underline: true });
    doc.moveDown(0.5);
    drawSignatureImage(doc, "Firma tecnico", report.technicianSignature);
    drawSignatureImage(doc, "Firma cliente", report.clientSignature);

    doc.end();
  });
}
