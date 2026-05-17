import PDFDocument from "pdfkit";
import type {
  Client,
  Quote,
  QuoteItem,
  QuotePaymentTerm,
} from "@prisma/client";
import {
  drawPdfLetterhead,
  drawPdfSignatureBlock,
  loadCompanySettings,
  loadLogoFilePath,
  type CompanyInfo,
} from "./pdfBranding.js";

export { loadCompanySettings };

function money(n: number | { toString(): string }) {
  return Number(n).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function generateQuotePdf(
  quote: Quote & {
    items: QuoteItem[];
    paymentTerms?: QuotePaymentTerm[];
    client: Client;
    clientSignature?: string | null;
  },
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
      `Data: ${quote.createdAt.toLocaleDateString("it-IT")}`,
    ];
    if (quote.validUntil) {
      subtitleRight.push(
        `Valido fino al: ${quote.validUntil.toLocaleDateString("it-IT")}`
      );
    }

    drawPdfLetterhead(doc, companyInfo, logoPath, {
      titleRight: `Preventivo ${quote.number}`,
      subtitleRight: quote.title
        ? [quote.title, ...subtitleRight]
        : subtitleRight,
    });

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
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e4e4e7").stroke();
    doc.moveDown(0.3);

    for (const item of quote.items) {
      const y = doc.y;
      if (y > 700) doc.addPage();
      doc.fontSize(9).text(item.description, colDesc, doc.y, { width: 250 });
      const rowY = y;
      const qtyText = item.unit
        ? `${money(item.quantity)} ${item.unit}`
        : money(item.quantity);
      doc.text(qtyText, colQty, rowY, { width: 50, align: "right" });
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

    const paymentTerms = quote.paymentTerms;

    if (paymentTerms && paymentTerms.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica-Bold").text("Piano di pagamento");
      doc.font("Helvetica");
      doc.moveDown(0.2);
      for (const term of paymentTerms) {
        const pct =
          term.percent != null && Number(term.percent) > 0
            ? ` (${money(term.percent)}%)`
            : "";
        const note = term.note?.trim() ? ` — ${term.note.trim()}` : "";
        addTotalLine(
          `${term.label}${pct}${note}`,
          `€ ${money(Number(term.amount))}`
        );
      }
      if (Number(quote.balanceDue) >= 0) {
        const hasBalanceRow = paymentTerms.some((t) => t.isBalance);
        if (!hasBalanceRow && Number(quote.balanceDue) > 0) {
          addTotalLine("Saldo da versare", `€ ${money(quote.balanceDue)}`, true);
        }
      }
    } else {
      const depPct = Number(quote.depositPercent);
      const depAmt = Number(quote.depositAmount);
      if (depPct > 0 || depAmt > 0) {
        const depLabel =
          depPct > 0 ? `Acconto (${money(depPct)}%)` : "Acconto richiesto";
        addTotalLine(depLabel, `€ ${money(depAmt)}`);
        addTotalLine("Saldo da versare", `€ ${money(quote.balanceDue)}`, true);
      }
    }

    if (quote.notes) {
      doc.moveDown();
      doc.fontSize(9).fillColor("#52525b").text("Note", { underline: true });
      doc.fillColor("#000000").text(quote.notes);
    }

    drawPdfSignatureBlock(doc, {
      clientSignature: quote.clientSignature,
      signedAt: quote.signedAt,
    });

    doc.end();
  });
}
