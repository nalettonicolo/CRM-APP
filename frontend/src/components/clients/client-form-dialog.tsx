"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/contexts/workspace-context";
import { clientsApi, type Client } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { clientStatusLabels } from "@/lib/labels";

const emptyForm = {
  companyName: "",
  firstName: "",
  lastName: "",
  contactName: "",
  email: "",
  phone: "",
  mobile: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  vatNumber: "",
  fiscalCode: "",
  country: "IT",
  pec: "",
  sdiCode: "",
  notes: "",
  status: "LEAD",
};

type FormState = typeof emptyForm;

function clientToForm(client: Client): FormState {
  return {
    companyName: client.companyName || "",
    firstName: client.firstName || "",
    lastName: client.lastName || "",
    contactName: client.contactName || "",
    email: client.email || "",
    phone: client.phone || "",
    mobile: client.mobile || "",
    address: client.address || "",
    city: client.city || "",
    province: client.province || "",
    postalCode: client.postalCode || "",
    vatNumber: client.vatNumber || "",
    fiscalCode: client.fiscalCode || "",
    country: client.country || "IT",
    pec: client.pec || "",
    sdiCode: client.sdiCode || "",
    notes: client.notes || "",
    status: client.status || "LEAD",
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSaved,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
  /** Prefill when creating (e.g. from search text). */
  defaults?: Partial<FormState>;
}) {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(client ? clientToForm(client) : { ...emptyForm, ...defaults });
    setError("");
    // defaults: apply when dialog opens only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: () =>
      client
        ? clientsApi.update(client.id, form, workspace)
        : clientsApi.create(form, workspace),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: [workspace, "clients"] });
      if (client) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.client(workspace, client.id),
        });
      }
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Modifica cliente" : "Nuovo cliente"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Ragione sociale</label>
            <Input
              value={form.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <Input
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cognome</label>
            <Input
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Referente</label>
            <Input
              value={form.contactName}
              onChange={(e) => setField("contactName", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Telefono</label>
            <Input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cellulare</label>
            <Input
              value={form.mobile}
              onChange={(e) => setField("mobile", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Indirizzo</label>
            <Input
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Città</label>
            <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Provincia</label>
            <Input
              value={form.province}
              onChange={(e) => setField("province", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CAP</label>
            <Input
              value={form.postalCode}
              onChange={(e) => setField("postalCode", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-semibold">Dati fatturazione</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Per documenti di cortesia e fatturazione elettronica: aziende con P.
              IVA, privati con codice fiscale, più PEC o codice destinatario SDI.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">P. IVA</label>
            <Input
              value={form.vatNumber}
              placeholder="Es. 12345678901"
              onChange={(e) => setField("vatNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Codice fiscale</label>
            <Input
              value={form.fiscalCode}
              placeholder="Es. RSSMRA80A01H501U"
              onChange={(e) => setField("fiscalCode", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">PEC</label>
            <Input
              type="email"
              value={form.pec}
              placeholder="cliente@pec.it"
              onChange={(e) => setField("pec", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Codice SDI</label>
            <Input
              value={form.sdiCode}
              placeholder="Es. ABCDEFG o 0000000"
              onChange={(e) => setField("sdiCode", e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nazione</label>
            <Input
              value={form.country}
              placeholder="IT"
              onChange={(e) => setField("country", e.target.value.toUpperCase())}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Stato</label>
            <select
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
            >
              {Object.entries(clientStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Note</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvataggio..." : "Salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
