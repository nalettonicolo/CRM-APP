"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import {
  clientsApi,
  inventoryApi,
  type PaymentTermDraft,
  type Product,
  type Quote,
  type Service,
} from "@/lib/api";
import { PaymentScheduleEditor } from "@/components/quotes/payment-schedule-editor";
import {
  SERVICE_UNIT_OPTIONS,
  serviceUnitLabel,
} from "@/lib/labels";

export type QuoteItemDraft = {
  type: "custom" | "service" | "product";
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  unit?: string;
  serviceId?: string;
  productId?: string;
};

export type QuoteFormPayload = {
  clientId: string;
  title: string;
  notes?: string;
  validUntil?: string;
  eventAt?: string;
  depositPercent?: number;
  depositAmount?: number;
  withholdingTaxPercent?: number;
  withholdingTaxAmount?: number;
  stampDutyAmount?: number;
  paymentTerms?: PaymentTermDraft[];
  items: QuoteItemDraft[];
};

const emptyItem = (): QuoteItemDraft => ({
  type: "custom",
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 22,
});

export function QuoteForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
}: {
  initial?: Quote | null;
  onSubmit: (data: QuoteFormPayload) => void;
  loading?: boolean;
  submitLabel: string;
}) {
  const { data: clientsData } = useQuery({
    queryKey: ["clients", "select"],
    queryFn: () => clientsApi.list({ limit: "200" }),
  });

  const { data: catalogServices = [] } = useQuery({
    queryKey: ["services", "catalog"],
    queryFn: () => inventoryApi.services(),
  });

  const { data: catalogProducts = [] } = useQuery({
    queryKey: ["products", "catalog"],
    queryFn: inventoryApi.products,
  });

  const [pickService, setPickService] = useState("");
  const [pickProduct, setPickProduct] = useState("");

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermDraft[]>([]);
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState("");
  const [withholdingTaxAmount, setWithholdingTaxAmount] = useState("");
  const [stampDutyAmount, setStampDutyAmount] = useState("");
  const [items, setItems] = useState<QuoteItemDraft[]>([emptyItem()]);

  useEffect(() => {
    if (initial) {
      setClientId(initial.clientId || "");
      setTitle(initial.title || "");
      setNotes(initial.notes || "");
      if (initial.paymentTerms?.length) {
        setPaymentTerms(
          initial.paymentTerms.map((t) => ({
            label: t.label,
            note: t.note || undefined,
            percent:
              t.percent != null && Number(t.percent) > 0
                ? Number(t.percent)
                : undefined,
            amount:
              !t.isBalance && Number(t.amount) > 0 && !t.percent
                ? Number(t.amount)
                : undefined,
            isBalance: t.isBalance,
          }))
        );
      } else if (Number(initial.depositAmount) > 0) {
        setPaymentTerms([
          {
            label: "Acconto",
            percent:
              Number(initial.depositPercent) > 0
                ? Number(initial.depositPercent)
                : undefined,
            amount:
              Number(initial.depositPercent) <= 0
                ? Number(initial.depositAmount)
                : undefined,
          },
          {
            label: "Saldo",
            isBalance: true,
          },
        ]);
      } else {
        setPaymentTerms([]);
      }
      if (initial.validUntil) {
        setValidUntil(initial.validUntil.slice(0, 10));
      }
      if (initial.eventAt) {
        setEventAt(initial.eventAt.slice(0, 10));
      }
      if (Number(initial.withholdingTaxPercent) > 0) {
        setWithholdingTaxPercent(String(Number(initial.withholdingTaxPercent)));
      }
      if (Number(initial.withholdingTaxAmount) > 0) {
        setWithholdingTaxAmount(String(Number(initial.withholdingTaxAmount)));
      }
      if (Number(initial.stampDutyAmount) > 0) {
        setStampDutyAmount(String(Number(initial.stampDutyAmount)));
      }
      if (initial.items?.length) {
        setItems(
          initial.items.map((i) => ({
            type: (i.type as QuoteItemDraft["type"]) || "custom",
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            vatRate: Number(i.vatRate),
            unit: i.unit || undefined,
            serviceId: i.serviceId || undefined,
            productId: i.productId || undefined,
          }))
        );
      }
    }
  }, [initial]);

  function updateItem(index: number, patch: Partial<QuoteItemDraft>) {
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addFromService(s: Service) {
    const desc = s.description
      ? `${s.name} — ${s.description}`
      : s.name;
    setItems((rows) => {
      const blank =
        rows.length === 1 && !rows[0].description.trim();
      const row: QuoteItemDraft = {
        type: "service",
        serviceId: s.id,
        description: desc,
        quantity: 1,
        unit: s.unit || undefined,
        unitPrice: Number(s.price),
        vatRate: s.vatExempt ? 0 : Number(s.vatRate ?? 22),
      };
      return blank ? [row] : [...rows, row];
    });
    setPickService("");
  }

  function addFromProduct(p: Product) {
    setItems((rows) => {
      const blank =
        rows.length === 1 && !rows[0].description.trim();
      const row: QuoteItemDraft = {
        type: "product",
        productId: p.id,
        description: p.name,
        quantity: 1,
        unitPrice: Number(p.price),
        vatRate: 22,
      };
      return blank ? [row] : [...rows, row];
    });
    setPickProduct("");
  }

  function lineNet(item: QuoteItemDraft) {
    return item.quantity * item.unitPrice;
  }

  const subtotalNet = items.reduce((sum, item) => sum + lineNet(item), 0);
  const vatTotal = items.reduce(
    (sum, item) => sum + lineNet(item) * (item.vatRate / 100),
    0
  );
  const grandTotal = subtotalNet + vatTotal;
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    onSubmit({
      clientId,
      title,
      notes: notes || undefined,
      validUntil: validUntil
        ? new Date(`${validUntil}T12:00:00`).toISOString()
        : undefined,
      eventAt: eventAt
        ? new Date(`${eventAt}T10:00:00`).toISOString()
        : undefined,
      paymentTerms: paymentTerms
        .filter((t) => t.label.trim())
        .map((t) => ({
          label: t.label.trim(),
          note: t.note?.trim() || undefined,
          percent: t.isBalance ? undefined : t.percent,
          amount: t.isBalance ? undefined : t.amount,
          isBalance: t.isBalance === true,
        })),
      withholdingTaxPercent: withholdingTaxPercent
        ? Number(withholdingTaxPercent)
        : undefined,
      withholdingTaxAmount: withholdingTaxAmount
        ? Number(withholdingTaxAmount)
        : undefined,
      stampDutyAmount: stampDutyAmount ? Number(stampDutyAmount) : undefined,
      items: items.filter((i) => i.description.trim()),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1 block text-sm font-medium">Cliente *</label>
          <select
            required
            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={!!initial}
          >
            <option value="">Seleziona cliente</option>
            {clientsData?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName ||
                  c.contactName ||
                  [c.firstName, c.lastName].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Titolo</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Valido fino al</label>
          <Input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Data evento</label>
          <Input
            type="date"
            value={eventAt}
            onChange={(e) => setEventAt(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Alla conferma del preventivo viene creato un evento in calendario (ore 10:00).
          </p>
        </div>
      </div>

      <PaymentScheduleEditor
        terms={paymentTerms}
        onChange={setPaymentTerms}
        grandTotal={grandTotal}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Ritenuta d&apos;acconto %
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={withholdingTaxPercent}
            onChange={(e) => setWithholdingTaxPercent(e.target.value)}
            placeholder="es. 20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ritenuta importo (€)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={withholdingTaxAmount}
            onChange={(e) => setWithholdingTaxAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Marca da bollo (€)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={stampDutyAmount}
            onChange={(e) => setStampDutyAmount(e.target.value)}
            placeholder="es. 2"
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Voci</h3>
            <p className="text-xs text-muted-foreground">
              <a href="/inventory/services" className="text-primary hover:underline">
                Catalogo servizi
              </a>
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((rows) => [...rows, emptyItem()])}
          >
            <Plus className="h-4 w-4" /> Riga vuota
          </Button>
        </div>
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Catalogo servizi
            </label>
            <div className="flex gap-2">
              <select
                className="flex h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
                value={pickService}
                onChange={(e) => setPickService(e.target.value)}
              >
                <option value="">Seleziona…</option>
                {catalogServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category ? `[${s.category}] ` : ""}
                    {s.name}
                    {s.unit ? ` (${serviceUnitLabel(s.unit)})` : ""}
                    {s.vatExempt ? " · no IVA" : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!pickService}
                onClick={() => {
                  const s = catalogServices.find((x) => x.id === pickService);
                  if (s) addFromService(s);
                }}
              >
                Aggiungi
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Catalogo prodotti
            </label>
            <div className="flex gap-2">
              <select
                className="flex h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
                value={pickProduct}
                onChange={(e) => setPickProduct(e.target.value)}
              >
                <option value="">Seleziona…</option>
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!pickProduct}
                onClick={() => {
                  const p = catalogProducts.find((x) => x.id === pickProduct);
                  if (p) addFromProduct(p);
                }}
              >
                Aggiungi
              </Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Descrizione</th>
                <th className="px-3 py-2 font-medium text-right w-24">Q.tà</th>
                <th className="px-3 py-2 font-medium text-left w-24">U.M.</th>
                <th className="px-3 py-2 font-medium text-right w-28">Prezzo</th>
                <th className="px-3 py-2 font-medium text-right w-20">IVA</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-border/60">
                  <td className="px-3 py-2">
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, { description: e.target.value })
                      }
                      placeholder="Descrizione"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="text-right"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, { quantity: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="flex h-10 w-full min-w-[5rem] rounded-lg border border-border bg-background px-2 text-xs"
                      value={item.unit || ""}
                      onChange={(e) =>
                        updateItem(index, {
                          unit: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {SERVICE_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.value}
                        </option>
                      ))}
                      {item.unit &&
                        !SERVICE_UNIT_OPTIONS.some((o) => o.value === item.unit) && (
                          <option value={item.unit}>{item.unit}</option>
                        )}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <PriceInput
                      value={item.unitPrice}
                      onValueChange={(v) => updateItem(index, { unitPrice: v })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {item.vatRate === 0 ? (
                      <span className="flex h-10 items-center justify-end text-xs text-muted-foreground">
                        Esente
                      </span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        className="text-right"
                        value={item.vatRate}
                        onChange={(e) =>
                          updateItem(index, { vatRate: Number(e.target.value) })
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={items.length <= 1}
                      onClick={() =>
                        setItems((rows) => rows.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Note</label>
        <textarea
          className="flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading || !clientId}>
          {loading ? "Salvataggio..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
