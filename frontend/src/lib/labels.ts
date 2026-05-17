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
  DEADLINE: "Scadenza",
  REMINDER: "Promemoria",
  OTHER: "Altro",
};

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
