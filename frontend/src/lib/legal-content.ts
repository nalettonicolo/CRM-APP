/** Allineare a backend/src/constants/privacy.ts */
export const PRIVACY_POLICY_VERSION = "2026-05-29";

export type LegalIdentity = {
  businessName: string;
  email: string;
  address?: string;
  vat?: string;
  website?: string;
};

export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

export function resolveLegalIdentity(
  company: Record<string, string> | undefined,
  appName: string
): LegalIdentity {
  return {
    businessName: company?.name?.trim() || appName,
    email: company?.email?.trim() || "privacy@example.com",
    address: company?.address?.trim(),
    vat: company?.vat?.trim(),
    website: company?.website?.trim(),
  };
}

export function privacyPolicySections(identity: LegalIdentity): LegalSection[] {
  const controller = identity.businessName;
  const contact = identity.email;

  return [
    {
      title: "1. Titolare del trattamento",
      paragraphs: [
        `Il titolare del trattamento dei dati personali è ${controller}${identity.vat ? ` (P. IVA ${identity.vat})` : ""}${identity.address ? `, con sede in ${identity.address}` : ""}.`,
        `Per esercitare i diritti previsti dal GDPR o per quesiti sulla privacy scrivi a ${contact}.`,
      ],
    },
    {
      title: "2. Tipologie di dati trattati",
      paragraphs: [
        "Trattiamo dati identificativi e di contatto (nome, email, telefono, azienda), dati fiscali ove necessari (P. IVA, codice fiscale), dati contrattuali ed economici (preventivi, pagamenti, documenti), dati tecnici di evento (date, luoghi, servizi richiesti), firme digitali su preventivi/report, log di accesso al gestionale e allegati caricati nel CRM.",
      ],
    },
    {
      title: "3. Finalità e base giuridica",
      paragraphs: ["I dati sono trattati per le seguenti finalità:"],
      list: [
        "Gestione richieste di contatto e preventivi — base giuridica: esecuzione di misure precontrattuali (art. 6.1.b GDPR) e, ove applicabile, consenso (art. 6.1.a).",
        "Esecuzione contratti di servizio audio/luci — art. 6.1.b GDPR.",
        "Adempimenti fiscali, amministrativi e contabili — art. 6.1.c GDPR.",
        "Accesso al portale clienti e firma documenti — art. 6.1.b GDPR.",
        "Sicurezza del gestionale, prevenzione abusi e audit interno — legittimo interesse (art. 6.1.f), limitato al necessario.",
        "Comunicazioni operative (email su preventivi, verbali, documenti) — art. 6.1.b GDPR.",
      ],
    },
    {
      title: "4. Modalità del trattamento",
      paragraphs: [
        "I dati sono trattati con strumenti informatici, con misure tecniche e organizzative adeguate (controllo accessi per ruolo, autenticazione, backup, log attività). Non effettuiamo profilazione automatizzata né decisioni automatizzate con effetti giuridici.",
      ],
    },
    {
      title: "5. Conservazione",
      paragraphs: [
        "Conserviamo i dati per il tempo necessario alle finalità indicate e agli obblighi di legge. Indicativamente: richieste contatto non convertite fino a 24 mesi; dati contrattuali e fiscali secondo termini di legge (fino a 10 anni ove richiesto); log di sistema fino a 36 mesi salvo obblighi diversi.",
        "I backup tecnici possono conservare copie per un periodo limitato (circa 30 giorni) prima della sovrascrittura automatica.",
      ],
    },
    {
      title: "6. Destinatari e responsabili del trattamento",
      paragraphs: [
        "I dati possono essere trattati da personale autorizzato e da fornitori tecnici strettamente necessari al servizio, quali:",
      ],
      list: [
        "Hosting frontend (Netlify) — pubblicazione sito.",
        "Server/VPS e database — esecuzione API e CRM.",
        "Provider email (SMTP, es. Gmail) — invio notifiche e documenti.",
        "Eventuale cloud backup (Google Drive via rclone) — copie di sicurezza cifrate del database.",
      ],
    },
    {
      title: "7. Trasferimenti extra-UE",
      paragraphs: [
        "Alcuni fornitori cloud potrebbero trattare dati anche fuori dallo Spazio Economico Europeo. In tal caso adottiamo garanzie adeguate (Clausole Contrattuali Standard o decisioni di adeguatezza) previste dal GDPR.",
      ],
    },
    {
      title: "8. Diritti dell'interessato",
      paragraphs: ["Puoi esercitare in qualsiasi momento i diritti di:"],
      list: [
        "Accesso, rettifica, cancellazione, limitazione, opposizione, portabilità (artt. 15-22 GDPR).",
        "Revoca del consenso, ove il trattamento si basi sul consenso, senza pregiudicare la liceità precedente.",
        "Reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
      ],
    },
    {
      title: "9. Obbligo o facoltà di conferimento",
      paragraphs: [
        "Il conferimento dei dati contrassegnati come obbligatori (es. nome ed email nel form contatti) è necessario per rispondere alla richiesta. Il mancato conferimento impedisce l'erogazione del servizio richiesto.",
      ],
    },
    {
      title: "10. Minori",
      paragraphs: [
        "I servizi non sono destinati a minori di 16 anni. Non raccogliamo consapevolmente dati di minori.",
      ],
    },
    {
      title: "11. Aggiornamenti",
      paragraphs: [
        `Ultimo aggiornamento: ${PRIVACY_POLICY_VERSION}. Il titolare può aggiornare la presente informativa; la versione in vigore è sempre pubblicata su questa pagina.`,
      ],
    },
  ];
}

export function cookiePolicySections(): LegalSection[] {
  return [
    {
      title: "1. Cosa sono cookie e tecnologie simili",
      paragraphs: [
        "Cookie e storage locale sono piccoli file o dati salvati sul tuo dispositivo per far funzionare il sito, mantenere la sessione o ricordare preferenze.",
      ],
    },
    {
      title: "2. Cosa utilizziamo",
      paragraphs: ["Sul sito e sul gestionale utilizziamo esclusivamente tecnologie tecniche/necessarie:"],
      list: [
        "Cookie di sessione e refresh token (httpOnly) per l'accesso al portale e al CRM.",
        "Token di accesso in localStorage per le chiamate API autenticate.",
        "Preferenza consenso cookie (`crm_cookie_consent_v1`) in localStorage.",
        "Service Worker / cache PWA per asset statici (manifest, icone) — nessun tracciamento pubblicitario.",
      ],
    },
    {
      title: "3. Cookie di terze parti",
      paragraphs: [
        "Non utilizziamo cookie di profilazione o analytics di terze parti (es. Google Analytics, Facebook Pixel).",
      ],
    },
    {
      title: "4. Come gestire le preferenze",
      paragraphs: [
        "Puoi disabilitare i cookie dal browser; ciò può impedire login e funzioni del portale. Per revocare il consenso al banner cookie, cancella i dati del sito dal browser o usa il link Cookie policy per informazioni.",
      ],
    },
    {
      title: "5. Titolare",
      paragraphs: [
        "Per informazioni sul trattamento dati collegato ai cookie consulta l'Informativa privacy.",
      ],
    },
  ];
}

export function termsSections(identity: LegalIdentity): LegalSection[] {
  return [
    {
      title: "1. Oggetto",
      paragraphs: [
        `Le presenti condizioni regolano l'uso del sito web e del portale clienti gestiti da ${identity.businessName} per richiedere preventivi, consultare documenti e firmare digitalmente ove previsto.`,
      ],
    },
    {
      title: "2. Uso consentito",
      paragraphs: [
        "L'utente si impegna a fornire dati veritieri, a non compromettere la sicurezza del sistema e a utilizzare il portale solo per finalità connesse ai servizi contrattuali.",
      ],
    },
    {
      title: "3. Firma elettronica semplice",
      paragraphs: [
        "La firma disegnata su preventivi o report costituisce accettazione semplice del documento e delle condizioni economiche ivi indicate, nei limiti previsti dalla normativa applicabile.",
      ],
    },
    {
      title: "4. Proprietà intellettuale",
      paragraphs: [
        "Testi, marchi, logo e materiali del sito sono di proprietà del titolare o concessi in licenza. È vietata la riproduzione non autorizzata.",
      ],
    },
    {
      title: "5. Limitazione di responsabilità",
      paragraphs: [
        "Il sito è fornito «as is». Il titolare non garantisce disponibilità ininterrotta; non risponde di danni indiretti derivanti da uso improprio o interruzioni di rete, salvo dolo o colpa grave.",
      ],
    },
    {
      title: "6. Legge applicabile",
      paragraphs: [
        "Per ogni controversia si applica la legge italiana. Foro competente, ove ammesso, quello del domicilio del consumatore o del titolare secondo la normativa vigente.",
      ],
    },
  ];
}
