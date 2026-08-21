export type ApiWorkspace = "crm" | "ie";

const STORAGE_KEY = "crm-api-workspace";

let activeWorkspace: ApiWorkspace = "crm";

export function setApiWorkspace(workspace: ApiWorkspace): void {
  activeWorkspace = workspace;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, workspace);
    } catch {
      /* ignore */
    }
  }
}

export function getApiWorkspace(): ApiWorkspace {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/impianti-elettrici")) {
      return "ie";
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "ie" || stored === "crm") return stored;
    } catch {
      /* ignore */
    }
  }
  return activeWorkspace;
}
