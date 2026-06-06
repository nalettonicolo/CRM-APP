"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListCard } from "@/components/ui/list-card";
import { appSelectClass } from "@/components/ui/field-label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inventoryApi, type Product } from "@/lib/api";
import {
  RENTAL_DEPARTMENTS,
  RENTAL_FAMILIES,
  RENTAL_UNIT,
  formatRentalName,
  groupRentalCatalog,
  matchesRentalFilter,
  parseRentalName,
  rentalDepartmentFromCategory,
  rentalDepartmentId,
  rentalFamilyLabel,
  skuPrefixForCategory,
  type RentalDepartmentId,
  type RentalFilter,
} from "@/lib/rental-catalog";
import { SECTION_CREATE } from "@/lib/section-create";
import { cn, formatCurrency } from "@/lib/utils";

const FILTER_TABS: { id: RentalFilter; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "audio", label: "Audio" },
  { id: "luci", label: "Luci" },
  { id: "video", label: "Video" },
  { id: "strutture", label: "Strutture" },
  { id: "altro", label: "Altro" },
];

const emptyForm = {
  departmentId: "audio" as RentalDepartmentId,
  family: RENTAL_FAMILIES.audio[0],
  modelName: "",
  sku: "",
  price: "",
  description: "",
};

function DepartmentIcon({ id }: { id: RentalDepartmentId | "altro" }) {
  if (id === "audio") return <Headphones className="h-4 w-4" />;
  if (id === "luci") return <Lightbulb className="h-4 w-4" />;
  return null;
}

function RentalRowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function RentalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<RentalFilter>("all");
  const [search, setSearch] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const openCreateDialog = useCallback((departmentId?: RentalDepartmentId) => {
    setEditing(null);
    setForm({
      ...emptyForm,
      departmentId: departmentId ?? "audio",
      family: RENTAL_FAMILIES[departmentId ?? "audio"][0],
    });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const dept = searchParams.get("dept");
    const validDept = RENTAL_DEPARTMENTS.find((d) => d.id === dept)?.id;
    openCreateDialog(validDept);
    router.replace("/inventory/rentals");
  }, [searchParams, router, openCreateDialog]);

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ["rentals"],
    queryFn: inventoryApi.rentals,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rentals.filter((p) => {
      if (!matchesRentalFilter(p, filter)) return false;
      if (!q) return true;
      const family = rentalFamilyLabel(p.name);
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (family?.toLowerCase().includes(q) ?? false) ||
        (p.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rentals, filter, search]);

  const grouped = useMemo(() => groupRentalCatalog(filtered), [filtered]);

  const counts = useMemo(() => {
    const map = new Map<RentalFilter, number>([["all", rentals.length]]);
    for (const p of rentals) {
      const id = rentalDepartmentId(p.category);
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [rentals]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const dept = rentalDepartmentFromCategory(editing.category);
      const { family, model } = parseRentalName(editing.name);
      setForm({
        departmentId: (dept?.id ?? "audio") as RentalDepartmentId,
        family:
          family ||
          RENTAL_FAMILIES[(dept?.id ?? "audio") as RentalDepartmentId][0],
        modelName: model || editing.name,
        sku: editing.sku,
        price: String(Number(editing.price)),
        description: editing.description || "",
      });
    }
  }, [open, editing]);

  const department = RENTAL_DEPARTMENTS.find((d) => d.id === form.departmentId);
  const categoryForSku = department?.category ?? "Noleggio - Audio";

  const { data: nextSkuData } = useQuery({
    queryKey: ["next-sku", categoryForSku],
    queryFn: () => inventoryApi.nextSku(categoryForSku),
    enabled: open && !editing,
  });

  useEffect(() => {
    if (!open || editing || !nextSkuData?.sku) return;
    setForm((f) => ({ ...f, sku: nextSkuData.sku }));
  }, [open, editing, nextSkuData?.sku]);

  const previewName = formatRentalName(form.family, form.modelName);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = {
        name: previewName.trim(),
        ...(editing
          ? { sku: form.sku.trim() || editing.sku }
          : form.sku.trim()
            ? { sku: form.sku.trim() }
            : {}),
        price: Number(form.price),
        category: categoryForSku,
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

  const familyOptions = RENTAL_FAMILIES[form.departmentId];

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
          Catalogo professionale a reparti <strong>Audio</strong> e{" "}
          <strong>Luci</strong> (codici <strong>AUD</strong> / <strong>LUC</strong>),
          con famiglie tecniche e prezzo <strong>€/gg</strong> modificabile in
          preventivo.
        </p>

        {deleteError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}

        <Card className="mt-4">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Catalogo noleggio</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreateDialog("audio")}
                >
                  <Plus className="h-4 w-4" /> Audio
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreateDialog("luci")}
                >
                  <Plus className="h-4 w-4" /> Luci
                </Button>
                <Button size="sm" onClick={() => openCreateDialog()}>
                  <Plus className="h-4 w-4" /> {SECTION_CREATE.rental}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TABS.map((tab) => {
                  const count =
                    tab.id === "all"
                      ? rentals.length
                      : (counts.get(tab.id) ?? 0);
                  if (tab.id === "altro" && count === 0) return null;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                        filter === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {tab.label}
                      <span className="ml-1 tabular-nums opacity-80">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <Input
                placeholder="Cerca nome, SKU, famiglia…"
                className="sm:max-w-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Caricamento…
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {rentals.length === 0
                  ? "Nessun articolo a noleggio. Aggiungi il primo con i pulsanti sopra."
                  : "Nessun risultato per i filtri selezionati."}
              </p>
            ) : (
              <>
                <div className="space-y-4 p-3 md:hidden">
                  {grouped.map((group) => (
                    <div key={group.departmentId}>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            group.badgeClass
                          )}
                        >
                          <DepartmentIcon id={group.departmentId} />
                          {group.departmentLabel}
                        </span>
                      </div>
                      {group.families.map(({ family, items }) => (
                        <div key={family} className="mb-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {family}
                          </p>
                          {items.map((p) => (
                            <ListCard key={p.id}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {p.sku}
                                  </p>
                                  <p className="mt-1 font-semibold leading-snug">
                                    {parseRentalName(p.name).model || p.name}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-medium tabular-nums">
                                  {formatCurrency(Number(p.price))}
                                  <span className="text-xs text-muted-foreground">
                                    /gg
                                  </span>
                                </span>
                              </div>
                              <div className="mt-3">
                                <RentalRowActions
                                  product={p}
                                  onEdit={() => {
                                    setEditing(p);
                                    setOpen(true);
                                  }}
                                  onDelete={() => {
                                    if (
                                      !window.confirm(
                                        `Eliminare "${p.name}" dal catalogo noleggio?`
                                      )
                                    ) {
                                      return;
                                    }
                                    deleteMut.mutate(p.id);
                                  }}
                                />
                              </div>
                            </ListCard>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="hidden divide-y divide-border md:block">
                  {grouped.map((group) => (
                    <div key={group.departmentId}>
                      <div className="flex items-center gap-2 bg-muted/40 px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            group.badgeClass
                          )}
                        >
                          <DepartmentIcon id={group.departmentId} />
                          {group.departmentLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {group.families.reduce((n, f) => n + f.items.length, 0)}{" "}
                          articoli
                        </span>
                      </div>
                      {group.families.map(({ family, items }) => (
                        <div key={family}>
                          <p className="border-b border-border/60 bg-muted/15 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                            {family}
                          </p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-muted/10">
                                <th className="px-4 py-2 text-left">Articolo</th>
                                <th className="px-4 py-2 text-left">SKU</th>
                                <th className="px-4 py-2 text-right">€/gg</th>
                                <th className="w-24 px-4 py-2 text-right">
                                  Azioni
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((p) => (
                                <tr
                                  key={p.id}
                                  className="border-b border-border/60"
                                >
                                  <td className="px-4 py-3 font-medium">
                                    {parseRentalName(p.name).model || p.name}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs">
                                    {p.sku}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums">
                                    {formatCurrency(Number(p.price))}
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      /gg
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <RentalRowActions
                                      product={p}
                                      onEdit={() => {
                                        setEditing(p);
                                        setOpen(true);
                                      }}
                                      onDelete={() => {
                                        if (
                                          !window.confirm(
                                            `Eliminare "${p.name}" dal catalogo noleggio?`
                                          )
                                        ) {
                                          return;
                                        }
                                        deleteMut.mutate(p.id);
                                      }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica articolo noleggio" : "Nuovo articolo noleggio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Reparto *
              </label>
              <select
                className={appSelectClass}
                value={form.departmentId}
                onChange={(e) => {
                  const id = e.target.value as RentalDepartmentId;
                  setForm((f) => ({
                    ...f,
                    departmentId: id,
                    family: RENTAL_FAMILIES[id][0],
                  }));
                }}
              >
                {RENTAL_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} — codice {d.skuPrefix}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Famiglia tecnica *
              </label>
              <select
                className={appSelectClass}
                value={form.family}
                onChange={(e) =>
                  setForm((f) => ({ ...f, family: e.target.value }))
                }
              >
                {familyOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Modello / descrizione breve *
              </label>
              <Input
                placeholder="Es. RCF ART 912-A — cassa attiva 12″"
                value={form.modelName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, modelName: e.target.value }))
                }
              />
              {previewName && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  In catalogo: <strong>{previewName}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                SKU {editing ? "" : "(automatico)"}
              </label>
              <Input
                value={form.sku}
                readOnly={!editing}
                className={cn("font-mono", !editing && "bg-muted")}
                onChange={
                  editing
                    ? (e) => setForm((f) => ({ ...f, sku: e.target.value }))
                    : undefined
                }
              />
              {!editing && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Prossimo: {skuPrefixForCategory(categoryForSku)}-####
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Prezzo al giorno (€/gg) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>

            <Input
              placeholder="Note tecniche (opzionale)"
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
                !form.modelName.trim() ||
                !form.family.trim() ||
                !form.price ||
                saveMut.isPending
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
