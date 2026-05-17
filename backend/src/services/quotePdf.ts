import PDFDocument from "pdfkit";
import type { Client, Quote, QuoteItem } from "@prisma/client";

type CompanyInfo = {
  name?: string;
  vat?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
};

function money(n: number | { toString(): string }) {
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function generateQuotePdf(
  quote: Quote & { items: QuoteItem[]; client: Client },
  company: CompanyInfo
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const companyName = company.name || "Preventivo";
    doc.fontSize(18).text(companyName, { align: "left" });
    doc.fontSize(10).fillColor("#52525b");
    const lines = [
      company.address,
      company.vat ? `P.IVA: ${company.vat}` : null,
      [company.phone, company.email].filter(Boolean).join(" · "),
      company.website,
    ].filter(Boolean) as string[];
    for (const line of lines) doc.text(line);
    doc.fillColor("#000000").moveDown();

    doc.fontSize(14).text(`Preventivo ${quote.number}`, { align: "right" });
    if (quote.title) doc.fontSize(11).text(quote.title, { align: "right" });
    doc
      .fontSize(10)
      .text(`Data: ${quote.createdAt.toLocaleDateString("it-IT")}`, {
        align: "right",
      });
    if (quote.validUntil) {
      doc.text(
        `Valido fino al: ${quote.validUntil.toLocaleDateString("it-IT")}`,
        { align: "right" }
      );
    }
    doc.moveDown();

    const clientName =
      quote.client.companyName ||
      quote.client.contactName ||
      [quote.client.firstName, quote.client.lastName].filter(Boolean).join(" ") ||
      "Cliente";
    doc.fontSize(11).text("Cliente", { underline: true });
    doc.fontSize(10).text(clientName);
    if (quote.client.address) {
      const addr = [
        quote.client.address,
        quote.client.postalCode,
        quote.client.city,
        quote.client.province,
      ]
        .filter(Boolean)
        .join(" ");
      doc.text(addr);
    }
    if (quote.client.email) doc.text(quote.client.email);
    if (quote.client.phone) doc.text(quote.client.phone);
    doc.moveDown();

    const tableTop = doc.y;
    const colDesc = 50;
    const colQty = 320;
    const colPrice = 380;
    const colTotal = 480;

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Descrizione", colDesc, tableTop);
    doc.text("Q.tà", colQty, tableTop, { width: 50, align: "right" });
    doc.text("Prezzo", colPrice, tableTop, { width: 70, align: "right" });
    doc.text("Totale", colTotal, tableTop, { width: 70, align: "right" });
    doc.font("Helvetica");
    doc.moveDown(0.5);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#e4e4e7")
      .stroke();
    doc.moveDown(0.3);

    for (const item of quote.items) {
      const y = doc.y;
      if (y > 700) {
        doc.addPage();
      }
      doc.fontSize(9).text(item.description, colDesc, doc.y, { width: 250 });
      const rowY = y;
      doc.text(money(item.quantity), colQty, rowY, {
        width: 50,
        align: "right",
      });
      doc.text(`€ ${money(item.unitPrice)}`, colPrice, rowY, {
        width: 70,
        align: "right",
      });
      doc.text(`€ ${money(item.total)}`, colTotal, rowY, {
        width: 70,
        align: "right",
      });
      doc.moveDown(0.8);
    }

    doc.moveDown();
    const totalsX = 380;
    const addTotalLine = (label: string, value: string, bold = false) => {
      if (bold) doc.font("Helvetica-Bold");
      doc.fontSize(10).text(label, totalsX, doc.y, { continued: true });
      doc.text(value, { align: "right" });
      if (bold) doc.font("Helvetica");
    };

    addTotalLine("Imponibile", `€ ${money(quote.subtotal)}`);
    if (Number(quote.discountAmount) > 0) {
      addTotalLine("Sconto", `- € ${money(quote.discountAmount)}`);
    }
    addTotalLine("IVA", `€ ${money(quote.vatAmount)}`);
    addTotalLine("Totale", `€ ${money(quote.total)}`, true);
    if (Number(quote.depositAmount) > 0) {
      addTotalLine("Acconto", `€ ${money(quote.depositAmount)}`);
      addTotalLine("Saldo", `€ ${money(quote.balanceDue)}`, true);
    }

    if (quote.notes) {
      doc.moveDown();
      doc.fontSize(9).fillColor("#52525b").text("Note", { underline: true });
      doc.text(quote.notes);
    }

    doc.end();
  });
}

export async function loadCompanySettings(): Promise<CompanyInfo> {
  const { prisma } = await import("../lib/prisma.js");
  const row = await prisma.setting.findUnique({ where: { key: "company" } });
  const value = (row?.value || {}) as CompanyInfo;
  return value;
}
