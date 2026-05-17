import PDFDocument from "pdfkit";
import type {
  Client,
  InterventionReport,
  ReportMaterial,
  User,
} from "@prisma/client";
import { loadCompanySettings } from "./quotePdf.js";

type CompanyInfo = Awaited<ReturnType<typeof loadCompanySettings>>;

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

export function generateReportPdf(
  report: ReportWithRelations,
  company: CompanyInfo
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const companyName = company.name || "Report intervento";
    doc.fontSize(18).text(companyName, { align: "left" });
    doc.fontSize(10).fillColor("#52525b");
    const lines = [
      company.address,
      company.vat ? `P.IVA: ${company.vat}` : null,
      [company.phone, company.email].filter(Boolean).join(" · "),
    ].filter(Boolean) as string[];
    for (const line of lines) doc.text(line);
    doc.fillColor("#000000").moveDown();

    doc.fontSize(14).text(`Report ${report.number}`, { align: "right" });
    doc
      .fontSize(10)
      .text(`Stato: ${report.status}`, { align: "right" })
      .text(`Data: ${report.createdAt.toLocaleDateString("it-IT")}`, {
        align: "right",
      });
    if (report.submittedAt) {
      doc.text(
        `Inviato: ${report.submittedAt.toLocaleDateString("it-IT")}`,
        { align: "right" }
      );
    }
    doc.moveDown();

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
      doc.fontSize(9).text(JSON.stringify(report.checklist, null, 2));
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

    doc.fontSize(11).text("Firme", { underline: true });
    doc.fontSize(9).fillColor("#52525b");
    if (report.technicianSignature) {
      doc.text("Firma tecnico: registrata");
    } else {
      doc.text("Firma tecnico: non presente");
    }
    if (report.clientSignature) {
      doc.text("Firma cliente: registrata");
    } else {
      doc.text("Firma cliente: non presente");
    }
    doc
      .fillColor("#71717a")
      .fontSize(8)
      .text(
        "Le firme digitali sono archiviate nel sistema e non sono riprodotte in questo PDF.",
        { width: 500 }
      );

    doc.end();
  });
}
