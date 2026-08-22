"use client";

import { createContext, useContext, useEffect } from "react";
import { setApiWorkspace } from "@/lib/api-workspace";
import {
  routesFor,
  type Workspace,
  type WorkspaceRoutes,
} from "@/lib/workspace-routes";

const WorkspaceContext = createContext<Workspace>("crm");

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  useEffect(() => {
    setApiWorkspace(workspace);
  }, [workspace]);

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): Workspace {
  return useContext(WorkspaceContext);
}

export function useWorkspaceRoutes(): WorkspaceRoutes {
  return routesFor(useWorkspace());
}
