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
  contactName?: string;
  email?: string;
  phone?: string;
  status: string;
  tags?: string[];
  city?: string;
  _count?: { quotes: number; interventions: number; reports: number };
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
};

export interface Quote {
  id: string;
  number: string;
  title?: string;
  status: string;
  total: number | string;
  balanceDue: number | string;
  client?: { companyName?: string; contactName?: string };
  createdAt: string;
}

export const dashboardApi = {
  stats: () => api<DashboardStats>("/dashboard/stats"),
};

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
  startAt: string;
  client?: { companyName?: string };
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
}

export interface Service {
  id: string;
  name: string;
  price: number | string;
  category?: string;
}

export const interventionsApi = {
  list: () => api<Intervention[]>("/interventions"),
  reports: () => api<Report[]>("/interventions/reports"),
};

export interface Intervention {
  id: string;
  number: string;
  title: string;
  status: string;
  scheduledAt?: string;
  client?: { companyName?: string; contactName?: string };
}

export interface Report {
  id: string;
  number: string;
  status: string;
  workHours: number | string;
  createdAt: string;
  client?: { companyName?: string };
}

export const eventsApi = {
  list: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString() ? `?${params}` : "";
    return api<EventItem[]>(`/events${q}`);
  },
};

export const settingsApi = {
  public: () => api<Record<string, unknown>>("/settings/public"),
  get: () => api<Record<string, unknown>>("/settings"),
};

export const portalApi = {
  dashboard: () => api<PortalDashboard>("/portal/dashboard"),
};

export interface PortalDashboard {
  quotes: Quote[];
  reports: Report[];
  interventions: Intervention[];
  invoices: unknown[];
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
