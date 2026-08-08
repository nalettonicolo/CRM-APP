"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { invoicesApi, quotesApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { DOCUMENT_COPY } from "@/lib/document-copy";
import { formatCurrency } from "@/lib/utils";

function clientLabel(c: {
  companyName?: string | null;
  contactName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    c.companyName ||
    c.contactName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    "Cliente"
  );
}

export function InvoiceCreateDialog() {
  const router = useRouter();
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState("");

  const { data: quotesRes, isLoading: quotesLoading } = useQuery({
    queryKey: ["quotes", "accepted", "for-invoice"],
    queryFn: () => quotesApi.list({ status: "ACCEPTED", limit: "200" }),
    enabled: open,
  });

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoicesApi.list(),
    enabled: open,
  });

  const eligible = useMemo(() => {
    const usedQuoteIds = new Set(
      (invoicesRes?.data ?? [])
        .map((inv) => inv.quoteId)
        .filter((id): id is string => Boolean(id))
    );
    return (quotesRes?.data ?? []).filter((q) => !usedQuoteIds.has(q.id));
  }, [quotesRes?.data, invoicesRes?.data]);

  const create = useMutation({
    mutationFn: () => invoicesApi.createFromQuote(quoteId),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      if (quoteId) qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      setOpen(false);
      setQuoteId("");
      router.push(routes.invoice(inv.id));
    },
  });

  const selected = eligible.find((q) => q.id === quoteId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {DOCUMENT_COPY.invoice.createButton}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{DOCUMENT_COPY.invoice.createDialogTitle}</DialogTitle>
          <DialogDescription>
            {DOCUMENT_COPY.invoice.createDialogHint} Il documento viene creato come bozza
            senza numero progressivo: la numerazione viene assegnata alla conferma.
          </DialogDescription>
        </DialogHeader>

        {quotesLoading || invoicesLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento preventivi…</p>
        ) : eligible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            {DOCUMENT_COPY.invoice.createEmpty}
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Preventivo accettato
            </label>
            <select
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={quoteId}
              onChange={(e) => setQuoteId(e.target.value)}
            >
              <option value="">Seleziona preventivo…</option>
              {eligible.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.number} — {clientLabel(q.client || {})}
                  {q.title ? ` — ${q.title}` : ""} ({formatCurrency(Number(q.total))})
                </option>
              ))}
            </select>
            {selected && (
              <p className="text-xs text-muted-foreground">
                Totale preventivo: {formatCurrency(Number(selected.total))}
              </p>
            )}
            {create.isError && (
              <p className="text-sm text-destructive">
                {(create.error as Error).message}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            disabled={!quoteId || create.isPending || eligible.length === 0}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creazione…" : DOCUMENT_COPY.invoice.createSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
