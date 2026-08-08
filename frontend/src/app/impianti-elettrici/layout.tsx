"use client";

import { AuthGuard } from "@/components/auth-guard";
import { IeAdminGuard } from "@/components/ie/ie-admin-guard";
import { IeShell } from "@/components/ie/ie-shell";
import { WorkspaceProvider } from "@/contexts/workspace-context";

export default function ImpiantiElettriciLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <IeAdminGuard>
        <WorkspaceProvider workspace="ie">
          <IeShell>{children}</IeShell>
        </WorkspaceProvider>
      </IeAdminGuard>
    </AuthGuard>
  );
}
