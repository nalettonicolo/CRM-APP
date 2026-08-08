"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";

export function IeAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAdmin, user } = usePermissions();

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Caricamento…
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
