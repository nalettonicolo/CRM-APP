export type Workspace = "crm" | "ie";

export type WorkspaceRoutes = {
  workspace: Workspace;
  home: string;
  crmHome: string;
  clients: string;
  client: (id: string) => string;
  inventory: string;
  products: string;
  services: string;
  quotes: string;
  quotesNew: string;
  quote: (id: string) => string;
  quoteEdit: (id: string) => string;
  invoices: string;
  invoice: (id: string) => string;
  invoiceEdit: (id: string) => string;
  print: string;
  printDdt: string;
  printDdtNew: string;
  printDdtDetail: (id: string) => string;
  printDdtEdit: (id: string) => string;
  printLabels: string;
  calendar: string;
  jobOrders: string;
  jobOrder: (id: string) => string;
  jobOrdersNew: string;
  dailyReports: string;
  dailyReport: (id: string) => string;
  supplierCatalogs: string;
  supplierCatalog: (id: string) => string;
  securityCatalogs: string;
  deadlines: string;
};

export function routesFor(workspace: Workspace): WorkspaceRoutes {
  if (workspace === "ie") {
    const base = "/impianti-elettrici";
    return {
      workspace,
      home: base,
      crmHome: "/dashboard",
      clients: `${base}/clienti`,
      client: (id) => `${base}/clienti/${id}`,
      inventory: `${base}/magazzino`,
      products: `${base}/catalogo/prodotti`,
      services: `${base}/catalogo/servizi`,
      quotes: `${base}/preventivi`,
      quotesNew: `${base}/preventivi/new`,
      quote: (id) => `${base}/preventivi/${id}`,
      quoteEdit: (id) => `${base}/preventivi/${id}/edit`,
      invoices: `${base}/documenti`,
      invoice: (id) => `${base}/documenti/${id}`,
      invoiceEdit: (id) => `${base}/documenti/${id}/edit`,
      print: `${base}/stampa`,
      printDdt: `${base}/stampa/ddt`,
      printDdtNew: `${base}/stampa/ddt/new`,
      printDdtDetail: (id) => `${base}/stampa/ddt/${id}`,
      printDdtEdit: (id) => `${base}/stampa/ddt/${id}/edit`,
      printLabels: `${base}/stampa/etichette`,
      calendar: `${base}/calendario`,
      jobOrders: `${base}/commesse`,
      jobOrder: (id) => `${base}/commesse/${id}`,
      jobOrdersNew: `${base}/commesse/new`,
      dailyReports: `${base}/report`,
      dailyReport: (id) => `${base}/report/${id}`,
      supplierCatalogs: `${base}/fornitori`,
      supplierCatalog: (id) => `${base}/fornitori/${id}`,
      securityCatalogs: `${base}/catalogo/antifurti`,
      deadlines: `${base}/scadenze`,
    };
  }

  return {
    workspace,
    home: "/dashboard",
    crmHome: "/dashboard",
    clients: "/clients",
    client: (id) => `/clients/${id}`,
    inventory: "/inventory",
    products: "/inventory/products",
    services: "/inventory/services",
    quotes: "/quotes",
    quotesNew: "/quotes/new",
    quote: (id) => `/quotes/${id}`,
    quoteEdit: (id) => `/quotes/${id}/edit`,
    invoices: "/invoices",
    invoice: (id) => `/invoices/${id}`,
    invoiceEdit: (id) => `/invoices/${id}/edit`,
    print: "/inventory/print",
    printDdt: "/inventory/print/ddt",
    printDdtNew: "/inventory/print/ddt/new",
    printDdtDetail: (id) => `/inventory/print/ddt/${id}`,
    printDdtEdit: (id) => `/inventory/print/ddt/${id}/edit`,
    printLabels: "/inventory/print/labels",
    calendar: "/calendar",
    jobOrders: "/interventions",
    jobOrder: (id) => `/interventions/${id}`,
    jobOrdersNew: "/interventions/new",
    dailyReports: "/reports",
    dailyReport: (id) => `/reports/${id}`,
    supplierCatalogs: "/inventory/products",
    supplierCatalog: (id) => `/inventory/products`,
    securityCatalogs: "/inventory/products",
    deadlines: "/payments",
  };
}
