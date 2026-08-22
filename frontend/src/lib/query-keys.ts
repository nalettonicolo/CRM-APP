import type { Workspace } from "@/lib/workspace-routes";

/** Chiavi React Query separate per CRM e Impianti Elettrici (staleTime 60s). */
export function wsQueryKey(workspace: Workspace, ...parts: unknown[]) {
  return [workspace, ...parts] as const;
}

export const queryKeys = {
  clients: (workspace: Workspace, search = "", status = "") =>
    wsQueryKey(workspace, "clients", search, status),
  clientsPicker: (workspace: Workspace, query: string) =>
    wsQueryKey(workspace, "clients", "picker", query),
  clientsList: (workspace: Workspace) =>
    wsQueryKey(workspace, "clients", "list"),
  client: (workspace: Workspace, id: string) =>
    wsQueryKey(workspace, "client", id),
  quotes: (workspace: Workspace) => wsQueryKey(workspace, "quotes"),
  quotesForClient: (workspace: Workspace, clientId: string) =>
    wsQueryKey(workspace, "quotes", clientId),
  quotesAcceptedForInvoice: (workspace: Workspace) =>
    wsQueryKey(workspace, "quotes", "accepted", "for-invoice"),
  quotesForDdt: (workspace: Workspace, clientId: string) =>
    wsQueryKey(workspace, "quotes", "ddt", clientId),
  quote: (workspace: Workspace, id: string) =>
    wsQueryKey(workspace, "quote", id),
};
