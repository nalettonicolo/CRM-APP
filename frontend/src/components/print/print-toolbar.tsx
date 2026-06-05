"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ title }: { title?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
      {title && <p className="text-sm text-muted-foreground">{title}</p>}
      <Button type="button" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Stampa
      </Button>
    </div>
  );
}
