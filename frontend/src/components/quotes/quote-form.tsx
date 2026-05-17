"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientsApi, type Quote } from "@/lib/api";

export type QuoteItemDraft = {
  type: "custom" | "service" | "product";
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
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
  onSubmit: (data: {
    clientId: string;
    title: string;
    notes?: string;
    items: QuoteItemDraft[];
  }) => void;
  loading?: boolean;
  submitLabel: string;
}) {
  const { data: clientsData } = useQuery({
    queryKey: ["clients", "select"],
    queryFn: () => clientsApi.list({ limit: "200" }),
  });

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItemDraft[]>([emptyItem()]);

  useEffect(() => {
    if (initial) {
      setClientId(initial.clientId || "");
      setTitle(initial.title || "");
      setNotes(initial.notes || "");
      if (initial.items?.length) {
        setItems(
          initial.items.map((i) => ({
            type: (i.type as QuoteItemDraft["type"]) || "custom",
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            vatRate: Number(i.vatRate),
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

  function lineTotal(item: QuoteItemDraft) {
    return item.quantity * item.unitPrice * (1 + item.vatRate / 100);
  }

  const grandTotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    onSubmit({
      clientId,
      title,
      notes: notes || undefined,
      items: items.filter((i) => i.description.trim()),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
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
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Voci</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((rows) => [...rows, emptyItem()])}
          >
            <Plus className="h-4 w-4" /> Riga
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Descrizione</th>
                <th className="px-3 py-2 font-medium text-right w-20">Q.tà</th>
                <th className="px-3 py-2 font-medium text-right w-28">Prezzo</th>
                <th className="px-3 py-2 font-medium text-right w-20">IVA %</th>
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
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="text-right"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, { unitPrice: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      className="text-right"
                      value={item.vatRate}
                      onChange={(e) =>
                        updateItem(index, { vatRate: Number(e.target.value) })
                      }
                    />
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
        <p className="mt-2 text-right text-sm font-medium tabular-nums">
          Totale indicativo (lordo): €{" "}
          {grandTotal.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
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
