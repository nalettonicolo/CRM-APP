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
    resendEmail: "Rinvia email",
    resendConfirm: "Reinviare il preventivo all'email del cliente?",
    sentPrefix: "Inviato il",
  },
  report: {
    listTitle: "Verbali di intervento",
    listIntro:
      "Verbali di intervento con firma tecnico e, se presente, firma cliente.",
    detailTitle: "Verbale di intervento",
    detailBack: "Torna ai verbali",
    notFound: "Verbale non trovato.",
    checklistTitle: "Voci attività",
    signaturesTitle: "Firme",
    technicianSignature: "Firma tecnico",
    clientSignature: "Firma cliente",
    clientSignatureMissing: "Non apposta",
    sendEmailOnSubmit: "Invia copia al cliente via email",
    sendEmailOnSubmitHint: "Dopo la firma, il PDF del verbale viene inviato all'email del cliente.",
    noClientEmail: "Il cliente non ha email: il verbale verrà solo archiviato.",
    emailSentSuccess: "Verbale inviato e email spedita al cliente.",
    resendEmail: "Rinvia email",
    resendConfirm: "Reinviare il verbale all'email del cliente?",
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
    createButton: "Nuovo documento",
    createDialogTitle: "Nuovo documento di cortesia",
    createDialogHint:
      "Scegli un preventivo già accettato. Importi e cliente vengono copiati dal preventivo.",
    createEmpty:
      "Nessun preventivo accettato disponibile (oppure esiste già un documento per tutti i preventivi accettati).",
    createSubmit: "Crea documento",
    listEmpty:
      "Nessun documento. Crea da un preventivo accettato con il pulsante sopra.",
    attachmentsTitle: "Allegati",
    attachmentsHint:
      "Foto e PDF caricati qui vengono aggiunti in coda al documento PDF, dal primo foglio dopo il testo della ricevuta.",
    sendEmail: "Invia email",
    resendEmail: "Rinvia email",
    sendEmailPending: "Invio...",
    resendConfirm: "Reinviare il documento all'email del cliente?",
    emailSentSuccess: "Email inviata al cliente.",
    emailResentSuccess: "Email reinviata al cliente.",
    notSent: "Non inviato",
    sentPrefix: "Inviato il",
  },
  emailTests: {
    sectionTitle: "Prova ogni tipo di invio",
    sectionHint:
      "Ogni pulsante invia un'email di test all'indirizzo sotto, con PDF campione quando disponibile (ultimo documento in archivio).",
    smtp: "Test SMTP",
    quote: "Test preventivo",
    report: "Test verbale",
    invoice: "Test documento cortesia",
    pending: "Invio…",
  },
  portal: {
    quoteSignTitle: "Firma del preventivo",
    quoteSignHint:
      "Disegna la firma nel riquadro per accettare le condizioni del preventivo.",
    quoteSignPrivacyPrefix:
      "Dichiaro di aver letto l'",
    quoteSignPrivacySuffix:
      "e accetto il trattamento dei dati per la gestione contrattuale.",
    quoteSignConfirm: "Conferma firma e accetta",
    invoiceSection: "Documenti di cortesia",
    invoiceEmpty: "Nessun documento disponibile.",
    invoiceDisclaimerShort:
      "Solo uso informativo: non sostituisce fattura elettronica.",
  },
} as const;
