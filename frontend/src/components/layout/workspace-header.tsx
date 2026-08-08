"use client";

import { Header } from "@/components/layout/header";
import { IeHeader } from "@/components/ie/ie-header";
import { useWorkspace } from "@/contexts/workspace-context";

export function WorkspaceHeader({ title }: { title: string }) {
  const workspace = useWorkspace();
  if (workspace === "ie") return <IeHeader title={title} />;
  return <Header title={title} />;
}
