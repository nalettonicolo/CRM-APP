export type ApiWorkspace = "crm" | "ie";

let activeWorkspace: ApiWorkspace = "crm";

export function setApiWorkspace(workspace: ApiWorkspace): void {
  activeWorkspace = workspace;
}

export function getApiWorkspace(): ApiWorkspace {
  return activeWorkspace;
}
