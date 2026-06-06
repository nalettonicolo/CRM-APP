"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export function MobileSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const router = useRouter();

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchApi.query(q),
    enabled: open && q.trim().length >= 2,
  });

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-auto bottom-0 max-h-[min(85dvh,640px)] translate-y-0 rounded-b-none sm:rounded-b-xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Ricerca</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Clienti, preventivi, interventi…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-[50dvh] overflow-y-auto rounded-lg border border-border">
          {q.trim().length < 2 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Digita almeno 2 caratteri.
            </p>
          ) : isFetching ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Ricerca in corso…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nessun risultato.
            </p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full min-h-11 flex-col px-3 py-2.5 text-left text-sm",
                      "hover:bg-muted/50 active:bg-muted"
                    )}
                    onClick={() => {
                      router.push(r.href);
                      onOpenChange(false);
                    }}
                  >
                    <span className="font-medium">{r.title}</span>
                    {r.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {r.subtitle}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
