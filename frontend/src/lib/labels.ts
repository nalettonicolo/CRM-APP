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
  SUPER_ADMIN: "Super admin",
  ADMIN: "Amministratore",
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

export const reportStatusLabels: Record<string, string> = {
  DRAFT: "Bozza",
  SUBMITTED: "Inviato",
  APPROVED: "Approvato",
  REJECTED: "Rifiutato",
};
