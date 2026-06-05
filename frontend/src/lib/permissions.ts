export const permissionActionShortLabels: Record<string, string> = {
  READ: "Vedi",
  CREATE: "Crea",
  UPDATE: "Modifica",
  DELETE: "Elimina",
  MANAGE_USERS: "Gestione",
  MANAGE_QUOTES: "Preventivi",
  MANAGE_REPORTS: "Report",
  MANAGE_INVENTORY: "Magazzino",
  MANAGE_CLIENTS: "Clienti",
  READ_ONLY: "Lettura",
  LIMITED_ACCESS: "Limitato",
  OWN_RESOURCES_ONLY: "Solo propri",
};

export const permissionRoleDescriptions: Record<string, string> = {
  SUPER_ADMIN:
    "Account principale con accesso totale. I permessi non sono modificabili da questa pagina.",
  ADMIN:
    "Amministratore interno: gestione utenti, impostazioni, backup e tutte le aree operative.",
  COMMERCIAL:
    "Commerciale: clienti, preventivi, pagamenti, lead e calendario commerciale.",
  TECHNICIAN:
    "Tecnico: interventi assegnati, verbali, calendario e allegati di cantiere.",
  OPERATOR:
    "Operatore: consultazione di clienti, preventivi, verbali e magazzino in sola lettura.",
  WAREHOUSE:
    "Magazziniere: gestione completa di giacenze, prodotti e servizi.",
  CLIENT:
    "Cliente: accesso al portale riservato con i propri documenti e appuntamenti.",
};

export function permissionCellLabel(
  action: string,
  custom?: Record<string, string>
): string {
  return custom?.[action] || permissionActionShortLabels[action] || action;
}
