"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { inventoryApi, type Product } from "@/lib/api";
import {
  RENTAL_CATEGORY_OPTIONS,
  RENTAL_CATEGORY_PREFIX,
  RENTAL_UNIT,
  skuPrefixForCategory,
} from "@/lib/rental";
import { SECTION_CREATE } from "@/lib/section-create";
import { formatCurrency } from "@/lib/utils";

const ADD_CATEGORY = "__add_category__";

const empty = {
  name: "",
  sku: "",
  price: "",
  category: RENTAL_CATEGORY_PREFIX,
  description: "",
};

export default function RentalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [addingCategory, setAddingCategory] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openCreateDialog = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    openCreateDialog();
    router.replace("/inventory/rentals");
  }, [searchParams, router, openCreateDialog]);

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["rentals"],
    queryFn: inventoryApi.rentals,
  });

  const existingCategories = useMemo(() => {
    const set = new Set<string>(RENTAL_CATEGORY_OPTIONS);
    for (const p of rentals) {
      const c = p.category?.trim();
      if (c) set.add(c);
    }
    return set;
  }, [rentals]);

  const categoryOptions = useMemo(() => {
    const set = new Set(existingCategories);
    const current = form.category.trim();
    if (current) set.add(current);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [existingCategories, form.category]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of rentals) {
      const key = p.category?.trim() || RENTAL_CATEGORY_PREFIX;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "it")
    );
  }, [rentals]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        sku: editing.sku,
        price: String(Number(editing.price)),
        category: editing.category?.trim() || RENTAL_CATEGORY_PREFIX,
        description: editing.description || "",
      });
      const cat = editing.category?.trim() || "";
      setAddingCategory(Boolean(cat) && !RENTAL_CATEGORY_OPTIONS.includes(cat as (typeof RENTAL_CATEGORY_OPTIONS)[number]));
    } else {
      setForm(empty);
      setAddingCategory(false);
    }
  }, [open, editing]);

  const categoryForSku = form.category.trim() || RENTAL_CATEGORY_PREFIX;

  const { data: nextSkuData } = useQuery({
    queryKey: ["next-sku", categoryForSku],
    queryFn: () => inventoryApi.nextSku(categoryForSku),
    enabled: open && !editing,
  });

  useEffect(() => {
    if (!open || editing || !nextSkuData?.sku) return;
    setForm((f) => ({ ...f, sku: nextSkuData.sku }));
  }, [open, editing, nextSkuData?.sku]);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        ...(editing
          ? { sku: form.sku.trim() || editing.sku }
          : form.sku.trim()
            ? { sku: form.sku.trim() }
            : {}),
        price: Number(form.price),
        category: form.category.trim() || RENTAL_CATEGORY_PREFIX,
        description: form.description.trim() || undefined,
        isRentable: true,
        unit: RENTAL_UNIT,
      };
      return editing
        ? inventoryApi.updateProduct(editing.id, payload)
        : inventoryApi.createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteProduct(id),
    onSuccess: () => {
      setDeleteError("");
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) =>
      setDeleteError(e.message || "Impossibile eliminare l'articolo."),
  });

  return (
    <>
      <Header title="Noleggio" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/inventory" className="text-primary hover:underline">
            ← Magazzino
          </Link>
          <Link href="/inventory/products" className="text-primary hover:underline">
            Catalogo prodotti →
          </Link>
          <Link
            href="/inventory/rentals/preparation"
            className="text-primary hover:underline"
          >
            Lista preparazione
          </Link>
          <Link href="/inventory/print" className="text-primary hover:underline">
            Stampa
          </Link>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Articoli a noleggio con <strong>prezzo al giorno (€/gg)</strong>. In
          fase di preventivo il prezzo resta sempre modificabile riga per riga.
        </p>

        {deleteError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}

        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Catalogo noleggio</CardTitle>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> {SECTION_CREATE.rental}
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Caricamento…
              </p>
            ) : rentals.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nessun articolo a noleggio. Aggiungi il primo con il pulsante sopra.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {grouped.map(([category, items]) => (
                  <div key={category}>
                    <p className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category}
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-2 text-left">Nome</th>
                          <th className="px-4 py-2 text-left">SKU</th>
                          <th className="px-4 py-2 text-right">€/gg</th>
                          <th className="px-4 py-2 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((p) => (
                          <tr key={p.id} className="border-b border-border/60">
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatCurrency(Number(p.price))}
                              <span className="ml-1 text-xs text-muted-foreground">
                                /gg
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(p);
                                  setOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      `Eliminare "${p.name}" dal catalogo noleggio?`
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica articolo noleggio" : "Nuovo articolo noleggio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome articolo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              {addingCategory ? (
                <Input
                  placeholder="Es. Noleggio - Audio"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              ) : (
                <select
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={
                    categoryOptions.includes(form.category)
                      ? form.category
                      : ADD_CATEGORY
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === ADD_CATEGORY) {
                      setAddingCategory(true);
                      setForm((f) => ({ ...f, category: "" }));
                      return;
                    }
                    setForm((f) => ({ ...f, category: v }));
                  }}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={ADD_CATEGORY}>+ Nuova categoria…</option>
                </select>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Audio → codice <strong>AUD</strong>, Luci → codice <strong>LUC</strong>
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                SKU {editing ? "" : "(automatico)"}
              </label>
              <Input
                value={form.sku}
                readOnly={!editing}
                className={!editing ? "bg-muted font-mono" : "font-mono"}
                onChange={
                  editing
                    ? (e) => setForm((f) => ({ ...f, sku: e.target.value }))
                    : undefined
                }
              />
              {!editing && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Prossimo: {skuPrefixForCategory(form.category)}-####
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Prezzo al giorno (€/gg)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Descrizione (opzionale)"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={
                !form.name.trim() || !form.price || saveMut.isPending
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
