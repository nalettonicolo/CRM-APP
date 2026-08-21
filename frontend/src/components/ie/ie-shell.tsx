"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { IeSidebar } from "@/components/ie/ie-sidebar";
import { ShellContext } from "@/components/layout/shell-context";

export function IeShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileOpen((o) => !o), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <ShellContext.Provider
      value={{ mobileOpen, toggleMobileMenu, closeMobileMenu }}
    >
      <div className="ie-workspace dark min-h-screen bg-slate-950 text-slate-100">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Chiudi menu"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
            onClick={closeMobileMenu}
          />
        )}

        <IeSidebar
          mobileOpen={mobileOpen}
          onNavigate={closeMobileMenu}
          onClose={closeMobileMenu}
        />

        <main
          className={cn(
            "min-h-[100dvh] w-full min-w-0 transition-[padding] duration-200",
            "lg:pl-[15.5rem] app-safe-bottom"
          )}
        >
          {children}
        </main>
      </div>
    </ShellContext.Provider>
  );
}
