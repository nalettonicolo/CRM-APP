import PDFDocument from "pdfkit";
import type {
  Client,
  Quote,
  QuoteItem,
  QuotePaymentTerm,
} from "@prisma/client";
import {
  drawPdfBankDetails,
  drawPdfClientBlock,
  drawPdfEventInfoRow,
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
      `Emesso il: ${quote.createdAt.toLocaleDateString("it-IT")}`,
    ];

    drawPdfLetterhead(doc, companyInfo, logoPath, {
      titleRight: `Preventivo ${quote.number}`,
      subtitleRight,
    });

    const sectionTop = Math.max(doc.y, 118) + 6;
    const leftX = 50;
    const leftWidth = 280;
    let leftY = sectionTop;

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Riferimenti preventivo", leftX, leftY, { width: leftWidth, underline: true });
    leftY += 16;
    doc.font("Helvetica").fontSize(10);
    const refLines = [
      quote.title?.trim() ? `Oggetto: ${quote.title.trim()}` : null,
      quote.validUntil
        ? `Offerta valida fino al: ${quote.validUntil.toLocaleDateString("it-IT")}`
        : null,
    ].filter(Boolean) as string[];
    for (const line of refLines) {
      doc.text(line, leftX, leftY, { width: leftWidth });
      leftY += doc.heightOfString(line, { width: leftWidth }) + 4;
    }

    const clientBottom = drawPdfClientBlock(
      doc,
      quote.client,
      sectionTop,
      300,
      245,
      "right"
    );

    doc.y = Math.max(leftY, clientBottom) + 12;
    doc.x = 50;
    drawPdfEventInfoRow(doc, {
      location: quote.eventLocation,
      eventAt: quote.eventAt,
      eventEndAt: quote.eventEndAt,
    });

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
    if (Number(quote.withholdingTaxAmount) > 0) {
      const pct = Number(quote.withholdingTaxPercent);
      const label =
        pct > 0
          ? `Ritenuta d'acconto (${money(pct)}%)`
          : "Ritenuta d'acconto";
      addTotalLine(label, `- € ${money(quote.withholdingTaxAmount)}`);
    }
    if (Number(quote.stampDutyAmount) > 0) {
      addTotalLine("Marca da bollo", `€ ${money(quote.stampDutyAmount)}`);
    }
    if (
      Number(quote.netPayable) > 0 &&
      Number(quote.netPayable) !== Number(quote.total)
    ) {
      addTotalLine("Netto a pagare", `€ ${money(quote.netPayable)}`, true);
    }

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

    drawPdfBankDetails(doc, companyInfo);

    drawPdfSignatureBlock(doc, {
      clientSignature: quote.clientSignature,
      signedAt: quote.signedAt,
    });

    doc.end();
  });
}
