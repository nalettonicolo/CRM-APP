"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  paymentTermTemplatesApi,
  type PaymentTermDraft,
  type PaymentTermTemplate,
} from "@/lib/api";

const emptyItem = (): PaymentTermDraft => ({
  label: "",
  note: "",
  isBalance: false,
});

export default function PaymentTermsSettingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentTermTemplate | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [items, setItems] = useState<PaymentTermDraft[]>([emptyItem()]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["payment-term-templates"],
    queryFn: paymentTermTemplatesApi.list,
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setIsDefault(editing.isDefault);
        setItems(
          editing.items.map((i) => ({
            label: i.label,
            note: i.note || undefined,
            percent: i.percent != null ? Number(i.percent) : undefined,
            amount: i.amount != null ? Number(i.amount) : undefined,
            isBalance: i.isBalance,
          }))
        );
      } else {
        setName("");
        setIsDefault(false);
        setItems([
          {
            label: "Acconto all'accettazione",
            note: "Alla conferma del preventivo",
            percent: 30,
          },
          {
            label: "Saldo a fine lavori",
            note: "A conclusione del servizio",
            isBalance: true,
          },
        ]);
      }
    }
  }, [open, editing]);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        isDefault,
        items: items.filter((i) => i.label.trim()),
      };
      return editing
        ? paymentTermTemplatesApi.update(editing.id, payload)
        : paymentTermTemplatesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-term-templates"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => paymentTermTemplatesApi.delete(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["payment-term-templates"] }),
  });

  function updateItem(index: number, patch: Partial<PaymentTermDraft>) {
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  return (
    <>
      <Header title="Modelli piano di pagamento" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link href="/settings" className="text-sm text-primary hover:underline">
          ← Impostazioni
        </Link>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Crea testi riutilizzabili per acconti e saldi. Nei preventivi usa
          &quot;Carica modello&quot; nel piano di pagamento.
        </p>

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Modelli salvati</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuovo modello
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground">Caricamento…</p>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground">
                Nessun modello. Creane uno o esegui il seed sul server.
              </p>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {t.name}
                      {t.isDefault && (
                        <span className="ml-2 text-xs text-primary">
                          (predefinito)
                        </span>
                      )}
                    </p>
                    <ul className="mt-1 text-sm text-muted-foreground">
                      {t.items.map((i, idx) => (
                        <li key={idx}>
                          {i.label}
                          {i.note ? ` — ${i.note}` : ""}
                          {i.isBalance
                            ? " (saldo)"
                            : i.percent
                              ? ` (${Number(i.percent)}%)`
                              : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      Modifica
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteMut.mutate(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica modello" : "Nuovo modello"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome modello (es. Standard eventi)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Modello predefinito (proposto per primi)
            </label>
            {items.map((item, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Titolo rata"
                    value={item.label}
                    onChange={(e) =>
                      updateItem(index, { label: e.target.value })
                    }
                  />
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
                </div>
                <Input
                  placeholder="Testo descrittivo (opzionale)"
                  value={item.note || ""}
                  onChange={(e) =>
                    updateItem(index, { note: e.target.value || undefined })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="%"
                    disabled={item.isBalance}
                    value={item.percent ?? ""}
                    onChange={(e) =>
                      updateItem(index, {
                        percent: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                        amount: undefined,
                      })
                    }
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={item.isBalance === true}
                      onChange={(e) =>
                        updateItem(index, {
                          isBalance: e.target.checked,
                          percent: e.target.checked ? undefined : item.percent,
                          amount: e.target.checked ? undefined : item.amount,
                        })
                      }
                    />
                    Saldo (residuo)
                  </label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((rows) => [...rows, emptyItem()])}
            >
              <Plus className="h-4 w-4" /> Aggiungi rata al modello
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!name.trim() || saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              Salva modello
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
