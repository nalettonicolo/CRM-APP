import { DOCUMENT_COPY } from "./documentCopy.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Corpo email preventivo — nessun importo (dettagli solo nel PDF). */
export function quoteEmailBody(options: {
  number: string;
  title?: string | null;
}): string {
  const titleBlock = options.title?.trim()
    ? `<p><strong>Oggetto:</strong> ${escapeHtml(options.title.trim())}</p>`
    : "";
  return `<p>Buongiorno,</p>
<p>in allegato trovi il preventivo <strong>${escapeHtml(options.number)}</strong> con il riepilogo delle attività e delle condizioni proposte.</p>
${titleBlock}
<p>Ti invitiamo a consultare il documento PDF per tutti i dettagli. Per qualsiasi chiarimento restiamo a disposizione.</p>
<p>Cordiali saluti</p>`;
}

/** Corpo email documento di cortesia — nessun importo. */
export function invoiceEmailBody(options: { number: string }): string {
  const label = DOCUMENT_COPY.invoice.pdfTitlePrefix;
  return `<p>Buongiorno,</p>
<p>in allegato trovi il <strong>${escapeHtml(label)}</strong> con riferimento <strong>${escapeHtml(options.number)}</strong>.</p>
<p>Il documento riepiloga le informazioni a uso gestionale; per il dettaglio completo consulta il PDF allegato.</p>
<p>Restiamo a disposizione per ogni necessità.</p>
<p>Cordiali saluti</p>`;
}

/** Corpo email verbale di intervento — nessun importo né ore in email. */
export function reportEmailBody(options: { number: string }): string {
  return `<p>Buongiorno,</p>
<p>in allegato trovi il verbale di intervento <strong>${escapeHtml(options.number)}</strong> con il resoconto dell&apos;attività svolta.</p>
<p>Ti invitiamo a leggere il PDF per tutti i dettagli operativi e le eventuali osservazioni.</p>
<p>Cordiali saluti</p>`;
}

/** Corpo email di test (prefisso [TEST] nel subject). */
export function quoteEmailBodyTest(options: {
  number: string;
  title?: string | null;
}): string {
  return `<p><em>Questa è un&apos;email di prova dall&apos;area Impostazioni.</em></p>
${quoteEmailBody(options)}`;
}

export function invoiceEmailBodyTest(options: { number: string }): string {
  return `<p><em>Questa è un&apos;email di prova dall&apos;area Impostazioni.</em></p>
${invoiceEmailBody(options)}`;
}

export function reportEmailBodyTest(options: { number: string }): string {
  return `<p><em>Questa è un&apos;email di prova dall&apos;area Impostazioni.</em></p>
${reportEmailBody(options)}`;
}
