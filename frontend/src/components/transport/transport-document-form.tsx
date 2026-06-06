"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/components/ui/field-label";
import {
  clientsApi,
  inventoryApi,
  quotesApi,
  type TransportDocument,
  type TransportDocumentLine,
} from "@/lib/api";
import {
  TRANSPORT_CARRIER_OPTIONS,
  TRANSPORT_REASON_OPTIONS,
} from "@/lib/transport-document";
import { parseRentalName } from "@/lib/rental-catalog";
import { toDateInputValue } from "@/lib/utils";

export type TransportLineDraft = {
  description: string;
  quantity: string;
  unit: string;
  sku: string;
  notes: string;
};

export type TransportFormState = {
  clientId: string;
  quoteId: string;
  status: string;
  issueDate: string;
  transportStartAt: string;
  reason: string;
  carrier: string;
  carrierName: string;
  vehiclePlate: string;
  driverName: string;
  packagesCount: string;
  grossWeightKg: string;
  appearance: string;
  referenceDoc: string;
  notes: string;
  destinationAddress: string;
  destinationCity: string;
  destinationProvince: string;
  destinationPostalCode: string;
  lines: TransportLineDraft[];
};

const emptyLine = (): TransportLineDraft => ({
  description: "",
  quantity: "1",
  unit: "pz",
  sku: "",
  notes: "",
});

export function emptyTransportForm(): TransportFormState {
  const now = new Date();
  return {
    clientId: "",
    quoteId: "",
    status: "DRAFT",
    issueDate: toDateInputValue(now),
    transportStartAt: "",
    reason: "RENTAL",
    carrier: "SENDER",
    carrierName: "",
    vehiclePlate: "",
    driverName: "",
    packagesCount: "",
    grossWeightKg: "",
    appearance: "A vista",
    referenceDoc: "",
    notes: "",
    destinationAddress: "",
    destinationCity: "",
    destinationProvince: "",
    destinationPostalCode: "",
    lines: [emptyLine()],
  };
}

export function transportFormFromDocument(doc: TransportDocument): TransportFormState {
  return {
    clientId: doc.clientId,
    quoteId: doc.quoteId || "",
    status: doc.status,
    issueDate: toDateInputValue(doc.issueDate),
    transportStartAt: doc.transportStartAt
      ? new Date(doc.transportStartAt).toISOString().slice(0, 16)
      : "",
    reason: doc.reason,
    carrier: doc.carrier,
    carrierName: doc.carrierName || "",
    vehiclePlate: doc.vehiclePlate || "",
    driverName: doc.driverName || "",
    packagesCount:
      doc.packagesCount != null ? String(doc.packagesCount) : "",
    grossWeightKg:
      doc.grossWeightKg != null ? String(Number(doc.grossWeightKg)) : "",
    appearance: doc.appearance || "",
    referenceDoc: doc.referenceDoc || "",
    notes: doc.notes || "",
    destinationAddress: doc.destinationAddress || "",
    destinationCity: doc.destinationCity || "",
    destinationProvince: doc.destinationProvince || "",
    destinationPostalCode: doc.destinationPostalCode || "",
    lines:
      doc.lines.length > 0
        ? doc.lines.map((l) => ({
            description: l.description,
            quantity: String(Number(l.quantity)),
            unit: l.unit || "pz",
            sku: l.sku || "",
            notes: l.notes || "",
          }))
        : [emptyLine()],
  };
}

export function transportFormToPayload(form: TransportFormState) {
  return {
    clientId: form.clientId,
    quoteId: form.quoteId || null,
    status: form.status,
    issueDate: new Date(form.issueDate).toISOString(),
    transportStartAt: form.transportStartAt
      ? new Date(form.transportStartAt).toISOString()
      : null,
    reason: form.reason,
    carrier: form.carrier,
    carrierName: form.carrierName.trim() || null,
    vehiclePlate: form.vehiclePlate.trim() || null,
    driverName: form.driverName.trim() || null,
    packagesCount: form.packagesCount ? Number(form.packagesCount) : null,
    grossWeightKg: form.grossWeightKg ? Number(form.grossWeightKg) : null,
    appearance: form.appearance.trim() || null,
    referenceDoc: form.referenceDoc.trim() || null,
    notes: form.notes.trim() || null,
    destinationAddress: form.destinationAddress.trim() || null,
    destinationCity: form.destinationCity.trim() || null,
    destinationProvince: form.destinationProvince.trim() || null,
    destinationPostalCode: form.destinationPostalCode.trim() || null,
    lines: form.lines
      .filter((l) => l.description.trim())
      .map((l, index) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 0,
        unit: l.unit.trim() || "pz",
        sku: l.sku.trim() || null,
        notes: l.notes.trim() || null,
        sortOrder: index,
      })),
  };
}

export function TransportDocumentForm({
  form,
  setForm,
  showStatus = false,
}: {
  form: TransportFormState;
  setForm: React.Dispatch<React.SetStateAction<TransportFormState>>;
  showStatus?: boolean;
}) {
  const { data: clientsRes } = useQuery({
    queryKey: ["clients", "ddt"],
    queryFn: () => clientsApi.list({ limit: "500" }),
  });
  const clients = clientsRes?.data ?? [];

  const { data: quotesRes } = useQuery({
    queryKey: ["quotes", "ddt", form.clientId],
    queryFn: () => quotesApi.list({ clientId: form.clientId, limit: "100" }),
    enabled: Boolean(form.clientId),
  });
  const clientQuotes = quotesRes?.data ?? [];

  const { data: rentals = [] } = useQuery({
    queryKey: ["rentals", "ddt-form"],
    queryFn: inventoryApi.rentals,
  });

  useEffect(() => {
    if (!form.quoteId || !clientQuotes.length) return;
    const q = clientQuotes.find((x) => x.id === form.quoteId);
    if (q?.eventLocation && !form.destinationAddress) {
      setForm((f) => ({
        ...f,
        destinationAddress: q.eventLocation || f.destinationAddress,
        referenceDoc: f.referenceDoc || `Preventivo ${q.number}`,
      }));
    }
  }, [form.quoteId, clientQuotes, form.destinationAddress, setForm]);

  async function importFromQuote() {
    if (!form.quoteId) return;
    const quote = await quotesApi.get(form.quoteId);
    const lines: TransportLineDraft[] =
      quote.items?.map((item) => ({
        description: item.description,
        quantity: String(Number(item.quantity)),
        unit: item.unit || "pz",
        sku: "",
        notes: "",
      })) ?? [];
    if (!lines.length) return;
    setForm((f) => ({
      ...f,
      lines,
      referenceDoc: f.referenceDoc || `Preventivo ${quote.number}`,
      destinationAddress: f.destinationAddress || quote.eventLocation || "",
    }));
  }

  function importFromRentals() {
    const lines: TransportLineDraft[] = rentals.map((p) => ({
      description: parseRentalName(p.name).model || p.name,
      quantity: "1",
      unit: p.unit || "pz",
      sku: p.sku,
      notes: "",
    }));
    if (!lines.length) return;
    setForm((f) => ({ ...f, lines }));
  }

  function updateLine(index: number, patch: Partial<TransportLineDraft>) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Cliente *
          </label>
          <select
            className={appSelectClass}
            value={form.clientId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                clientId: e.target.value,
                quoteId: "",
              }))
            }
          >
            <option value="">Seleziona cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.contactName || c.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Preventivo collegato
          </label>
          <select
            className={appSelectClass}
            value={form.quoteId}
            disabled={!form.clientId}
            onChange={(e) =>
              setForm((f) => ({ ...f, quoteId: e.target.value }))
            }
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
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Data documento *
          </label>
          <Input
            type="date"
            value={form.issueDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, issueDate: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Inizio trasporto
          </label>
          <Input
            type="datetime-local"
            value={form.transportStartAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, transportStartAt: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Causale trasporto *
          </label>
          <select
            className={appSelectClass}
            value={form.reason}
            onChange={(e) =>
              setForm((f) => ({ ...f, reason: e.target.value }))
            }
          >
            {TRANSPORT_REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Trasporto a cura del *
          </label>
          <select
            className={appSelectClass}
            value={form.carrier}
            onChange={(e) =>
              setForm((f) => ({ ...f, carrier: e.target.value }))
            }
          >
            {TRANSPORT_CARRIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {showStatus && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Stato
            </label>
            <select
              className={appSelectClass}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="DRAFT">Bozza</option>
              <option value="ISSUED">Emesso</option>
              <option value="DELIVERED">Consegnato</option>
              <option value="CANCELLED">Annullato</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Nome vettore"
          value={form.carrierName}
          onChange={(e) =>
            setForm((f) => ({ ...f, carrierName: e.target.value }))
          }
        />
        <Input
          placeholder="Targa veicolo"
          value={form.vehiclePlate}
          onChange={(e) =>
            setForm((f) => ({ ...f, vehiclePlate: e.target.value }))
          }
        />
        <Input
          placeholder="Autista"
          value={form.driverName}
          onChange={(e) =>
            setForm((f) => ({ ...f, driverName: e.target.value }))
          }
        />
        <Input
          placeholder="Riferimento ordine"
          value={form.referenceDoc}
          onChange={(e) =>
            setForm((f) => ({ ...f, referenceDoc: e.target.value }))
          }
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Luogo di destinazione</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Indirizzo destinazione"
            value={form.destinationAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, destinationAddress: e.target.value }))
            }
          />
          <Input
            placeholder="Città"
            value={form.destinationCity}
            onChange={(e) =>
              setForm((f) => ({ ...f, destinationCity: e.target.value }))
            }
          />
          <Input
            placeholder="Provincia"
            value={form.destinationProvince}
            onChange={(e) =>
              setForm((f) => ({ ...f, destinationProvince: e.target.value }))
            }
          />
          <Input
            placeholder="CAP"
            value={form.destinationPostalCode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                destinationPostalCode: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          type="number"
          min="0"
          placeholder="N. colli"
          value={form.packagesCount}
          onChange={(e) =>
            setForm((f) => ({ ...f, packagesCount: e.target.value }))
          }
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Peso lordo (kg)"
          value={form.grossWeightKg}
          onChange={(e) =>
            setForm((f) => ({ ...f, grossWeightKg: e.target.value }))
          }
        />
        <Input
          placeholder="Aspetto beni"
          value={form.appearance}
          onChange={(e) =>
            setForm((f) => ({ ...f, appearance: e.target.value }))
          }
        />
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Righe merce *</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!form.quoteId}
              onClick={() => void importFromQuote()}
            >
              Da preventivo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!rentals.length}
              onClick={importFromRentals}
            >
              Da catalogo noleggio
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))
              }
            >
              <Plus className="h-4 w-4" /> Riga
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {form.lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-12"
            >
              <Input
                className="sm:col-span-5"
                placeholder="Descrizione articolo"
                value={line.description}
                onChange={(e) =>
                  updateLine(index, { description: e.target.value })
                }
              />
              <Input
                className="sm:col-span-2"
                type="number"
                min="0"
                step="0.001"
                placeholder="Q.tà"
                value={line.quantity}
                onChange={(e) =>
                  updateLine(index, { quantity: e.target.value })
                }
              />
              <Input
                className="sm:col-span-1"
                placeholder="U.M."
                value={line.unit}
                onChange={(e) => updateLine(index, { unit: e.target.value })}
              />
              <Input
                className="sm:col-span-2 font-mono text-xs"
                placeholder="SKU"
                value={line.sku}
                onChange={(e) => updateLine(index, { sku: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:col-span-1 text-destructive"
                disabled={form.lines.length <= 1}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    lines: f.lines.filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Input
                className="sm:col-span-12"
                placeholder="Note riga (opzionale)"
                value={line.notes}
                onChange={(e) => updateLine(index, { notes: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Annotazioni documento
        </label>
        <textarea
          className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
    </div>
  );
}
