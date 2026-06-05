import type { PermissionAction } from "@prisma/client";

export type CatalogAction = PermissionAction;

export type PermissionResourceDef = {
  key: string;
  label: string;
  description: string;
  actions: CatalogAction[];
  actionLabels?: Partial<Record<CatalogAction, string>>;
};

export type PermissionSectionDef = {
  key: string;
  label: string;
  resources: PermissionResourceDef[];
};

const CRUD: CatalogAction[] = ["READ", "CREATE", "UPDATE", "DELETE"];

export const PERMISSION_SECTIONS: PermissionSectionDef[] = [
  {
    key: "crm",
    label: "CRM e vendite",
    resources: [
      {
        key: "clients",
        label: "Clienti",
        description: "Anagrafiche, schede cliente e storico relazioni",
        actions: CRUD,
      },
      {
        key: "quotes",
        label: "Preventivi",
        description: "Creazione, invio, modifica e accettazione preventivi",
        actions: CRUD,
      },
      {
        key: "invoices",
        label: "Documenti di cortesia",
        description: "Documenti fiscali di cortesia collegati ai preventivi",
        actions: CRUD,
      },
      {
        key: "payments",
        label: "Pagamenti",
        description: "Registrazione incassi e scadenze pagamento",
        actions: CRUD,
      },
      {
        key: "leads",
        label: "Richieste contatto",
        description: "Lead dal sito e richieste non ancora convertite in clienti",
        actions: CRUD,
      },
    ],
  },
  {
    key: "operations",
    label: "Operatività",
    resources: [
      {
        key: "interventions",
        label: "Interventi",
        description: "Ordini di lavoro, assegnazioni e stato interventi",
        actions: CRUD,
      },
      {
        key: "reports",
        label: "Verbali / Report",
        description: "Verbali di fine lavoro e report tecnici",
        actions: CRUD,
      },
      {
        key: "events",
        label: "Calendario",
        description: "Appuntamenti, sopralluoghi ed eventi in agenda",
        actions: CRUD,
      },
      {
        key: "attachments",
        label: "Allegati",
        description: "File e documenti allegati a clienti, preventivi e interventi",
        actions: CRUD,
      },
    ],
  },
  {
    key: "warehouse",
    label: "Magazzino",
    resources: [
      {
        key: "inventory",
        label: "Giacenze",
        description: "Movimenti di magazzino e quantità disponibili",
        actions: CRUD,
      },
      {
        key: "products",
        label: "Prodotti",
        description: "Catalogo prodotti e articoli a magazzino",
        actions: CRUD,
      },
      {
        key: "services",
        label: "Servizi",
        description: "Catalogo servizi offerti e prezzi base",
        actions: CRUD,
      },
    ],
  },
  {
    key: "system",
    label: "Sistema e amministrazione",
    resources: [
      {
        key: "users",
        label: "Utenti",
        description: "Creazione account, assegnazione ruoli e reset password",
        actions: ["MANAGE_USERS"],
        actionLabels: { MANAGE_USERS: "Gestione completa" },
      },
      {
        key: "settings",
        label: "Impostazioni avanzate",
        description: "Modelli pagamento, configurazioni tecniche e template",
        actions: CRUD,
      },
      {
        key: "automation",
        label: "Automazione preventivi",
        description: "Regole automatiche di sconto e categorie preventivo",
        actions: CRUD,
      },
      {
        key: "backup",
        label: "Backup database",
        description: "Esecuzione manuale dei backup del database",
        actions: ["CREATE"],
        actionLabels: { CREATE: "Eseguire backup" },
      },
      {
        key: "search",
        label: "Ricerca globale",
        description: "Barra di ricerca trasversale su clienti, preventivi e altro",
        actions: ["READ"],
        actionLabels: { READ: "Usare la ricerca" },
      },
      {
        key: "portal",
        label: "Area cliente (portale)",
        description: "Accesso all'area riservata per account di tipo Cliente",
        actions: ["READ"],
        actionLabels: { READ: "Accedere al portale" },
      },
    ],
  },
];

export const DEFAULT_ACTION_LABELS: Record<CatalogAction, string> = {
  READ: "Visualizzare",
  CREATE: "Creare",
  UPDATE: "Modificare",
  DELETE: "Eliminare",
  MANAGE_USERS: "Gestire utenti",
  MANAGE_QUOTES: "Gestire preventivi",
  MANAGE_REPORTS: "Gestire report",
  MANAGE_INVENTORY: "Gestire magazzino",
  MANAGE_CLIENTS: "Gestire clienti",
  READ_ONLY: "Sola lettura",
  LIMITED_ACCESS: "Accesso limitato",
  OWN_RESOURCES_ONLY: "Solo risorse proprie",
};

export function permissionKey(resource: string, action: string): string {
  return `${resource}:${action.toLowerCase()}`;
}

export function buildPermissionName(
  resource: PermissionResourceDef,
  action: CatalogAction
): string {
  const actionLabel =
    resource.actionLabels?.[action] || DEFAULT_ACTION_LABELS[action];
  return `${actionLabel} — ${resource.label}`;
}

export const ALL_CATALOG_ENTRIES = PERMISSION_SECTIONS.flatMap((section) =>
  section.resources.flatMap((resource) =>
    resource.actions.map((action) => ({
      resource: resource.key,
      action,
      name: buildPermissionName(resource, action),
      sectionKey: section.key,
      sectionLabel: section.label,
      resourceLabel: resource.label,
      resourceDescription: resource.description,
      actionLabel: resource.actionLabels?.[action] || DEFAULT_ACTION_LABELS[action],
    }))
  )
);
