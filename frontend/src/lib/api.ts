const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && path !== "/auth/login") {
    const refreshed = await refreshToken();
    if (refreshed) {
      return api<T>(path, options);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Errore", data.code);
  }
  return data as T;
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
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
};

export async function downloadQuotePdf(id: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/quotes/${id}/pdf`, {
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
  validUntil?: string;
  notes?: string;
  internalNotes?: string;
  category?: string;
  clientId?: string;
  client?: Client;
  items?: QuoteItem[];
  createdBy?: { firstName: string; lastName: string; email?: string };
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface QuoteItem {
  id: string;
  type: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  vatRate: number | string;
  discount: number | string;
  total: number | string;
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
  color?: string;
  client?: { companyName?: string; contactName?: string };
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
  services: () => api<Service[]>("/inventory/services"),
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
}

export const interventionsApi = {
  list: () => api<Intervention[]>("/interventions"),
  get: (id: string) => api<InterventionDetail>(`/interventions/${id}`),
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
  interventionId?: string;
  description?: string;
  workHours?: number;
  checklist?: { label: string; checked: boolean }[];
  materials?: { name: string; quantity: number; unit?: string; productId?: string }[];
  technicianSignature?: string;
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
  checklist?: { label: string; checked: boolean }[];
  technicianSignature?: string;
  latitude?: number | string;
  longitude?: number | string;
  submittedAt?: string;
  updatedAt?: string;
  client?: Client;
  technician?: { firstName: string; lastName: string; email?: string };
  intervention?: { id: string; number: string; title: string };
  materials?: {
    id: string;
    name: string;
    quantity: number | string;
    unit?: string;
  }[];
}

export async function downloadReportPdf(id: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/interventions/reports/${id}/pdf`, {
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

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone?: string;
  lastLoginAt?: string | null;
  createdAt: string;
  client?: { companyName?: string };
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
  update: (id: string, data: Partial<{ password: string; role: string; status: string }>) =>
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
  update: (id: string, data: Partial<{ title: string; startAt: string; endAt: string }>) =>
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
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: Invoice[]; total: number }>(`/invoices${q}`);
  },
  get: (id: string) => api<Invoice>(`/invoices/${id}`),
  fromQuote: (quoteId: string) =>
    api<Invoice>("/invoices/from-quote", {
      method: "POST",
      body: JSON.stringify({ quoteId }),
    }),
};

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

export const settingsApi = {
  public: () => api<Record<string, unknown>>("/settings/public"),
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
};

export async function uploadBrandingAsset(file: File, kind: "logo" | "favicon") {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${API_URL}/api/uploads/branding?kind=${encodeURIComponent(kind)}`,
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
    const res = await fetch(`${API_URL}/api/attachments`, {
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
    item.url || `${API_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
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
  status: string;
  createdAt: string;
  assignedTo?: { firstName: string; lastName: string };
}

export const leadsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ data: LeadItem[]; total: number }>(`/leads${q}`);
  },
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
    api<{ success: boolean }>(`/portal/quotes/${id}/sign`, {
      method: "POST",
      body: JSON.stringify({ signature }),
    }),
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
  }) =>
    fetch(`${API_URL}/api/public/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};
