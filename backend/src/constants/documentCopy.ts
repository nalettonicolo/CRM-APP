/** Testi fissi per PDF e documenti (non modificabili da Impostazioni). */

export const INVOICE_COURTESY_DISCLAIMER =
  "Documento emesso a solo scopo informativo e gestionale. Non costituisce fattura né documento fiscale ai sensi del D.P.R. 633/1972 e non sostituisce la fatturazione elettronica ove prevista dalla legge.";

export const DOCUMENT_COPY = {
  quote: {
    acceptanceHeading: "Accettazione del preventivo",
    acceptanceDigital:
      "Il cliente dichiara di accettare il presente preventivo, i prezzi e le condizioni indicate, e di averne preso visione.",
    acceptanceDigitalChannel:
      "Firma registrata tramite portale cliente o in sede con assistenza del personale autorizzato.",
    acceptancePaper:
      "Il cliente dichiara di accettare il presente preventivo alle condizioni riportate nel documento.",
    paperDateLine: "Data: _________________________",
    paperSignLine: "Firma del cliente: _________________________________________",
    paperNote:
      "In caso di accettazione cartacea, conservare copia firmata per archivio interno.",
  },
  invoice: {
    pdfTitlePrefix: "Documento di cortesia",
    referencesHeading: "Riferimenti documento",
    paymentHeading: "Pagamento",
    disclaimer: INVOICE_COURTESY_DISCLAIMER,
  },
  report: {
    pdfTitlePrefix: "Verbale intervento",
    referencesHeading: "Riferimenti verbale",
    checklistHeading: "Voci attività",
    signaturesHeading: "Firme",
    technicianSignLabel: "Firma del tecnico",
    clientSignLabel: "Firma del cliente",
    signatureMissing: "Non apposta",
    footerNote:
      "Il presente verbale attesta l'attività svolta in loco. Non sostituisce preventivi accettati né documenti fiscali.",
  },
} as const;
