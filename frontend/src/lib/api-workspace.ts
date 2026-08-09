export type ApiWorkspace = "crm" | "ie";

let activeWorkspace: ApiWorkspace = "crm";

export function setApiWorkspace(workspace: ApiWorkspace): void {
  activeWorkspace = workspace;
}

export function getApiWorkspace(): ApiWorkspace {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/impianti-elettrici")) {
      return "ie";
    }
  }
  return activeWorkspace;
}
