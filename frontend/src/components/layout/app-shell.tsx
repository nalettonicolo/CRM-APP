"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { ShellContext } from "@/components/layout/shell-context";

export function AppShell({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <ShellContext.Provider
      value={{ mobileOpen, toggleMobileMenu, closeMobileMenu }}
    >
      <div className="min-h-screen bg-background">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Chiudi menu"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
            onClick={closeMobileMenu}
          />
        )}

        <Sidebar
          mobileOpen={mobileOpen}
          onNavigate={closeMobileMenu}
          onClose={closeMobileMenu}
        />

        <main
          className={cn(
            "min-h-screen w-full min-w-0 transition-[padding] duration-200",
            "lg:pl-64"
          )}
        >
          {children}
        </main>
      </div>
    </ShellContext.Provider>
  );
}
