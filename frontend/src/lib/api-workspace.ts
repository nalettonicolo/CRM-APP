export type ApiWorkspace = "crm" | "ie";

let activeWorkspace: ApiWorkspace = "crm";

/** Imposta workspace in memoria (usato dal WorkspaceProvider). */
export function setApiWorkspace(workspace: ApiWorkspace): void {
  activeWorkspace = workspace;
}

/** Workspace API: solo dal path (mai sessionStorage — evita mix CRM/IE). */
export function getApiWorkspace(): ApiWorkspace {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/impianti-elettrici")) {
      return "ie";
    }
    return "crm";
  }
  return activeWorkspace;
}

export function resolveApiWorkspace(explicit?: ApiWorkspace): ApiWorkspace {
  return explicit ?? getApiWorkspace();
}
