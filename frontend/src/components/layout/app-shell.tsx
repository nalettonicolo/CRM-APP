"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Chiudi menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        className={cn(
          "transition-transform duration-200 ease-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        onNavigate={() => setMobileOpen(false)}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <main className="min-h-screen pt-14 md:pt-0 md:pl-64">{children}</main>
    </div>
  );
}


