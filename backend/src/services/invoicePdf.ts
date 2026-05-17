import PDFDocument from "pdfkit";
import type { Client, InvoicePreview, Quote } from "@prisma/client";
import { loadCompanySettings } from "./quotePdf.js";

type CompanyInfo = Awaited<ReturnType<typeof loadCompanySettings>>;

type InvoiceWithRelations = InvoicePreview & {
  client: Client;
  quote?: Quote | null;
};

function money(n: number | { toString(): string }) {
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function generateInvoicePdf(
  invoice: InvoiceWithRelations,
  company: CompanyInfo
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const companyName = company.name || "Fattura proforma";
    doc.fontSize(18).text(companyName, { align: "left" });
    doc.fontSize(10).fillColor("#52525b");
    const lines = [
      company.address,
      company.vat ? `P.IVA: ${company.vat}` : null,
      [company.phone, company.email].filter(Boolean).join(" · "),
    ].filter(Boolean) as string[];
    for (const line of lines) doc.text(line);
    doc.fillColor("#000000").moveDown();

    doc.fontSize(14).text(`Fattura proforma ${invoice.number}`, {
      align: "right",
    });
    doc
      .fontSize(10)
      .text(`Data: ${invoice.createdAt.toLocaleDateString("it-IT")}`, {
        align: "right",
      });
    if (invoice.dueDate) {
      doc.text(
        `Scadenza: ${invoice.dueDate.toLocaleDateString("it-IT")}`,
        { align: "right" }
      );
    }
    if (invoice.quote) {
      doc.text(`Rif. preventivo: ${invoice.quote.number}`, { align: "right" });
    }
    doc.moveDown();

    const clientName =
      invoice.client.companyName ||
      invoice.client.contactName ||
      [invoice.client.firstName, invoice.client.lastName]
        .filter(Boolean)
        .join(" ") ||
      "Cliente";
    doc.fontSize(11).text("Cliente", { underline: true });
    doc.fontSize(10).text(clientName);
    if (invoice.client.email) doc.text(invoice.client.email);
    doc.moveDown();

    const totalsX = 380;
    const addTotalLine = (label: string, value: string, bold = false) => {
      if (bold) doc.font("Helvetica-Bold");
      doc.fontSize(10).text(label, totalsX, doc.y, { continued: true });
      doc.text(value, { align: "right" });
      if (bold) doc.font("Helvetica");
    };

    addTotalLine("Imponibile", `€ ${money(invoice.subtotal)}`);
    addTotalLine("IVA", `€ ${money(invoice.vatAmount)}`);
    addTotalLine("Totale", `€ ${money(invoice.total)}`, true);
    if (Number(invoice.depositAmount) > 0) {
      addTotalLine("Acconto", `€ ${money(invoice.depositAmount)}`);
      addTotalLine("Saldo", `€ ${money(invoice.balanceDue)}`, true);
    }

    doc.moveDown();
    doc
      .fontSize(8)
      .fillColor("#71717a")
      .text(invoice.disclaimer, { width: 500 });

    if (invoice.notes) {
      doc.moveDown();
      doc.fillColor("#52525b").fontSize(9).text("Note", { underline: true });
      doc.text(invoice.notes);
    }

    doc.end();
  });
}
