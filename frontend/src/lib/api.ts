import { apiUrl, apiUrlDirect } from "./api-origin";

/** Solo per asset statici (/uploads); le fetch API usano apiUrl(). */
export const API_ASSET_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
  "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, string[] | undefined>
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function apiHealthFeatures(): Promise<{
  serviceDelete?: boolean;
  serviceDeletePost?: boolean;
  serviceDeleteRemove?: boolean;
} | null> {
  try {
    const res = await fetch(apiUrl("/health"));
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: Record<string, boolean> };
    return data.features ?? null;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  config?: { direct?: boolean }
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const url = config?.direct ? apiUrlDirect(path) : apiUrl(path);
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && path !== "/auth/login") {
    const refreshed = await refreshToken();
    if (refreshed) {
      return api<T>(path, options, config);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
    throw new ApiError(401, "Sessione scaduta. Accedi di nuovo.", "UNAUTHORIZED");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback =
      res.status === 404
        ? "Route API non trovata"
        : res.status >= 500
          ? "Errore server"
          : "Errore";
    throw new ApiError(
      res.status,
      data.error || fallback,
      data.code,
      data.details as Record<string, string[] | undefined> | undefined
    );
  }
  return data as T;
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ user: User; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => api("/auth/logout", { method: "POST" }),
  me: () => api<User>("/auth/me"),
  forgotPassword: (email: string) =>
    api("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    api("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  setup2fa: () =>
    api<{ secret: string; qrCodeUrl: string }>("/auth/2fa/setup", {
      method: "POST",
    }),
  enable2fa: (code: string) =>
    api<{ success: boolean }>("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  disable2fa: (code: string) =>
    api<{ success: boolean }>("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clientId?: string | null;
  avatar?: string | null;
  status?: string;
}

export const clientsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: Client[]; total: number }>(`/clients${q}`);
  },
  get: (id: string) => api<Client>(`/clients/${id}`),
  create: (data: Partial<Client>) =>
    api<Client>("/clients", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Client>) =>
    api<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  fiscalCode?: string;
  notes?: string;
  status: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  _count?: { quotes: number; interventions: number; reports: number };
  quotes?: QuoteSummary[];
  interventions?: InterventionSummary[];
  reports?: ReportSummary[];
  activities?: { id: string; action: string; entityType?: string; createdAt: string }[];
  attachments?: { id: string; filename: string; createdAt: string }[];
}

export interface QuoteSummary {
  id: string;
  number: string;
  title?: string;
  status: string;
  total: number | string;
  createdAt: string;
}

export interface InterventionSummary {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledAt?: string;
}

export interface ReportSummary {
  id: string;
  number: string;
  status: string;
  workHours: number | string;
  createdAt: string;
}

export const quotesApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: Quote[]; total: number }>(`/quotes${q}`);
  },
  get: (id: string) => api<Quote>(`/quotes/${id}`),
  create: (data: unknown) =>
    api<Quote>("/quotes", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    api<Quote>(`/quotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  sendEmail: (id: string) =>
    api<{ success: boolean }>(`/quotes/${id}/send-email`, { method: "POST" }),
  sign: (id: string, signature: string) =>
    api<Quote>(`/quotes/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signature }),
    }),
};

export async function downloadQuotePdf(id: string, filename: string) {
  const token = getToken();
  const res = await fetch(apiUrl(`/quotes/${id}/pdf`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, "Download PDF fallito");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface Quote {
  id: string;
  number: string;
  title?: string;
  status: string;
  paymentStatus?: string;
  subtotal?: number | string;
  discountPercent?: number | string;
  discountAmount?: number | string;
  vatAmount?: number | string;
  total: number | string;
  depositPercent?: number | string;
  depositAmount?: number | string;
  balanceDue: number | string;
  withholdingTaxPercent?: number | string;
  withholdingTaxAmount?: number | string;
  stampDutyAmount?: number | string;
  netPayable?: number | string;
  rejectedAt?: string;
  validUntil?: string;
  eventAt?: string;
  eventEndAt?: string;
  eventLocation?: string | null;
  notes?: string;
  internalNotes?: string;
  category?: string;
  clientId?: string;
  client?: Client;
  items?: QuoteItem[];
  paymentTerms?: QuotePaymentTerm[];
  createdBy?: { firstName: string; lastName: string; email?: string };
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  signedAt?: string;
  signedByClient?: boolean;
  clientSignature?: string | null;
}

export interface QuotePaymentTerm {
  id?: string;
  label: string;
  note?: string | null;
  percent?: number | string | null;
  amount?: number | string;
  isBalance: boolean;
  dueDate?: string | null;
  sortOrder?: number;
}

export interface PaymentTermTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  items: {
    id?: string;
    label: string;
    note?: string | null;
    percent?: number | string | null;
    amount?: number | string | null;
    isBalance: boolean;
    sortOrder: number;
  }[];
}

export type PaymentTermDraft = {
  label: string;
  note?: string;
  percent?: number;
  amount?: number;
  isBalance?: boolean;
  dueDate?: string;
};

export const paymentTermTemplatesApi = {
  list: () => api<PaymentTermTemplate[]>("/payment-term-templates"),
  create: (data: {
    name: string;
    isDefault?: boolean;
    items: PaymentTermDraft[];
  }) =>
    api<PaymentTermTemplate>("/payment-term-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      isDefault: boolean;
      items: PaymentTermDraft[];
    }>
  ) =>
    api<PaymentTermTemplate>(`/payment-term-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/payment-term-templates/${id}`, {
      method: "DELETE",
    }),
};

export interface QuoteItem {
  id: string;
  type: string;
  description: string;
  quantity: number | string;
  unit?: string | null;
  unitPrice: number | string;
  vatRate: number | string;
  discount: number | string;
  total: number | string;
  serviceId?: string | null;
  productId?: string | null;
}

export const dashboardApi = {
  stats: () => api<DashboardStats>("/dashboard/stats"),
  saveLayout: (layout: DashboardLayout) =>
    api<{ success: boolean }>("/dashboard/layout", {
      method: "PUT",
      body: JSON.stringify(layout),
    }),
};

export interface DashboardLayout {
  widgets: Record<string, boolean>;
}

export interface DashboardStats {
  interventionsToday: number;
  openQuotes: number;
  acceptedQuotes: number;
  lowStock: { productName: string; quantity: number; minStock: number }[];
  upcomingEvents: EventItem[];
  recentActivity: ActivityItem[];
  techniciansAvailable: number;
  kpis: { clients: number; revenue: { _sum: { total: number | null } } };
}

export interface EventItem {
  id: string;
  title: string;
  type?: string;
  description?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  clientId?: string;
  interventionId?: string;
  quoteId?: string;
  color?: string;
  client?: { id?: string; companyName?: string; contactName?: string };
  intervention?: { id: string; number: string; title: string; status?: string };
  quote?: {
    id: string;
    number: string;
    title?: string | null;
    status?: string;
    total?: number | string;
  };
}

export interface ActivityItem {
  id: string;
  action: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export const inventoryApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<InventoryItem[]>(`/inventory${q}`);
  },
  products: () => api<Product[]>("/inventory/products"),
  services: (params?: { all?: boolean }) => {
    const q = params?.all ? "?all=1" : "";
    return api<Service[]>(`/inventory/services${q}`);
  },
  createService: (data: Partial<Service>) =>
    api<Service>("/inventory/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateService: (id: string, data: Partial<Service>) =>
    api<Service>(`/inventory/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createProduct: (data: Partial<Product>) =>
    api<Product>("/inventory/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: Partial<Product>) =>
    api<Product>(`/inventory/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: string) =>
    api<{ success: boolean }>(`/inventory/products/${id}`, {
      method: "DELETE",
    }),
  deleteService: async (id: string) => {
    if (!id?.trim()) {
      throw new ApiError(400, "ID servizio non valido");
    }

    const tryDelete = (direct: boolean) =>
      api<{ success: boolean; soft?: boolean }>(
        "/inventory/services/remove",
        { method: "POST", body: JSON.stringify({ id }) },
        { direct }
      ).catch(async (e) => {
        if (!(e instanceof ApiError) || e.status !== 404) throw e;
        return api<{ success: boolean }>(
          `/inventory/services/${id}/delete`,
          { method: "POST" },
          { direct }
        ).catch(async (e2) => {
          if (!(e2 instanceof ApiError) || e2.status !== 404) throw e2;
          return api<{ success: boolean }>(
            `/inventory/services/${id}`,
            { method: "DELETE" },
            { direct }
          );
        });
      });

    try {
      return await tryDelete(false);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 404) throw e;
      return tryDelete(true);
    }
  },
};

export interface InventoryItem {
  id: string;
  quantity: number | string;
  minStock: number | string;
  product: { name: string; sku: string; price: number | string };
  warehouse: { name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  category?: string;
  description?: string;
  isActive?: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number | string;
  category?: string;
  description?: string;
  unit?: string | null;
  vatRate?: number | string;
  vatExempt?: boolean;
  duration?: number | null;
  operatorCost?: number | string;
  isActive?: boolean;
}

export const interventionsApi = {
  list: () => api<Intervention[]>("/interventions"),
  get: (id: string) => api<InterventionDetail>(`/interventions/${id}`),
  create: (data: {
    clientId: string;
    title: string;
    description?: string;
    location?: string;
    scheduledAt?: string;
    technicianId?: string;
  }) =>
    api<InterventionDetail>("/interventions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  reports: () => api<Report[]>("/interventions/reports"),
};

export const reportsApi = {
  get: (id: string) => api<ReportDetail>(`/interventions/reports/${id}`),
  createDraft: (data: ReportPayload) =>
    api<ReportDetail>("/interventions/reports/draft", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ReportPayload> & { status?: string }) =>
    api<ReportDetail>(`/interventions/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  sendEmail: (id: string) =>
    api<{ success: boolean }>(`/interventions/reports/${id}/send-email`, {
      method: "POST",
    }),
};

export interface ReportPayload {
  clientId: string;
  quoteId?: string | null;
  interventionId?: string;
  description?: string;
  workHours?: number;
  kmTraveled?: number;
  expensesAmount?: number;
  expensesNotes?: string;
  checklist?: { label: string; checked: boolean }[];
  materials?: { name: string; quantity: number; unit?: string; productId?: string }[];
  technicianSignature?: string;
  clientSignature?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}

export interface Intervention {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledAt?: string;
  client?: { companyName?: string; contactName?: string };
}

export interface InterventionDetail extends Intervention {
  clientId?: string;
  description?: string;
  location?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  client?: Client;
  technician?: { firstName: string; lastName: string; email?: string };
  reports?: ReportSummary[];
}

export interface Report {
  id: string;
  number: string;
  status: string;
  workHours: number | string;
  createdAt: string;
  client?: { companyName?: string; contactName?: string };
}

export interface ReportDetail extends Report {
  clientId?: string;
  description?: string;
  kmTraveled?: number | string;
  expensesAmount?: number | string;
  expensesNotes?: string;
  clientSignature?: string | null;
  checklist?: { label: string; checked: boolean }[];
  technicianSignature?: string;
  latitude?: number | string;
  longitude?: number | string;
  submittedAt?: string;
  updatedAt?: string;
  client?: Client;
  technician?: { firstName: string; lastName: string; email?: string };
  intervention?: { id: string; number: string; title: string };
  quoteId?: string | null;
  quote?: {
    id: string;
    number: string;
    title?: string | null;
    status: string;
    total?: number | string;
    eventAt?: string | null;
    eventEndAt?: string | null;
    validUntil?: string | null;
    items?: QuoteItem[];
  };
  materials?: {
    id: string;
    name: string;
    quantity: number | string;
    unit?: string;
  }[];
}

export async function fetchReportPdfBlob(id: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(apiUrl(`/interventions/reports/${id}/pdf`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, "Anteprima PDF non disponibile");
  return res.blob();
}

export async function downloadReportPdf(id: string, filename: string) {
  const blob = await fetchReportPdfBlob(id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone?: string;
  clientId?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  client?: { id: string; companyName?: string; contactName?: string };
}

export const usersApi = {
  list: () => api<StaffUser[]>("/users"),
  create: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    clientId?: string;
    status?: string;
  }) =>
    api<StaffUser>("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
      role: string;
      status: string;
    }>
  ) =>
    api<StaffUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  resetPassword: (id: string, password: string) =>
    api<{ message: string }>(`/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
};

export const eventsApi = {
  list: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString() ? `?${params}` : "";
    return api<EventItem[]>(`/events${q}`);
  },
  create: (data: {
    title: string;
    type: string;
    startAt: string;
    endAt?: string;
    description?: string;
    clientId?: string;
    allDay?: boolean;
  }) =>
    api<EventItem>("/events", { method: "POST", body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{ title: string; type: string; startAt: string; endAt: string }>
  ) =>
    api<EventItem>(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/events/${id}`, { method: "DELETE" }),
};

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  quoteId?: string;
  subtotal: number | string;
  vatAmount: number | string;
  total: number | string;
  depositAmount?: number | string;
  balanceDue: number | string;
  paymentStatus: string;
  dueDate?: string;
  notes?: string;
  disclaimer?: string;
  createdAt: string;
  client?: Client;
  quote?: QuoteSummary;
}

export const invoicesApi = {
  list: async (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    const rows = await api<Invoice[]>(`/invoices${q}`);
    return { data: rows, total: rows.length };
  },
  get: (id: string) => api<Invoice>(`/invoices/${id}`),
  update: (
    id: string,
    data: Partial<{
      subtotal: number;
      vatAmount: number;
      total: number;
      depositAmount: number;
      balanceDue: number;
      paymentStatus: string;
      createdAt: string;
      dueDate: string | null;
      notes: string | null;
      disclaimer: string;
    }>
  ) =>
    api<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createFromQuote: (quoteId: string) =>
    api<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify({ quoteId }),
    }),
  fromQuote: (quoteId: string) => invoicesApi.createFromQuote(quoteId),
};

export async function downloadInvoicePdf(id: string, filename: string) {
  const token = getToken();
  const res = await fetch(apiUrl(`/invoices/${id}/pdf`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, "PDF documento non disponibile");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface AutomationRule {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  discountPercent?: number | string;
  discountAmount?: number | string;
  vatRate?: number | string;
}

export const automationApi = {
  list: () => api<AutomationRule[]>("/automation/rules"),
  create: (data: Partial<AutomationRule>) =>
    api<AutomationRule>("/automation/rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AutomationRule>) =>
    api<AutomationRule>(`/automation/rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/automation/rules/${id}`, {
      method: "DELETE",
    }),
};

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export const searchApi = {
  query: (q: string) =>
    api<SearchResult[]>(`/search?${new URLSearchParams({ q })}`),
};

export const backupApi = {
  trigger: () =>
    api<{
      success: boolean;
      file?: string;
      drive?: { uploaded: boolean; message: string };
    }>("/backup/trigger", {
      method: "POST",
    }),
};

export interface ClientPayment {
  id: string;
  clientId: string;
  quoteId?: string | null;
  quotePaymentTermId?: string | null;
  label: string;
  amount: number | string;
  paidAt: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  client?: {
    id: string;
    companyName?: string | null;
    contactName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  quote?: {
    id: string;
    number: string;
    title?: string | null;
    total?: number | string;
  } | null;
  createdBy?: { firstName: string; lastName: string };
}

export type ClientPaymentInput = {
  clientId: string;
  quoteId?: string | null;
  quotePaymentTermId?: string | null;
  label: string;
  amount: number;
  paidAt?: string;
  method?: string;
  reference?: string;
  notes?: string;
};

export const paymentsApi = {
  list: (params?: { clientId?: string; quoteId?: string }) => {
    const q = new URLSearchParams();
    if (params?.clientId) q.set("clientId", params.clientId);
    if (params?.quoteId) q.set("quoteId", params.quoteId);
    const qs = q.toString();
    return api<ClientPayment[]>(`/payments${qs ? `?${qs}` : ""}`);
  },
  summary: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return api<{ count: number; totalReceived: number }>(
      `/payments/summary${qs ? `?${qs}` : ""}`
    );
  },
  create: (data: ClientPaymentInput) =>
    api<ClientPayment>("/payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ClientPaymentInput>) =>
    api<ClientPayment>(`/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/payments/${id}`, { method: "DELETE" }),
  clientOverview: (clientId: string) =>
    api<ClientPaymentOverview>(
      `/payments/client-overview?${new URLSearchParams({ clientId })}`
    ),
  openOverview: (params?: { clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.clientId) q.set("clientId", params.clientId);
    const qs = q.toString();
    return api<OpenPaymentsOverview>(
      `/payments/open-overview${qs ? `?${qs}` : ""}`
    );
  },
};

export interface OpenPaymentDocumentRow extends ClientDocumentRow {
  clientId: string;
  clientName: string;
}

export interface OpenPaymentScheduleRow extends PaymentScheduleRow {
  clientId: string;
  clientName: string;
}

export interface OpenPaymentsOverview {
  open: OpenPaymentDocumentRow[];
  schedule: OpenPaymentScheduleRow[];
  summary: {
    openAmount: number;
    overdueCount: number;
    upcomingCount: number;
    partialCount: number;
  };
}

export type ScheduleRowStatus = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE";

export interface PaymentScheduleRow {
  id: string;
  quoteId: string;
  quoteNumber: string;
  quoteTitle: string | null;
  label: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  dueDate: string;
  status: ScheduleRowStatus;
}

export interface ClientDocumentRow {
  id: string;
  kind: "quote" | "invoice";
  number: string;
  title: string | null;
  total: number;
  balanceDue: number;
  paymentStatus: string;
  href: string;
}

export interface ClientPaymentOverview {
  open: ClientDocumentRow[];
  closed: ClientDocumentRow[];
  schedule: PaymentScheduleRow[];
  summary: {
    openAmount: number;
    closedAmount: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

export interface EventGalleryItem {
  id: string;
  title?: string | null;
  caption?: string | null;
  eventDate?: string | null;
  imagePath: string;
  isPublished: boolean;
  sortOrder: number;
}

export const eventGalleryApi = {
  public: () =>
    fetch(apiUrl("/event-gallery/public")).then((r) => {
      if (!r.ok) throw new Error("Galleria non disponibile");
      return r.json() as Promise<EventGalleryItem[]>;
    }),
  list: () => api<EventGalleryItem[]>("/event-gallery"),
  create: (data: Partial<EventGalleryItem> & { imagePath: string }) =>
    api<EventGalleryItem>("/event-gallery", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<EventGalleryItem>) =>
    api<EventGalleryItem>(`/event-gallery/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/event-gallery/${id}`, { method: "DELETE" }),
};

export async function uploadGalleryImage(file: File) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(apiUrl("/uploads/gallery"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error || "Upload fallito");
  return data as { relativeUrl: string; url: string };
}

/** Impostazioni pubbliche: niente redirect al login se il token in localStorage è scaduto. */
export async function fetchPublicSettings(): Promise<Record<string, unknown>> {
  const res = await fetch(apiUrl("/settings/public"), {
    method: "GET",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Impossibile caricare impostazioni");
  }
  return data as Record<string, unknown>;
}

export const settingsApi = {
  public: fetchPublicSettings,
  get: () => api<Record<string, unknown>>("/settings"),
  update: (key: string, value: unknown) =>
    api<{ key: string; value: unknown }>(`/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  testSmtp: (to: string) =>
    api<{ success: boolean; mock?: boolean; message?: string }>(
      "/settings/smtp/test",
      { method: "POST", body: JSON.stringify({ to }) }
    ),
  smtpStatus: () =>
    api<{
      configured: boolean;
      host: string | null;
      user: string | null;
      from: string | null;
      hasPassword: boolean;
    }>("/settings/smtp/status"),
};

export async function uploadBrandingAsset(file: File, kind: "logo" | "favicon") {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${apiUrl("/uploads/branding")}?kind=${encodeURIComponent(kind)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
      credentials: "include",
    }
  );
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Upload fallito");
  }
  return data as { relativeUrl: string; url: string };
}

export interface AttachmentItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  createdAt: string;
}

export const attachmentsApi = {
  list: (entityType: string, entityId: string) =>
    api<AttachmentItem[]>(
      `/attachments?${new URLSearchParams({ entityType, entityId })}`
    ),
  upload: async (file: File, entityType: string, entityId: string) => {
    const token = getToken();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entityType", entityType);
    fd.append("entityId", entityId);
    const res = await fetch(apiUrl("/attachments"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || "Upload fallito");
    return data as AttachmentItem;
  },
  remove: (id: string) =>
    api<{ success: boolean }>(`/attachments/${id}`, { method: "DELETE" }),
  downloadUrl: (item: AttachmentItem) =>
    item.url ||
      `${API_ASSET_ORIGIN}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
};

export interface ActivityLogItem {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  createdAt: string;
  user?: { firstName: string; lastName: string; email?: string };
  client?: { companyName?: string; contactName?: string };
}

export const activityLogsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: ActivityLogItem[]; total: number; page: number }>(
      `/activity-logs${q}`
    );
  },
};

export interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  services?: string[];
  eventDateFrom?: string;
  eventDateTo?: string;
  source?: string;
  status: string;
  createdAt: string;
  clientId?: string | null;
  client?: {
    id: string;
    companyName?: string;
    contactName?: string;
    email?: string;
  };
  assignedTo?: { firstName: string; lastName: string };
}

export const leadsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: LeadItem[]; total: number }>(`/leads${q}`);
  },
  get: (id: string) => api<LeadItem>(`/leads/${id}`),
  update: (
    id: string,
    data: { status?: string; assignedToId?: string; convertToClient?: boolean }
  ) =>
    api<LeadItem>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () => api<NotificationItem[]>("/notifications"),
  markRead: (id: string) =>
    api<{ success: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
};

export const portalApi = {
  dashboard: () => api<PortalDashboard>("/portal/dashboard"),
  documents: () =>
    api<{ invoices: Invoice[]; quotes: Quote[] }>("/portal/documents"),
  signQuote: (id: string, signature: string) =>
    api<Quote>(`/portal/quotes/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signature }),
    }),
  acceptQuote: (id: string) =>
    api<Quote>(`/portal/quotes/${id}/accept`, { method: "POST" }),
  rejectQuote: (id: string) =>
    api<Quote>(`/portal/quotes/${id}/reject`, { method: "POST" }),
  confirmEvent: (id: string) =>
    api<{ success: boolean }>(`/portal/events/${id}/confirm`, {
      method: "POST",
    }),
};

export interface PortalDashboard {
  quotes: Quote[];
  reports: Report[];
  interventions: Intervention[];
  invoices: Invoice[];
  events: EventItem[];
}

export const publicApi = {
  contact: (data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message: string;
    services?: string[];
    eventDateFrom?: string;
    eventDateTo?: string;
  }) =>
    fetch(apiUrl("/public/contact"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new ApiError(
          r.status,
          data.error || "Errore invio",
          data.code as string | undefined,
          data.details as Record<string, string[] | undefined> | undefined
        );
      }
      return data as {
        success: boolean;
        id: string;
        emailSent?: boolean;
        emailWarning?: string;
      };
    }),
};
