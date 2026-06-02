export const clientStatusLabels: Record<string, string> = {
  LEAD: "Lead",
  PROSPECT: "Prospect",
  ACTIVE: "Attivo",
  INACTIVE: "Inattivo",
  ARCHIVED: "Archiviato",
};

export const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  ACCEPTED: "Accettato",
  REJECTED: "Rifiutato",
  EXPIRED: "Scaduto",
  CANCELLED: "Annullato",
};

export const paymentStatusLabels: Record<string, string> = {
  UNPAID: "Non pagato",
  PARTIAL: "Parziale",
  PAID: "Pagato",
  OVERDUE: "Scaduto",
};

export const scheduleRowStatusLabels: Record<string, string> = {
  PAID: "Pagato",
  PARTIAL: "Parziale",
  PENDING: "In scadenza",
  OVERDUE: "Scaduto",
};

export const paymentMethodLabels: Record<string, string> = {
  BANK_TRANSFER: "Bonifico bancario",
  CASH: "Contanti",
  CARD: "Carta",
  PAYPAL: "PayPal",
  OTHER: "Altro",
};

/** Metodi di pagamento per documenti di cortesia */
export const invoicePaymentMethodOptions = [
  { value: "BANK_TRANSFER", label: "Bonifico bancario" },
  { value: "CASH", label: "Contanti" },
  { value: "CARD", label: "Carta" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "OTHER", label: "Altro" },
] as const;

/** Termini di pagamento (PDF e modifica documento) */
export const invoicePaymentTimingOptions = [
  { value: "END_OF_WORK", label: "A fine lavori" },
  { value: "DAYS_15", label: "Entro 15 giorni" },
  { value: "DAYS_30", label: "Entro 30 giorni" },
  { value: "DAYS_60", label: "Entro 60 giorni" },
  { value: "ON_RECEIPT", label: "A ricevimento documento" },
  { value: "AT_SIGNATURE", label: "All'accettazione preventivo" },
] as const;

const invoicePaymentMethodPdf: Record<string, string> = {
  BANK_TRANSFER: "Pagamento tramite bonifico bancario",
  CASH: "Pagamento in contanti",
  CARD: "Pagamento con carta",
  PAYPAL: "Pagamento tramite PayPal",
  OTHER: "Altro metodo di pagamento",
};

const invoicePaymentTimingPdf: Record<string, string> = {
  END_OF_WORK: "a fine lavori",
  DAYS_15: "entro 15 giorni",
  DAYS_30: "entro 30 giorni",
  DAYS_60: "entro 60 giorni",
  ON_RECEIPT: "a ricevimento del documento",
  AT_SIGNATURE: "all'accettazione del preventivo",
};

export function formatInvoicePaymentTerms(input: {
  paymentMethod?: string | null;
  paymentTiming?: string | null;
}): string {
  const method =
    invoicePaymentMethodPdf[input.paymentMethod || "BANK_TRANSFER"] ??
    invoicePaymentMethodPdf.BANK_TRANSFER;
  const timing =
    invoicePaymentTimingPdf[input.paymentTiming || "END_OF_WORK"] ?? "";
  return timing ? `${method} — ${timing}` : method;
}

export function formatInvoicePaymentDisplay(input: {
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentTiming?: string | null;
}): string {
  const terms = formatInvoicePaymentTerms(input);
  if (input.paymentStatus === "PAID") return "Pagato";
  if (input.paymentStatus === "PARTIAL") return `Parzialmente pagato — ${terms}`;
  return terms;
}

export const userRoleLabels: Record<string, string> = {
  SUPER_ADMIN: "Admin",
  ADMIN: "Admin",
  COMMERCIAL: "Commerciale",
  TECHNICIAN: "Tecnico",
  OPERATOR: "Operatore",
  WAREHOUSE: "Magazzino",
  CLIENT: "Cliente",
};

export const userStatusLabels: Record<string, string> = {
  ACTIVE: "Attivo",
  SUSPENDED: "Sospeso",
  INACTIVE: "Inattivo",
};

export const interventionStatusLabels: Record<string, string> = {
  SCHEDULED: "Programmato",
  IN_PROGRESS: "In corso",
  COMPLETED: "Completato",
  CANCELLED: "Annullato",
};

export const leadStatusLabels: Record<string, string> = {
  new: "Nuova",
  NEW: "Nuova",
  contacted: "Contattata",
  CONTACTED: "Contattata",
  qualified: "Qualificata",
  QUALIFIED: "Qualificata",
  CONVERTED: "Convertita",
  converted: "Convertita",
  lost: "Persa",
  LOST: "Persa",
};

export const CONTACT_SERVICE_OPTIONS = [
  "Audio live",
  "Luci e scenografia",
  "Organizzazione tecnica",
  "Consulenza / preventivo",
  "Altro",
] as const;

export const eventTypeLabels: Record<string, string> = {
  APPOINTMENT: "Appuntamento",
  INTERVENTION: "Intervento",
  MEETING: "Riunione",
  SITE_VISIT: "Sopralluogo",
  EVENT: "Evento",
  RENTAL: "Noleggio",
  DEADLINE: "Scadenza",
  REMINDER: "Promemoria",
  OTHER: "Altro",
};

/** Tipi principali per creazione / modifica eventi in calendario */
export const calendarEventTypeOptions = [
  { value: "MEETING", label: "Riunione" },
  { value: "SITE_VISIT", label: "Sopralluogo" },
  { value: "EVENT", label: "Evento" },
  { value: "RENTAL", label: "Noleggio" },
] as const;

export const reportStatusLabels: Record<string, string> = {
  DRAFT: "Bozza",
  SUBMITTED: "Inviato",
  APPROVED: "Approvato",
  REJECTED: "Rifiutato",
};

/** Unità di misura catalogo servizi (value salvato in DB) */
export const SERVICE_UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: "ora", label: "Ora" },
  { value: "gg", label: "Giornata" },
  { value: "km", label: "Chilometro (km)" },
  { value: "notte", label: "Pernottamento" },
  { value: "pz", label: "Pezzo" },
  { value: "forfait", label: "Forfait" },
  { value: "evento", label: "Evento" },
];

export function serviceUnitLabel(unit?: string | null): string {
  if (!unit) return "";
  const found = SERVICE_UNIT_OPTIONS.find((o) => o.value === unit);
  return found?.label ?? unit;
}
