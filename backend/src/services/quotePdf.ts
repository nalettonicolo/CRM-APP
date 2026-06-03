import PDFDocument from "pdfkit";
import type {
  Client,
  Quote,
  QuoteItem,
  QuotePaymentTerm,
} from "@prisma/client";
import { DOCUMENT_COPY } from "../constants/documentCopy.js";
import {
  createPdfTotalsWriter,
  drawPdfBankDetails,
  drawPdfEventInfoRow,
  drawPdfHeaderClientRow,
  drawPdfLetterhead,
  drawPdfLineItemsTable,
  drawPdfNotesSection,
  drawPdfSignatureBlock,
  loadCompanySettings,
  loadLogoFilePath,
  pdfMoney,
  type CompanyInfo,
} from "./pdfBranding.js";

export { loadCompanySettings };

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

    drawPdfLetterhead(doc, companyInfo, logoPath, {
      titleRight: `Preventivo ${quote.number}`,
      subtitleRight: [
        `Emesso il: ${quote.createdAt.toLocaleDateString("it-IT")}`,
      ],
    });

    const refLines = [
      quote.title?.trim() ? `Oggetto: ${quote.title.trim()}` : null,
      quote.validUntil
        ? `Offerta valida fino al: ${quote.validUntil.toLocaleDateString("it-IT")}`
        : null,
    ].filter(Boolean) as string[];

    drawPdfHeaderClientRow(doc, {
      referencesHeading: "Riferimenti preventivo",
      referenceLines: refLines,
      client: quote.client,
    });

    drawPdfEventInfoRow(doc, {
      location: quote.eventLocation,
      eventAt: quote.eventAt,
      eventEndAt: quote.eventEndAt,
    });

    drawPdfLineItemsTable(doc, quote.items);

    const addTotalLine = createPdfTotalsWriter(doc);
    addTotalLine("Imponibile", `€ ${pdfMoney(quote.subtotal)}`);
    if (Number(quote.discountAmount) > 0) {
      addTotalLine("Sconto", `- € ${pdfMoney(quote.discountAmount)}`);
    }
    addTotalLine("IVA", `€ ${pdfMoney(quote.vatAmount)}`);
    addTotalLine("Totale", `€ ${pdfMoney(quote.total)}`, true);
    if (Number(quote.withholdingTaxAmount) > 0) {
      const pct = Number(quote.withholdingTaxPercent);
      const label =
        pct > 0
          ? `Ritenuta d'acconto (${pdfMoney(pct)}%)`
          : "Ritenuta d'acconto";
      addTotalLine(label, `- € ${pdfMoney(quote.withholdingTaxAmount)}`);
    }
    if (Number(quote.stampDutyAmount) > 0) {
      addTotalLine("Marca da bollo", `€ ${pdfMoney(quote.stampDutyAmount)}`);
    }
    if (
      Number(quote.netPayable) > 0 &&
      Number(quote.netPayable) !== Number(quote.total)
    ) {
      addTotalLine("Netto a pagare", `€ ${pdfMoney(quote.netPayable)}`, true);
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
            ? ` (${pdfMoney(term.percent)}%)`
            : "";
        const note = term.note?.trim() ? ` — ${term.note.trim()}` : "";
        addTotalLine(
          `${term.label}${pct}${note}`,
          `€ ${pdfMoney(Number(term.amount))}`
        );
      }
      if (Number(quote.balanceDue) >= 0) {
        const hasBalanceRow = paymentTerms.some((t) => t.isBalance);
        if (!hasBalanceRow && Number(quote.balanceDue) > 0) {
          addTotalLine("Saldo da versare", `€ ${pdfMoney(quote.balanceDue)}`, true);
        }
      }
    } else {
      const depPct = Number(quote.depositPercent);
      const depAmt = Number(quote.depositAmount);
      if (depPct > 0 || depAmt > 0) {
        const depLabel =
          depPct > 0 ? `Acconto (${pdfMoney(depPct)}%)` : "Acconto richiesto";
        addTotalLine(depLabel, `€ ${pdfMoney(depAmt)}`);
        addTotalLine("Saldo da versare", `€ ${pdfMoney(quote.balanceDue)}`, true);
      }
    }

    drawPdfNotesSection(doc, quote.notes);
    drawPdfBankDetails(doc, companyInfo);

    drawPdfSignatureBlock(doc, {
      clientSignature: quote.clientSignature,
      signedAt: quote.signedAt,
    });

    doc.end();
  });
}
