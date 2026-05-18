/** Testi UI per preventivi, report e documenti di cortesia (non da Impostazioni). */

export const INVOICE_COURTESY_DISCLAIMER =
  "Documento emesso a solo scopo informativo e gestionale. Non costituisce fattura né documento fiscale ai sensi del D.P.R. 633/1972 e non sostituisce la fatturazione elettronica ove prevista dalla legge.";

export const DOCUMENT_COPY = {
  quote: {
    staffConfirmHint:
      "Puoi confermare il preventivo anche dall'area riservata con il pulsante Conferma, oppure registrando la firma del cliente qui sotto (il preventivo viene accettato automaticamente).",
    signatureSectionTitle: "Firma del cliente",
    signaturePadLabel: "Firma del cliente",
    signatureSaveButton: "Salva firma e accetta",
    signatureClear: "Cancella firma",
    signedSuccess: "Preventivo firmato e accettato.",
    signedAtPrefix: "Firmato il",
    awaitingSignature:
      "Firma non ancora registrata. Puoi raccoglierla qui (come nei report) oppure attendere il portale cliente.",
    pdfNote: "La firma compare nel PDF del preventivo.",
    rejectConfirm: "Segnare il preventivo come rifiutato?",
  },
  report: {
    listTitle: "Verbali di intervento",
    listIntro:
      "Verbali di intervento con firma tecnico e, se presente, firma cliente.",
    detailTitle: "Verbale di intervento",
    detailBack: "Torna ai verbali",
    notFound: "Verbale non trovato.",
    checklistTitle: "Verifiche",
    signaturesTitle: "Firme",
    technicianSignature: "Firma tecnico",
    clientSignature: "Firma cliente",
    clientSignatureMissing: "Non apposta",
  },
  invoice: {
    pageTitle: "Documenti di cortesia",
    pageIntro:
      "Bozze generate da preventivi accettati. Solo uso interno e informativo: non valide ai fini fiscali.",
    detailTitle: "Documento di cortesia",
    detailBack: "Torna ai documenti",
    notFound: "Documento non trovato.",
    fromQuotePrefix: "Da preventivo",
    generateFromQuote: "Genera documento di cortesia",
  },
  portal: {
    quoteSignTitle: "Firma del preventivo",
    quoteSignHint:
      "Disegna la firma nel riquadro per accettare le condizioni del preventivo.",
    quoteSignConfirm: "Conferma firma e accetta",
    invoiceSection: "Documenti di cortesia",
    invoiceEmpty: "Nessun documento disponibile.",
    invoiceDisclaimerShort:
      "Solo uso informativo: non sostituisce fattura elettronica.",
  },
} as const;
