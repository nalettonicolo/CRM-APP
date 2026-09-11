// Client API minimale verso il backend enterprise. In sviluppo, se l'API
// non è raggiungibile (backend/DB non ancora avviati), le funzioni ricadono
// sui dati demo di lib/mockData.ts così l'interfaccia resta sempre visitabile
// — questo è il comportamento richiesto per la fase "solo visivo" iniziale.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("enterprise_access_token");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      // Timeout corto: se il backend non è avviato, non blocchiamo la UI a lungo.
      signal: init?.signal ?? AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // backend non raggiungibile → il chiamante userà il fallback mock
  }
}

/** Helper: prova l'API reale, altrimenti restituisce il valore demo passato. */
export async function withFallback<T>(path: string, mock: T, init?: RequestInit): Promise<T> {
  const real = await apiFetch<T>(path, init);
  return real ?? mock;
}
