"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
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
import { useWorkspace, useWorkspaceRoutes } from "@/contexts/workspace-context";
import { inventoryApi, type Product } from "@/lib/api";
import { SECTION_CREATE } from "@/lib/section-create";
import { skuPrefixForCategory } from "@/lib/rental";
import { formatCurrency } from "@/lib/utils";

const PRODUCT_CATEGORIES = ["Audio", "Luci", "Altro"] as const;

const empty = { name: "", sku: "", price: "", category: "Audio" };

export default function ProductsPage() {
  const router = useRouter();
  const routes = useWorkspaceRoutes();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);

  const openCreateDialog = useCallback(() => {
    setEditing(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    openCreateDialog();
    router.replace(routes.products);
  }, [searchParams, router, openCreateDialog, routes.products]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "sale"],
    queryFn: () => inventoryApi.products({ excludeRental: true }),
  });

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              sku: editing.sku,
              price: String(Number(editing.price)),
              category: editing.category || "",
            }
          : empty
      );
    }
  }, [open, editing]);

  const categoryForSku =
    form.category === "Altro" ? undefined : form.category || "Audio";

  const { data: nextSkuData } = useQuery({
    queryKey: ["next-sku", categoryForSku ?? "prd"],
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
        name: form.name,
        ...(editing
          ? { sku: form.sku.trim() || editing.sku }
          : form.sku.trim()
            ? { sku: form.sku.trim() }
            : {}),
        price: Number(form.price),
        category:
          form.category && form.category !== "Altro"
            ? form.category
            : undefined,
      };
      return editing
        ? inventoryApi.updateProduct(editing.id, payload)
        : inventoryApi.createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const [deleteError, setDeleteError] = useState("");

  const deleteMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteProduct(id),
    onSuccess: () => {
      setDeleteError("");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) =>
      setDeleteError(e.message || "Impossibile eliminare il prodotto."),
  });

  return (
    <>
      <WorkspaceHeader title="Prodotti" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={routes.inventory} className="text-primary hover:underline">
            ← Magazzino
          </Link>
          {workspace === "crm" && (
            <Link href="/inventory/rentals" className="text-primary hover:underline">
              Catalogo noleggio →
            </Link>
          )}
          <Link href={routes.services} className="text-primary hover:underline">
            Catalogo servizi →
          </Link>
        </div>
        {deleteError && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Catalogo prodotti</CardTitle>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> {SECTION_CREATE.product}
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-right">Prezzo</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Caricamento...
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3">{p.category || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(Number(p.price))}
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
                                `Eliminare il prodotto "${p.name}"? Le righe preventivo collegate resteranno senza riferimento al catalogo.`
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Audio → <strong>AUD</strong>, Luci → <strong>LUC</strong>, altro →{" "}
                <strong>PRD</strong>
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
                  Prossimo: {skuPrefixForCategory(categoryForSku)}-####
                </p>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder="Prezzo"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!form.name || saveMut.isPending}
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
