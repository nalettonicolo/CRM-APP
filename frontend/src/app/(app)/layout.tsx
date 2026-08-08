"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceProvider } from "@/contexts/workspace-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WorkspaceProvider workspace="crm">
        <AppShell>{children}</AppShell>
      </WorkspaceProvider>
    </AuthGuard>
  );
}
