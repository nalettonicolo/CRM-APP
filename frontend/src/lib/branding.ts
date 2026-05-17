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

/** Testi home pubblica: servizi audio/luci, non vendita software. */
export const DEFAULT_SITE_HOME: SiteHomeSettings = {
  badge: "Tecnico audio e luci · eventi live",
  headline: "Audio professionale e illuminazione per il tuo evento",
  subheadline:
    "Consulenza, progettazione, allestimento e operatività in sala: concerti, manifestazioni, matrimoni e spettacoli. Preventivi chiari, attrezzatura professionale e supporto in ogni fase.",
  accessIntro:
    "Descrivi data, luogo e tipo di evento: ti rispondiamo con disponibilità e un preventivo su misura. Per urgenze indica il recapito telefonico nel messaggio.",
  footerLine: "Nicolò Service — tecnico audio e luci",
  features: [
    {
      title: "Audio live",
      description:
        "Mix FOH e monitor, microfonazione, sistemi line array e gestione del suono in tempo reale per band, DJ e speech.",
    },
    {
      title: "Luci e scenografia",
      description:
        "Progetto luci, dimmer e moving head, controllo DMX, atmosphere per club, teatro e cerimonie.",
    },
    {
      title: "Organizzazione tecnica",
      description:
        "Sopralluogo, rider tecnico, montaggio e smontaggio, coordinamento con venue e produzione.",
    },
  ],
};

export const DEFAULT_TAGLINE =
  "Tecnico professionista audio · luci · eventi";

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

export function publicAssetUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl?.trim()) return "";
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = API_URL.replace(/\/$/, "");
  if (!base) return s.startsWith("/") ? s : `/${s}`;
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}
