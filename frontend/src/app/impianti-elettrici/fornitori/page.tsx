"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/components/ui/field-label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publicAssetUrl } from "@/lib/branding";
import { supplierCatalogsApi } from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { formatCurrency } from "@/lib/utils";

export default function IeSupplierCatalogsPage() {
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"PDF" | "PRICE_LIST">("PRICE_LIST");
  const [discount, setDiscount] = useState("0");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemSku, setItemSku] = useState("");

  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ["supplier-catalogs"],
    queryFn: () => supplierCatalogsApi.list(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      supplierCatalogsApi.create({
        supplierName: supplierName.trim(),
        title: title.trim(),
        kind,
        defaultDiscountPercent: Number(discount) || 0,
        items:
          kind === "PRICE_LIST" && itemName && itemPrice
            ? [
                {
                  name: itemName,
                  sku: itemSku || undefined,
                  listPrice: Number(itemPrice) || 0,
                  discountPercent: Number(discount) || 0,
                },
              ]
            : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] });
      setOpen(false);
      setSupplierName("");
      setTitle("");
      setItemName("");
      setItemPrice("");
      setItemSku("");
    },
  });

  const uploadMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      supplierCatalogsApi.uploadPdf(id, file),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] }),
  });

  const createError =
    createMut.error instanceof Error
      ? createMut.error.message
      : createMut.isError
        ? "Creazione fallita"
        : null;
  const uploadError =
    uploadMut.error instanceof Error
      ? uploadMut.error.message
      : uploadMut.isError
        ? "Upload fallito"
        : null;

  return (
    <>
      <IeHeader title="Fornitori e listini" />
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-slate-400">
            Cataloghi ufficiali PDF e listini prezzi con scontistica. Usali come
            riferimento in preventivi e commesse.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo catalogo / listino
          </Button>
        </div>

        {uploadError && (
          <p className="mb-3 text-sm text-red-300">{uploadError}</p>
        )}

        {isLoading ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : catalogs.length === 0 ? (
          <p className="text-slate-400">Nessun catalogo ancora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogs.map((cat) => {
              const disc = Number(cat.defaultDiscountPercent) || 0;
              return (
                <Card
                  key={cat.id}
                  className="border-slate-800 bg-slate-900/50"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-100">
                      {cat.title}
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      {cat.supplierName} ·{" "}
                      {cat.kind === "PDF" ? "Catalogo PDF" : "Listino prezzi"}
                      {disc > 0 ? ` · sconto ${disc}%` : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-400">
                    {cat.kind === "PDF" && (
                      <div className="flex flex-wrap gap-2">
                        {cat.filePath ? (
                          <a
                            href={publicAssetUrl(cat.filePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            Apri PDF ({cat.fileName || "file"})
                          </a>
                        ) : (
                          <span>Nessun PDF caricato</span>
                        )}
                        <div className="w-full max-w-xs space-y-1">
                          <Input
                            type="file"
                            accept="application/pdf,image/*"
                            disabled={uploadMut.isPending}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadMut.mutate({ id: cat.id, file });
                              e.target.value = "";
                            }}
                          />
                          <p className="text-xs text-slate-500">
                            PDF fino a 150 MB
                            {uploadMut.isPending ? " · caricamento…" : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    {cat.kind === "PRICE_LIST" && (
                      <ul className="space-y-1">
                        {cat.items.slice(0, 8).map((item, i) => {
                          const list = Number(item.listPrice) || 0;
                          const d = Number(item.discountPercent) || disc;
                          const net = list * (1 - d / 100);
                          return (
                            <li key={item.id || i}>
                              {item.sku ? `[${item.sku}] ` : ""}
                              {item.name}: {formatCurrency(list)}
                              {d > 0 && (
                                <span className="text-sky-300">
                                  {" "}
                                  → {formatCurrency(net)} (-{d}%)
                                </span>
                              )}
                            </li>
                          );
                        })}
                        {cat.items.length > 8 && (
                          <li>… +{cat.items.length - 8} voci</li>
                        )}
                        {cat.items.length === 0 && <li>Nessuna voce</li>}
                      </ul>
                    )}
                    <Link
                      href={routes.supplierCatalog(cat.id)}
                      className="text-sky-400 hover:underline"
                    >
                      Dettaglio
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo catalogo / listino</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Fornitore *"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <Input
              placeholder="Titolo *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className={appSelectClass}
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "PDF" | "PRICE_LIST")
              }
            >
              <option value="PRICE_LIST">Listino prezzi</option>
              <option value="PDF">Catalogo PDF</option>
            </select>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Sconto % predefinito"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
            {kind === "PRICE_LIST" && (
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="SKU"
                  value={itemSku}
                  onChange={(e) => setItemSku(e.target.value)}
                />
                <Input
                  placeholder="Voce"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Prezzo listino"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                />
              </div>
            )}
            {createError && (
              <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {createError}
                {createError.includes("non trovata") ||
                createError.toLowerCase().includes("cannot")
                  ? " — sul Mint serve aggiornare l’API (git pull + deploy)."
                  : null}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              type="button"
              disabled={
                !supplierName.trim() || !title.trim() || createMut.isPending
              }
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creazione…" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
