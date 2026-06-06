import type { SearchResult } from "@/lib/api";

type SearchPayload = {
  clients?: Array<{
    id: string;
    companyName?: string | null;
    contactName?: string | null;
    email?: string | null;
  }>;
  quotes?: Array<{
    id: string;
    number: string;
    title?: string | null;
    client?: { companyName?: string | null; contactName?: string | null };
  }>;
  interventions?: Array<{
    id: string;
    number: string;
    title?: string | null;
    client?: { companyName?: string | null; contactName?: string | null };
  }>;
};

export function flattenSearchResults(data: SearchPayload): SearchResult[] {
  const out: SearchResult[] = [];

  for (const c of data.clients ?? []) {
    out.push({
      type: "client",
      id: c.id,
      title: c.companyName || c.contactName || "Cliente",
      subtitle: c.email || undefined,
      href: `/clients/${c.id}`,
    });
  }

  for (const q of data.quotes ?? []) {
    out.push({
      type: "quote",
      id: q.id,
      title: q.title ? `${q.number} — ${q.title}` : q.number,
      subtitle:
        q.client?.companyName || q.client?.contactName || undefined,
      href: `/quotes/${q.id}`,
    });
  }

  for (const i of data.interventions ?? []) {
    out.push({
      type: "intervention",
      id: i.id,
      title: i.title ? `${i.number} — ${i.title}` : i.number,
      subtitle:
        i.client?.companyName || i.client?.contactName || undefined,
      href: `/interventions/${i.id}`,
    });
  }

  return out;
}
