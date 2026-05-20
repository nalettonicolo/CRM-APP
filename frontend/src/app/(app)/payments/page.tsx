"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil, Trash2, Wallet } from "lucide-react";
import { Header } from "@/components/layout/header";
import {
  PageCreateBar,
  PageCreateButton,
} from "@/components/layout/page-create-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpenPaymentsPanel } from "@/components/payments/open-payments-panel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clientsApi,
  paymentsApi,
  quotesApi,
  type ClientPayment,
} from "@/lib/api";
import { paymentMethodLabels } from "@/lib/labels";
import { SECTION_CREATE } from "@/lib/section-create";
import { formatCurrency, formatDate } from "@/lib/utils";

const METHODS = [
  "BANK_TRANSFER",
  "CASH",
  "CARD",
  "PAYPAL",
  "OTHER",
] as const;

const emptyForm = {
  clientId: "",
  quoteId: "",
  label: "",
  amount: "",
  paidAt: new Date().toISOString().slice(0, 10),
  method: "BANK_TRANSFER",
  reference: "",
  notes: "",
};

function clientLabel(p: ClientPayment) {
  const c = p.client;
  if (!c) return "—";
  return (
    c.companyName ||
    c.contactName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    "—"
  );
}

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientPayment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterClient, setFilterClient] = useState("");

  const { data: payments = [], isLoading } = useQuery<ClientPayment[]>({
    queryKey: ["payments", filterClient],
    queryFn: () =>
      paymentsApi.list(filterClient ? { clientId: filterClient } : undefined),
  });

  const { data: summary } = useQuery({
    queryKey: ["payments", "summary", filterClient],
    queryFn: () => paymentsApi.summary(),
  });

  const { data: openOverview } = useQuery({
    queryKey: ["payments", "open-overview", filterClient || "all"],
    queryFn: () =>
      paymentsApi.openOverview(
        filterClient ? { clientId: filterClient } : undefined
      ),
  });

  const { data: clientsRes } = useQuery({
    queryKey: ["clients", "list"],
    queryFn: () => clientsApi.list({ limit: "500" }),
  });
  const clients = clientsRes?.data ?? [];

  const { data: quotesRes } = useQuery({
    queryKey: ["quotes", form.clientId],
    queryFn: () =>
      quotesApi.list({ clientId: form.clientId, limit: "100" }),
    enabled: Boolean(form.clientId),
  });

  const clientQuotes = quotesRes?.data ?? [];

  useEffect(() => {
    const quoteId = searchParams.get("quoteId");
    if (!quoteId) return;
    setForm((f) => ({ ...f, quoteId }));
    setOpen(true);
  }, [searchParams]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      clientId: filterClient || "",
    });
    setOpen(true);
  };

  const openEdit = (p: ClientPayment) => {
    setEditing(p);
    setForm({
      clientId: p.clientId,
      quoteId: p.quoteId || "",
      label: p.label,
      amount: String(Number(p.amount)),
      paidAt: p.paidAt.slice(0, 10),
      method: p.method,
      reference: p.reference || "",
      notes: p.notes || "",
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        clientId: form.clientId,
        quoteId: form.quoteId || null,
        label: form.label.trim(),
        amount: Number(form.amount),
        paidAt: new Date(form.paidAt).toISOString(),
        method: form.method,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      };
      return editing
        ? paymentsApi.update(editing.id, payload)
        : paymentsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["payments", "open-overview"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["payments", "open-overview"] });
    },
  });

  const totalsByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      map.set(p.clientId, (map.get(p.clientId) ?? 0) + Number(p.amount));
    }
    return map;
  }, [payments]);

  return (
    <>
      <Header title="Pagamenti" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Registra acconti e incassi collegati a clienti e preventivi. Lo stato
            pagamento del preventivo si aggiorna automaticamente.
          </p>
          <PageCreateBar className="mb-0 shrink-0">
            <PageCreateButton
              label={SECTION_CREATE.payment}
              onClick={openCreate}
            />
          </PageCreateBar>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-primary" />
                Incassato (totale)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(summary?.totalReceived ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary?.count ?? 0} movimenti registrati
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                Da incassare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">
                {formatCurrency(openOverview?.summary.openAmount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {openOverview?.open.length ?? 0} documenti ·{" "}
                {openOverview?.schedule.length ?? 0} scadenze aperte
              </p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filtro cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              >
                <option value="">Tutti i clienti</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.contactName || c.email || c.id}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>

        <OpenPaymentsPanel clientId={filterClient || undefined} />

        <Card>
          <CardHeader>
            <CardTitle>Movimenti</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Descrizione</th>
                  <th className="px-4 py-3 text-left">Preventivo</th>
                  <th className="px-4 py-3 text-left">Metodo</th>
                  <th className="px-4 py-3 text-right">Importo</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Caricamento...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nessun pagamento registrato.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(p.paidAt)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {clientLabel(p)}
                      </td>
                      <td className="px-4 py-3">{p.label}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {p.quote?.number || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {paymentMethodLabels[p.method] || p.method}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-green-700 dark:text-green-400">
                        {formatCurrency(Number(p.amount))}
                      </td>
                      <td className="space-x-1 px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Eliminare il pagamento "${p.label}"?`
                              )
                            ) {
                              return;
                            }
                            deleteMut.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {filterClient && totalsByClient.has(filterClient) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Totale filtrato:{" "}
            <strong className="text-foreground">
              {formatCurrency(totalsByClient.get(filterClient) ?? 0)}
            </strong>
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica pagamento" : "Nuovo pagamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Cliente *</label>
              <select
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    clientId: e.target.value,
                    quoteId: "",
                  }))
                }
              >
                <option value="">Seleziona…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.contactName || c.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Preventivo (opzionale)
              </label>
              <select
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={form.quoteId}
                onChange={(e) => setForm((f) => ({ ...f, quoteId: e.target.value }))}
                disabled={!form.clientId}
              >
                <option value="">Nessuno</option>
                {clientQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.number}
                    {q.title ? ` — ${q.title}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Descrizione *
              </label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Acconto all'accettazione"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Importo *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={form.paidAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Metodo</label>
              <select
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabels[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Riferimento</label>
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reference: e.target.value }))
                }
                placeholder="CRO bonifico, ricevuta…"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Note</label>
              <textarea
                className="flex min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={
                saveMut.isPending ||
                !form.clientId ||
                !form.label.trim() ||
                !form.amount
              }
              onClick={() => saveMut.mutate()}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
