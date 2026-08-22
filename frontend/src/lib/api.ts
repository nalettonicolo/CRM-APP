import { apiUrl, apiUrlDirect } from "./api-origin";
import { getApiWorkspace, resolveApiWorkspace, type ApiWorkspace } from "./api-workspace";

export type { ApiWorkspace };

/** Solo per asset statici (/uploads); le fetch API usano apiUrl(). */
export const API_ASSET_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
  "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, string[] | undefined>,
    public conflicts?: unknown[]
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

export type ApiOptions = {
  direct?: boolean;
  workspace?: ApiWorkspace;
};

function apiAuthHeaders(
  includeJson = false,
  workspace?: ApiWorkspace
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (resolveApiWorkspace(workspace) === "ie") headers["X-Workspace"] = "ie";
  return headers;
}

function apiHeaders(
  extra?: HeadersInit,
  workspace?: ApiWorkspace
): HeadersInit {
  return {
    ...apiAuthHeaders(true, workspace),
    ...(extra as Record<string, string> | undefined),
  };
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  config?: ApiOptions
): Promise<T> {
  const headers: HeadersInit = {
    ...apiHeaders(undefined, config?.workspace),
    ...(options.headers || {}),
  };

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
        ? "Route API non trovata (backend Mint non aggiornato?)"
        : res.status >= 500
          ? "Errore server"
          : "Errore";
    throw new ApiError(
      res.status,
      data.error || fallback,
      data.code,
      data.details as Record<string, string[] | undefined> | undefined,
      Array.isArray(data.conflicts) ? data.conflicts : undefined
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
  list: (params?: Record<string, string>, workspace?: ApiWorkspace) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: Client[]; total: number }>(`/clients${q}`, {}, { workspace });
  },
  get: (id: string, workspace?: ApiWorkspace) =>
    api<Client>(`/clients/${id}`, {}, { workspace }),
  create: (data: Partial<Client>, workspace?: ApiWorkspace) =>
    api<Client>(
      "/clients",
      { method: "POST", body: JSON.stringify(data) },
      { workspace }
    ),
  update: (id: string, data: Partial<Client>, workspace?: ApiWorkspace) =>
    api<Client>(
      `/clients/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      { workspace }
    ),
  delete: (id: string, workspace?: ApiWorkspace) =>
    api<{ success: boolean }>(
      `/clients/${id}`,
      { method: "DELETE" },
      { workspace }
    ),
  exportData: (id: string) =>
    apiUrl(`/clients/${id}/export`),
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
  pec?: string;
  sdiCode?: string;
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
  eventAt?: string | null;
  eventEndAt?: string | null;
  eventLocation?: string | null;
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
  delete: (id: string) =>
    api<{ success: boolean }>(`/quotes/${id}`, { method: "DELETE" }),
  sendEmail: (id: string) =>
    api<{ success: boolean }>(`/quotes/${id}/send-email`, { method: "POST" }),
  sign: (id: string, signature: string) =>
    api<Quote>(`/quotes/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signature }),
    }),
};

async function fetchAuthenticatedPdf(path: string): Promise<Blob> {
  const res = await fetch(apiUrl(path), {
    headers: apiAuthHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, "PDF non disponibile");
  return res.blob();
}

function openBlobForPrint(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.className = "fixed left-0 top-0 h-0 w-0 border-0 opacity-0";
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60_000);
    }
  };
}

export async function downloadQuotePdf(id: string, filename: string) {
  const blob = await fetchAuthenticatedPdf(`/quotes/${id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printQuotePdf(id: string) {
  openBlobForPrint(await fetchAuthenticatedPdf(`/quotes/${id}/pdf`));
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
  paymentMethod?: string;
  paymentTiming?: string;
  createdBy?: { firstName: string; lastName: string; email?: string };
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  signedAt?: string;
  signedByClient?: boolean;
  clientSignature?: string | null;
  canEditCreatedAt?: boolean;
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
      method: "PATCH",
      body: JSON.stringify({ layout }),
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
  location?: string;
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
    eventLocation?: string | null;
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
  products: (params?: { excludeRental?: boolean }) => {
    const q = params?.excludeRental ? "?excludeRental=1" : "";
    return api<Product[]>(`/inventory/products${q}`);
  },
  rentals: () => api<Product[]>("/inventory/rentals"),
  nextSku: (category?: string) => {
    const q = category
      ? `?category=${encodeURIComponent(category)}`
      : "";
    return api<{ sku: string; prefix: string }>(
      `/inventory/products/next-sku${q}`
    );
  },
  rentalPreparation: () =>
    api<RentalPrepItem[]>("/inventory/rentals/preparation"),
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

export type RentalPrepItem = {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unit?: string | null;
  quantity: number;
  warehouse?: string | null;
};

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  category?: string;
  description?: string;
  isRentable?: boolean;
  unit?: string | null;
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
  delete: (id: string) =>
    api<{ success: boolean }>(`/interventions/${id}`, { method: "DELETE" }),
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
    api<{ success: boolean; mock?: boolean; message?: string; to?: string }>(
      `/interventions/reports/${id}/send-email`,
      { method: "POST" }
    ),
  delete: (id: string) =>
    api<{ success: boolean }>(`/interventions/reports/${id}`, {
      method: "DELETE",
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
  createdAt?: string;
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
  quoteId?: string | null;
  clientId?: string;
  description?: string;
  expensesAmount?: number | string;
  expensesNotes?: string;
  checklist?: { label: string; checked: boolean }[];
  materials?: { name: string; quantity: number | string; unit?: string }[];
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
  canEditCreatedAt?: boolean;
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
  delete: (id: string) =>
    api<{ success: boolean }>(`/users/${id}`, { method: "DELETE" }),
};

export type PermissionMatrixRole = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  editable: boolean;
  permissionIds: string[];
};

export type PermissionMatrixEntry = {
  id: string;
  resource: string;
  action: string;
  name: string;
  key: string;
};

export type PermissionResourceDef = {
  key: string;
  label: string;
  description: string;
  actions: string[];
  actionLabels?: Record<string, string>;
};

export type PermissionSectionDef = {
  key: string;
  label: string;
  resources: PermissionResourceDef[];
};

export type PermissionMatrix = {
  sections: PermissionSectionDef[];
  roles: PermissionMatrixRole[];
  permissions: PermissionMatrixEntry[];
};

export type MyPermissions = {
  role: string;
  roleName: string;
  description?: string | null;
  permissionKeys: string[];
  sections: {
    key: string;
    label: string;
    resources: {
      key: string;
      label: string;
      description: string;
      grantedActions: { action: string; label: string }[];
    }[];
  }[];
};

export type SiteVisitSheet = {
  id: string;
  number: string;
  pending?: boolean;
  eventId: string;
  clientId?: string | null;
  quoteId?: string | null;
  status: "DRAFT" | "COMPLETED";
  location?: string | null;
  venueNotes?: string | null;
  audioNotes?: string | null;
  lightingNotes?: string | null;
  accessNotes?: string | null;
  generalNotes?: string | null;
  conductedAt?: string | null;
  updatedAt: string;
  event?: {
    id: string;
    title: string;
    type?: string;
    startAt: string;
    endAt?: string | null;
  };
  client?: { id?: string; companyName?: string; contactName?: string };
  quote?: {
    id: string;
    number: string;
    title?: string | null;
    eventLocation?: string | null;
  };
};

export const siteVisitsApi = {
  list: () => api<SiteVisitSheet[]>("/site-visits"),
  getByEvent: (eventId: string) =>
    api<SiteVisitSheet>(`/site-visits/by-event/${eventId}`),
  get: (id: string) => api<SiteVisitSheet>(`/site-visits/${id}`),
  update: (
    id: string,
    data: Partial<{
      location: string;
      venueNotes: string;
      audioNotes: string;
      lightingNotes: string;
      accessNotes: string;
      generalNotes: string;
      conductedAt: string;
      status: "DRAFT" | "COMPLETED";
    }>
  ) =>
    api<SiteVisitSheet>(`/site-visits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export const permissionsApi = {
  getMatrix: () => api<PermissionMatrix>("/permissions/matrix"),
  getMine: () => api<MyPermissions>("/permissions/mine"),
  updateRole: (slug: string, permissionIds: string[]) =>
    api<Pick<PermissionMatrix, "roles" | "permissions">>(
      `/permissions/roles/${slug}`,
      {
        method: "PUT",
        body: JSON.stringify({ permissionIds }),
      }
    ),
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
    location?: string;
    clientId?: string;
    allDay?: boolean;
    allowOverlap?: boolean;
  }) =>
    api<EventItem>("/events", { method: "POST", body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{
      title: string;
      description: string;
      location: string;
      type: string;
      startAt: string;
      endAt: string;
      clientId: string | null;
      allowOverlap: boolean;
    }>
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
  number?: string | null;
  clientId: string;
  quoteId?: string;
  subtotal: number | string;
  vatAmount: number | string;
  total: number | string;
  depositAmount?: number | string;
  balanceDue: number | string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentTiming?: string;
  status?: "DRAFT" | "CONFIRMED";
  dueDate?: string;
  eventAt?: string | null;
  eventEndAt?: string | null;
  eventLocation?: string | null;
  items?: InvoiceLineItem[];
  discounts?: InvoiceDiscount[];
  notes?: string;
  disclaimer?: string;
  showWebsite?: boolean;
  showQuoteRef?: boolean;
  sentAt?: string | null;
  createdAt: string;
  canEditCreatedAt?: boolean;
  client?: Client;
  quote?: QuoteSummary & { items?: QuoteItem[] };
}

export interface InvoiceLineItem {
  description: string;
  quantity: number | string;
  unit?: string | null;
  unitPrice: number | string;
  vatRate?: number | string;
  total: number | string;
}

export interface InvoiceDiscount {
  description: string;
  mode: "PERCENT" | "AMOUNT";
  value: number;
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
      paymentMethod?: string;
      paymentTiming?: string;
      createdAt: string;
      dueDate: string | null;
      eventAt?: string | null;
      eventEndAt?: string | null;
      eventLocation?: string | null;
      items: InvoiceLineItem[];
      discounts: InvoiceDiscount[];
      notes: string | null;
      disclaimer: string;
      showWebsite: boolean;
      showQuoteRef: boolean;
    }>
  ) =>
    api<Invoice>(`/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/invoices/${id}`, { method: "DELETE" }),
  createFromQuote: (quoteId: string) =>
    api<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify({ quoteId }),
    }),
  fromQuote: (quoteId: string) => invoicesApi.createFromQuote(quoteId),
  createFromJobOrder: (jobOrderId: string, reportIds: string[]) =>
    api<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify({ jobOrderId, reportIds }),
    }),
  sendEmail: (id: string) =>
    api<{ success: boolean; invoice: Invoice }>(`/invoices/${id}/send-email`, {
      method: "POST",
    }),
  confirm: (id: string) =>
    api<Invoice>(`/invoices/${id}/confirm`, {
      method: "POST",
    }),
};

export async function downloadInvoicePdf(id: string, filename: string) {
  const blob = await fetchAuthenticatedPdf(`/invoices/${id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printInvoicePdf(id: string) {
  openBlobForPrint(await fetchAuthenticatedPdf(`/invoices/${id}/pdf`));
}

export interface TransportDocumentLine {
  id?: string;
  description: string;
  quantity: number | string;
  unit: string;
  sku?: string | null;
  productId?: string | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface TransportDocument {
  id: string;
  number: string;
  status: string;
  clientId: string;
  quoteId?: string | null;
  issueDate: string;
  transportStartAt?: string | null;
  recipientName?: string | null;
  recipientAddress?: string | null;
  recipientCity?: string | null;
  recipientProvince?: string | null;
  recipientPostalCode?: string | null;
  recipientVat?: string | null;
  recipientFiscalCode?: string | null;
  destinationAddress?: string | null;
  destinationCity?: string | null;
  destinationProvince?: string | null;
  destinationPostalCode?: string | null;
  reason: string;
  carrier: string;
  carrierName?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  packagesCount?: number | null;
  grossWeightKg?: number | string | null;
  appearance?: string | null;
  referenceDoc?: string | null;
  notes?: string | null;
  lines: TransportDocumentLine[];
  client?: {
    id: string;
    companyName?: string | null;
    contactName?: string | null;
  };
  quote?: { id: string; number: string; title?: string | null } | null;
  createdBy?: { firstName: string; lastName: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

export const transportDocumentsApi = {
  list: () => api<TransportDocument[]>("/transport-documents"),
  get: (id: string) => api<TransportDocument>(`/transport-documents/${id}`),
  create: (data: unknown) =>
    api<TransportDocument>("/transport-documents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: unknown) =>
    api<TransportDocument>(`/transport-documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/transport-documents/${id}`, {
      method: "DELETE",
    }),
};

export async function downloadTransportDocumentPdf(id: string, filename: string) {
  const blob = await fetchAuthenticatedPdf(`/transport-documents/${id}/pdf`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printTransportDocumentPdf(id: string) {
  openBlobForPrint(await fetchAuthenticatedPdf(`/transport-documents/${id}/pdf`));
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
  list: () => api<AutomationRule[]>("/automation"),
  create: (data: Partial<AutomationRule>) =>
    api<AutomationRule>("/automation", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AutomationRule>) =>
    api<AutomationRule>(`/automation/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/automation/${id}`, {
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

import { flattenSearchResults } from "./search-results";

export const searchApi = {
  query: async (q: string) => {
    const data = await api<{
      clients: Array<{
        id: string;
        companyName?: string | null;
        contactName?: string | null;
        email?: string | null;
      }>;
      quotes: Array<{
        id: string;
        number: string;
        title?: string | null;
        client?: { companyName?: string | null; contactName?: string | null };
      }>;
      interventions: Array<{
        id: string;
        number: string;
        title?: string | null;
        client?: { companyName?: string | null; contactName?: string | null };
      }>;
    }>(`/search?${new URLSearchParams({ q })}`);
    return flattenSearchResults(data);
  },
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
  testEmail: (type: "smtp" | "quote" | "report" | "invoice", to: string) =>
    api<{ success: boolean; mock?: boolean; message?: string }>(
      "/settings/email-tests",
      { method: "POST", body: JSON.stringify({ type, to }) }
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
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entityType", entityType);
    fd.append("entityId", entityId);
    const res = await fetch(apiUrl("/attachments"), {
      method: "POST",
      headers: apiAuthHeaders(),
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
  pendingCount: () => api<{ count: number }>("/leads/pending-count"),
  get: (id: string) => api<LeadItem>(`/leads/${id}`),
  update: (
    id: string,
    data: { status?: string; assignedToId?: string; convertToClient?: boolean }
  ) =>
    api<LeadItem>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/leads/${id}`, { method: "DELETE" }),
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
  signQuote: (id: string, signature: string, privacyAccepted = true) =>
    api<Quote>(`/portal/quotes/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signature, privacyAccepted }),
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
    privacyAccepted: true;
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

export const privacyApi = {
  version: () =>
    api<{
      privacyPolicyVersion: string;
      leadRetentionDays: number;
      activityLogRetentionDays: number;
    }>("/privacy/version"),
  maintenance: () =>
    api<{
      success: boolean;
      deletedLeads: number;
      deletedActivityLogs: number;
    }>("/privacy/maintenance", { method: "POST" }),
};

export interface JobDailyReport {
  id: string;
  number: string;
  jobOrderId?: string | null;
  workDate: string;
  status: string;
  description?: string | null;
  workHours: number | string;
  expensesAmount: number | string;
  expensesNotes?: string | null;
  materials?: unknown;
  notes?: string | null;
  jobOrder?: {
    id: string;
    number: string;
    title: string;
    clientId?: string;
    client?: { id: string; companyName?: string | null; contactName?: string | null };
  } | null;
}

export interface JobOrder {
  id: string;
  number: string;
  clientId: string;
  title: string;
  description?: string | null;
  workType?: string | null;
  status: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  estimatedDays?: number | null;
  location?: string | null;
  notes?: string | null;
  quoteId?: string | null;
  client?: { id: string; companyName?: string | null; contactName?: string | null };
  quote?: { id: string; number: string; title?: string | null } | null;
  dailyReports?: JobDailyReport[];
  _count?: { dailyReports: number; invoicePreviews: number };
}

export const jobOrdersApi = {
  list: (params?: { status?: string; clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.clientId) q.set("clientId", params.clientId);
    const qs = q.toString() ? `?${q}` : "";
    return api<JobOrder[]>(`/job-orders${qs}`);
  },
  get: (id: string) => api<JobOrder>(`/job-orders/${id}`),
  create: (data: Record<string, unknown>) =>
    api<JobOrder>("/job-orders", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    api<JobOrder>(`/job-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/job-orders/${id}`, { method: "DELETE" }),
  addReport: (id: string, data: Record<string, unknown>) =>
    api<JobDailyReport>(`/job-orders/${id}/reports`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateReport: (id: string, reportId: string, data: Record<string, unknown>) =>
    api<JobDailyReport>(`/job-orders/${id}/reports/${reportId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export const dailyReportsApi = {
  list: (params?: { unlinked?: boolean; jobOrderId?: string }) => {
    const q = new URLSearchParams();
    if (params?.unlinked) q.set("unlinked", "1");
    if (params?.jobOrderId) q.set("jobOrderId", params.jobOrderId);
    const qs = q.toString() ? `?${q}` : "";
    return api<JobDailyReport[]>(`/daily-reports${qs}`);
  },
  get: (id: string) => api<JobDailyReport>(`/daily-reports/${id}`),
  create: (data: Record<string, unknown>) =>
    api<JobDailyReport>("/daily-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    api<JobDailyReport>(`/daily-reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/daily-reports/${id}`, { method: "DELETE" }),
  linkToJob: (id: string, jobOrderId: string | null) =>
    dailyReportsApi.update(id, { jobOrderId }),
};

export interface SupplierCatalogFile {
  id: string;
  role: "PRICE_LIST" | "CATALOG" | "OTHER";
  label?: string | null;
  filePath: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  sortOrder?: number;
}

export interface SupplierCatalogItem {
  id?: string;
  sku?: string | null;
  name: string;
  unit?: string | null;
  listPrice: number | string;
  discountPercent?: number | string;
  sellPrice?: number | string | null;
  notes?: string | null;
  sourceLabel?: string | null;
  productLine?: string | null;
}

export interface SupplierCatalogSearchHit {
  id: string;
  sku?: string | null;
  name: string;
  unit?: string | null;
  listPrice: number;
  discountPercent: number;
  netPrice: number;
  sellPrice?: number | null;
  /** Prezzo suggerito al cliente: sellPrice se impostato, altrimenti listino. */
  customerPrice: number;
  sourceLabel?: string | null;
  productLine?: string | null;
  techFamily?: "BUS" | "ZIGBEE" | "TRADIZIONALE" | null;
  catalogId: string;
  catalogTitle: string;
  supplierName: string;
}

export interface SupplierCatalogProductLine {
  line: string;
  count: number;
}

export interface SupplierCatalogStatus {
  hasPrices: boolean;
  hasPhotos: boolean;
  mergedCount: number;
  itemCount: number;
}

export interface SupplierCatalog {
  id: string;
  supplierId?: string | null;
  supplierName: string;
  title: string;
  kind: "PDF" | "PRICE_LIST";
  category?: "ELECTRICAL" | "SECURITY" | string;
  description?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  defaultDiscountPercent: number | string;
  isActive: boolean;
  items: SupplierCatalogItem[];
  files?: SupplierCatalogFile[];
  status?: SupplierCatalogStatus;
  _count?: { items?: number; files?: number };
  imported?: number;
  updated?: number;
  parsed?: number;
  totalItems?: number;
  sources?: { label: string; role: string; lines: number }[];
  parseErrors?: string[];
}

export const supplierCatalogsApi = {
  list: (opts?: { kind?: string; category?: "ELECTRICAL" | "SECURITY" }) => {
    const params = new URLSearchParams();
    if (opts?.kind) params.set("kind", opts.kind);
    if (opts?.category) params.set("category", opts.category);
    const q = params.toString();
    return api<SupplierCatalog[]>(
      `/supplier-catalogs${q ? `?${q}` : ""}`
    );
  },
  get: (
    id: string,
    opts?: { line?: string; q?: string; limit?: number }
  ) => {
    const params = new URLSearchParams();
    if (opts?.line) params.set("line", opts.line);
    if (opts?.q) params.set("q", opts.q);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return api<SupplierCatalog>(
      `/supplier-catalogs/${id}${qs ? `?${qs}` : ""}`
    );
  },
  searchItems: (
    q: string,
    opts?: {
      catalogId?: string;
      category?: "ELECTRICAL" | "SECURITY";
      line?: string;
      macro?: string;
      tech?: string;
      limit?: number;
    }
  ) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (opts?.catalogId) params.set("catalogId", opts.catalogId);
    if (opts?.category) params.set("category", opts.category);
    if (opts?.line) params.set("line", opts.line);
    if (opts?.macro) params.set("macro", opts.macro);
    if (opts?.tech) params.set("tech", opts.tech);
    if (opts?.limit) params.set("limit", String(opts.limit));
    return api<SupplierCatalogSearchHit[]>(
      `/supplier-catalogs/items/search?${params}`
    );
  },
  ensureAjax: () =>
    api<{
      catalog: SupplierCatalog;
      created: boolean;
      imported: number;
      message: string;
    }>("/supplier-catalogs/ensure-ajax", { method: "POST" }),
  productLines: (catalogId?: string) => {
    const params = new URLSearchParams();
    if (catalogId) params.set("catalogId", catalogId);
    const qs = params.toString();
    return api<{ lines: SupplierCatalogProductLine[]; total: number }>(
      `/supplier-catalogs/items/lines${qs ? `?${qs}` : ""}`
    );
  },
  backfillLines: (catalogId?: string) =>
    api<{ scanned: number; updated: number }>(
      `/supplier-catalogs/items/backfill-lines`,
      {
        method: "POST",
        body: JSON.stringify(catalogId ? { catalogId } : {}),
      }
    ),
  create: (data: Record<string, unknown>) =>
    api<SupplierCatalog>("/supplier-catalogs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    api<SupplierCatalog>(`/supplier-catalogs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/supplier-catalogs/${id}`, { method: "DELETE" }),
  updateItem: (
    catalogId: string,
    itemId: string,
    data: {
      sku?: string | null;
      name?: string;
      unit?: string | null;
      listPrice?: number;
      discountPercent?: number;
      sellPrice?: number | null;
      notes?: string | null;
      productLine?: string | null;
    }
  ) =>
    api<SupplierCatalogItem>(
      `/supplier-catalogs/${catalogId}/items/${itemId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),
  deleteItem: (catalogId: string, itemId: string) =>
    api<{ success: boolean }>(
      `/supplier-catalogs/${catalogId}/items/${itemId}`,
      { method: "DELETE" }
    ),
  importPdfItems: (id: string, replace = false) =>
    api<SupplierCatalog>(`/supplier-catalogs/${id}/import-pdf-items`, {
      method: "POST",
      body: JSON.stringify({ replace }),
    }),
  deleteFile: (catalogId: string, fileId: string) =>
    api<SupplierCatalog>(`/supplier-catalogs/${catalogId}/files/${fileId}`, {
      method: "DELETE",
    }),
  uploadFile: async (
    id: string,
    file: File,
    opts?: {
      role?: "PRICE_LIST" | "CATALOG" | "OTHER";
      label?: string;
      replaceSameRole?: boolean;
      onProgress?: (percent: number) => void;
    }
  ) => {
    const maxBytes = 150 * 1024 * 1024;
    const sizeMb = file.size / (1024 * 1024);
    if (file.size > maxBytes) {
      throw new ApiError(
        413,
        `PDF troppo grande (${sizeMb.toFixed(0)} MB). Massimo 150 MB.`
      );
    }
    await refreshToken();
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const primaryUrl =
      isLocal || file.size <= 5 * 1024 * 1024
        ? apiUrl(`/supplier-catalogs/${id}/files`)
        : apiUrlDirect(`/supplier-catalogs/${id}/files`);

    const postOnce = (targetUrl: string) =>
      new Promise<SupplierCatalog>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", targetUrl);
        xhr.withCredentials = true;
        const headers = apiAuthHeaders();
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === "content-type") continue;
          xhr.setRequestHeader(key, value);
        }
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable || !opts?.onProgress) return;
          opts.onProgress(
            Math.min(99, Math.round((event.loaded / event.total) * 100))
          );
        };
        xhr.onload = () => {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(xhr.responseText || "{}") as Record<
              string,
              unknown
            >;
          } catch {
            /* ignore */
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            opts?.onProgress?.(100);
            resolve(data as unknown as SupplierCatalog);
            return;
          }
          reject(
            new ApiError(
              xhr.status,
              (typeof data.error === "string" && data.error) ||
                `Upload fallito (HTTP ${xhr.status})`
            )
          );
        };
        xhr.onerror = () =>
          reject(new ApiError(0, "Upload interrotto. Riprova con PDF piu leggero."));
        xhr.ontimeout = () => reject(new ApiError(0, "Upload scaduto."));
        xhr.timeout = 60 * 60 * 1000;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("role", opts?.role || "OTHER");
        if (opts?.label) fd.append("label", opts.label);
        if (opts?.replaceSameRole) fd.append("replaceSameRole", "true");
        opts?.onProgress?.(0);
        xhr.send(fd);
      });

    try {
      return await postOnce(primaryUrl);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const ok = await refreshToken();
        if (ok) return postOnce(primaryUrl);
      }
      throw err;
    }
  },
  uploadPdf: async (
    id: string,
    file: File,
    onProgress?: (percent: number) => void
  ) =>
    supplierCatalogsApi.uploadFile(id, file, {
      role: "PRICE_LIST",
      replaceSameRole: true,
      onProgress,
    }),
};

export interface SupplierBill {
  id: string;
  number: string;
  supplierId?: string | null;
  supplierName: string;
  description?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  amount: number | string;
  vatAmount: number | string;
  total: number | string;
  paidAmount: number | string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
  paidAt?: string | null;
  reference?: string | null;
  notes?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  supplier?: { id: string; name: string; email?: string | null } | null;
}

export const supplierBillsApi = {
  list: (params?: { open?: boolean; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.open) q.set("open", "1");
    if (params?.status) q.set("status", params.status);
    const qs = q.toString() ? `?${q}` : "";
    return api<SupplierBill[]>(`/supplier-bills${qs}`);
  },
  get: (id: string) => api<SupplierBill>(`/supplier-bills/${id}`),
  create: (data: Record<string, unknown>) =>
    api<SupplierBill>("/supplier-bills", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    api<SupplierBill>(`/supplier-bills/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/supplier-bills/${id}`, { method: "DELETE" }),
  uploadDocument: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(apiUrl(`/supplier-bills/${id}/document`), {
      method: "POST",
      headers: apiAuthHeaders(),
      body: fd,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || "Upload fallito");
    return data as SupplierBill;
  },
};

export interface ClientExpense {
  id: string;
  number: string;
  clientId?: string | null;
  clientName: string;
  category?: string | null;
  description?: string | null;
  expenseDate: string;
  dueDate?: string | null;
  amount: number | string;
  vatAmount: number | string;
  total: number | string;
  paidAmount: number | string;
  status: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
  paidAt?: string | null;
  reference?: string | null;
  notes?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  client?: {
    id: string;
    companyName?: string | null;
    contactName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export const clientExpensesApi = {
  list: (params?: { open?: boolean; status?: string; clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.open) q.set("open", "1");
    if (params?.status) q.set("status", params.status);
    if (params?.clientId) q.set("clientId", params.clientId);
    const qs = q.toString() ? `?${q}` : "";
    return api<ClientExpense[]>(`/client-expenses${qs}`);
  },
  get: (id: string) => api<ClientExpense>(`/client-expenses/${id}`),
  create: (data: Record<string, unknown>) =>
    api<ClientExpense>("/client-expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    api<ClientExpense>(`/client-expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/client-expenses/${id}`, { method: "DELETE" }),
  uploadDocument: async (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(apiUrl(`/client-expenses/${id}/document`), {
      method: "POST",
      headers: apiAuthHeaders(),
      body: fd,
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || "Upload fallito");
    return data as ClientExpense;
  },
};

export async function downloadClientExport(id: string, filename: string) {
  const token = getToken();
  const res = await fetch(clientsApi.exportData(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(res.status, "Esportazione dati non disponibile");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
