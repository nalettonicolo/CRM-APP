/** Branding di default — sovrascritto da `/api/settings/public`. */

export const DEFAULT_APP_NAME = "Nicolò Service";

export interface SiteHomeFeature {
  title: string;
  description: string;
}

export interface SiteHomeSettings {
  badge: string;
  headline: string;
  subheadline: string;
  accessIntro: string;
  footerLine: string;
  features: SiteHomeFeature[];
}

export const DEFAULT_SITE_HOME: SiteHomeSettings = {
  badge: "Gestionale per uso interno",
  headline: "Clienti, preventivi e interventi in un solo posto",
  subheadline:
    "Pensato per chi gestisce assistenza e commerciale nella propria attività: preventivi, magazzino, calendario e — se ti serve — un accesso dedicato ai clienti.",
  accessIntro:
    "Non c'è registrazione pubblica: gli utenti li crei tu (admin) da Impostazioni. Il primo account di sistema viene dal seed sul database con le variabili ADMIN_EMAIL e ADMIN_PASSWORD nel backend/.env — vedi README del progetto.",
  footerLine: "Nicolò Service — uso interno",
  features: [
    {
      title: "Operatività in tempo reale",
      description: "Dashboard KPI, alert magazzino e calendario integrato.",
    },
    {
      title: "Accessi controllati",
      description: "JWT, ruoli e permessi: solo chi autorizzi entra o vede i dati.",
    },
    {
      title: "Strumenti per tecnici",
      description: "Report, checklist, materiali e scarico magazzino da campo.",
    },
  ],
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mergeSiteHome(raw: unknown): SiteHomeSettings {
  if (!isRecord(raw))
    return { ...DEFAULT_SITE_HOME, features: [...DEFAULT_SITE_HOME.features] };
  const f = raw.features;
  let features: SiteHomeFeature[];
  if (Array.isArray(f)) {
    features = f.map((item, i) => {
      const d = DEFAULT_SITE_HOME.features[i]!;
      if (!isRecord(item)) return { ...d };
      return {
        title: typeof item.title === "string" ? item.title : d.title,
        description:
          typeof item.description === "string" ? item.description : d.description,
      };
    });
    while (features.length < 3) {
      features.push({ ...DEFAULT_SITE_HOME.features[features.length]! });
    }
    features = features.slice(0, 3);
  } else {
    features = DEFAULT_SITE_HOME.features.map((x) => ({ ...x }));
  }
  return {
    badge: typeof raw.badge === "string" ? raw.badge : DEFAULT_SITE_HOME.badge,
    headline:
      typeof raw.headline === "string" ? raw.headline : DEFAULT_SITE_HOME.headline,
    subheadline:
      typeof raw.subheadline === "string"
        ? raw.subheadline
        : DEFAULT_SITE_HOME.subheadline,
    accessIntro:
      typeof raw.accessIntro === "string"
        ? raw.accessIntro
        : DEFAULT_SITE_HOME.accessIntro,
    footerLine:
      typeof raw.footerLine === "string"
        ? raw.footerLine
        : DEFAULT_SITE_HOME.footerLine,
    features,
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Risolve URL assoluto per file serviti dall'API (`/uploads/...`). */
export function publicAssetUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl?.trim()) return "";
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `${API_URL.replace(/\/$/, "")}${s.startsWith("/") ? s : `/${s}`}`;
}
