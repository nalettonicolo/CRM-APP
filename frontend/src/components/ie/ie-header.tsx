"use client";

import { useShell } from "@/components/layout/shell-context";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IE_APP_NAME } from "@/lib/ie-branding";

export function IeHeader({ title }: { title: string }) {
  const shell = useShell();

  return (
    <header className="sticky top-0 z-30 border-b border-sky-900/30 bg-slate-950/95 backdrop-blur-md">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-4">
        {shell && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={shell.toggleMobileMenu}
            aria-label="Apri menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-sky-400/80">
            {IE_APP_NAME}
          </p>
          <h1 className="truncate text-base font-semibold text-white sm:text-lg">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
