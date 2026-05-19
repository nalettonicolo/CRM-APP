"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inventoryApi, type Service } from "@/lib/api";
import {
  SERVICE_UNIT_OPTIONS,
  serviceUnitLabel,
} from "@/lib/labels";
import { cn, formatCurrency } from "@/lib/utils";

const UNIT_CUSTOM = "__custom__";
const ADD_CATEGORY = "__add_category__";

const empty = {
  name: "",
  category: "",
  description: "",
  price: "",
  unit: "ora",
  customUnit: "",
  vatExempt: false,
  vatRate: "22",
  duration: "",
};

function unitToForm(unit?: string | null) {
  if (!unit) return { unit: "", customUnit: "" };
  if (SERVICE_UNIT_OPTIONS.some((o) => o.value === unit)) {
    return { unit, customUnit: "" };
  }
  return { unit: UNIT_CUSTOM, customUnit: unit };
}

function resolveUnit(unit: string, customUnit: string) {
  if (unit === UNIT_CUSTOM) return customUnit.trim() || undefined;
  return unit.trim() || undefined;
}

export default function ServicesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);
  const [addingCategory, setAddingCategory] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", "all"],
    queryFn: () => inventoryApi.services({ all: true }),
  });

  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      const c = s.category?.trim();
      if (c) set.add(c);
    }
    return set;
  }, [services]);

  const categoryOptions = useMemo(() => {
    const set = new Set(existingCategories);
    const current = form.category.trim();
    if (current) set.add(current);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [existingCategories, form.category]);

  useEffect(() => {
    if (open) {
      if (editing) {
        const u = unitToForm(editing.unit);
        const cat = editing.category?.trim() || "";
        setForm({
          name: editing.name,
          category: cat,
          description: editing.description || "",
          price: String(Number(editing.price)),
          unit: u.unit,
          customUnit: u.customUnit,
          vatExempt: editing.vatExempt === true,
          vatRate: editing.vatExempt
            ? "0"
            : String(Number(editing.vatRate ?? 22)),
          duration:
            editing.duration != null ? String(editing.duration) : "",
        });
        setAddingCategory(Boolean(cat) && !existingCategories.has(cat));
      } else {
        setForm(empty);
        setAddingCategory(false);
      }
    }
  }, [open, editing, existingCategories]);

  useEffect(() => {
    if (!open) setAddingCategory(false);
  }, [open]);

  const saveMut = useMutation({
    mutationFn: () => {
      const unit = resolveUnit(form.unit, form.customUnit);
      const payload = {
        name: form.name,
        category: form.category || undefined,
        description: form.description || undefined,
        price: Number(form.price),
        unit,
        vatExempt: form.vatExempt,
        vatRate: form.vatExempt ? 0 : Number(form.vatRate) || 22,
        duration: form.duration ? Number(form.duration) : undefined,
      };
      return editing
        ? inventoryApi.updateService(editing.id, payload)
        : inventoryApi.createService(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: (s: Service) =>
      inventoryApi.updateService(s.id, { isActive: !s.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  const [deleteError, setDeleteError] = useState("");

  const deleteMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteService(id),
    onSuccess: () => {
      setDeleteError("");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: Error) =>
      setDeleteError(e.message || "Impossibile eliminare il servizio."),
  });

  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.category || "Senza categoria";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <Header title="Catalogo servizi" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link href="/inventory" className="text-sm text-primary hover:underline">
          ← Magazzino
        </Link>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Definisci prezzo unitario, unità di misura (ora, km, giornata…) e se la
          voce è esente da IVA. Nei preventivi la quantità segue l&apos;unità (es.
          120 km × 0,50 €).
        </p>
        {deleteError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Servizi</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuovo servizio
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-muted-foreground">
                Caricamento...
              </p>
            ) : services.length === 0 ? (
              <p className="px-4 py-8 text-center text-muted-foreground">
                Nessun servizio. Aggiungi il primo dal pulsante sopra.
              </p>
            ) : (
              Object.keys(grouped)
                .sort((a, b) => a.localeCompare(b, "it"))
                .map((cat) => (
                  <div key={cat}>
                    <p className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat}
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-2 text-left">Nome</th>
                          <th className="hidden px-4 py-2 text-left sm:table-cell">
                            Descrizione
                          </th>
                          <th className="px-4 py-2 text-left">Unità</th>
                          <th className="px-4 py-2 text-right">Prezzo</th>
                          <th className="px-4 py-2 text-right">IVA</th>
                          <th className="px-4 py-2 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[cat].map((s) => (
                          <tr
                            key={s.id}
                            className={cn(
                              "border-b border-border",
                              s.isActive === false && "opacity-50"
                            )}
                          >
                            <td className="px-4 py-3 font-medium">{s.name}</td>
                            <td className="hidden max-w-xs truncate px-4 py-3 text-muted-foreground sm:table-cell">
                              {s.description || "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {serviceUnitLabel(s.unit) || "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatCurrency(Number(s.price))}
                              {s.unit ? (
                                <span className="text-xs text-muted-foreground">
                                  /{s.unit}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {s.vatExempt ? (
                                <span className="text-xs text-muted-foreground">
                                  Esente
                                </span>
                              ) : (
                                `${Number(s.vatRate ?? 22)}%`
                              )}
                            </td>
                            <td className="space-x-1 px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(s);
                                  setOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hidden text-xs sm:inline-flex"
                                onClick={() => toggleMut.mutate(s)}
                              >
                                {s.isActive === false ? "Attiva" : "Disattiva"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Elimina"
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      `Eliminare il servizio "${s.name}"? Le righe preventivo collegate resteranno senza riferimento al catalogo.`
                                    )
                                  ) {
                                    return;
                                  }
                                  deleteMut.mutate(s.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica servizio" : "Nuovo servizio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome (es. Servizio tecnico)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium">
                Categoria servizio
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={
                  addingCategory
                    ? ADD_CATEGORY
                    : form.category || ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === ADD_CATEGORY) {
                    setAddingCategory(true);
                    setForm((f) => ({ ...f, category: "" }));
                    return;
                  }
                  setAddingCategory(false);
                  setForm((f) => ({ ...f, category: v }));
                }}
              >
                <option value="">— Seleziona categoria —</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={ADD_CATEGORY} className="font-medium text-primary">
                  + Aggiungi Categoria Servizio
                </option>
              </select>
              {addingCategory && (
                <Input
                  className="mt-2"
                  placeholder="Nome nuova categoria (es. Manodopera, Trasferte)"
                  value={form.category}
                  autoFocus
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              )}
            </div>
            <Input
              placeholder="Descrizione (opzionale, in preventivo)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />

            <div>
              <label className="mb-1 block text-sm font-medium">
                Unità di misura
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
              >
                <option value="">— Nessuna —</option>
                {SERVICE_UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value={UNIT_CUSTOM}>Altro (personalizzata)</option>
              </select>
              {form.unit === UNIT_CUSTOM && (
                <Input
                  className="mt-2"
                  placeholder="Es. pacco, lotto, %"
                  value={form.customUnit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customUnit: e.target.value }))
                  }
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Prezzo unitario €
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">IVA %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  disabled={form.vatExempt}
                  value={form.vatExempt ? "0" : form.vatRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vatRate: e.target.value }))
                  }
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={form.vatExempt}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    vatExempt: e.target.checked,
                    vatRate: e.target.checked ? "0" : f.vatRate || "22",
                  }))
                }
              />
              <span>Esente da IVA / senza IVA</span>
            </label>

            <Input
              type="number"
              placeholder="Durata stimata (minuti, opzionale)"
              value={form.duration}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={
                !form.name ||
                saveMut.isPending ||
                (form.unit === UNIT_CUSTOM && !form.customUnit.trim())
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
