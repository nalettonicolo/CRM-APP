"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2 } from "lucide-react";
import { CatalogDualUpload } from "@/components/ie/catalog-dual-upload";
import { CatalogStatusBadges } from "@/components/ie/catalog-status-badges";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { publicAssetUrl } from "@/lib/branding";
import {
  supplierCatalogsApi,
  type SupplierCatalogFile,
  type SupplierCatalogItem,
} from "@/lib/api";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { cn, formatCurrency } from "@/lib/utils";

function CatalogItemEditableRow({
  item,
  catalogDiscount,
  busy,
  onSaveList,
  onSaveSell,
  onDelete,
}: {
  item: SupplierCatalogItem;
  catalogDiscount: number;
  busy: boolean;
  onSaveList: (listPrice: number) => void;
  onSaveSell: (sellPrice: number | null) => void;
  onDelete: () => void;
}) {
  const list = Number(item.listPrice) || 0;
  const d = Number(item.discountPercent) || catalogDiscount;
  const net = list * (1 - d / 100);
  const sell =
    item.sellPrice != null && item.sellPrice !== ""
      ? Number(item.sellPrice)
      : null;

  return (
    <tr className="border-b border-slate-800/60">
      <td className="py-2 font-mono text-xs">{item.sku || "—"}</td>
      <td className="text-xs text-sky-300/90">{item.productLine || "—"}</td>
      <td className="max-w-[280px] truncate" title={item.name}>
        {item.name}
      </td>
      <td className="py-1.5 text-right">
        <PriceInput
          value={list}
          disabled={busy}
          className="h-8 border-slate-700 bg-slate-950 text-xs"
          onValueChange={(v) => {
            if (v !== list) onSaveList(v);
          }}
        />
      </td>
      <td className="text-right text-sky-300 tabular-nums">
        {formatCurrency(net)}
      </td>
      <td className="py-1.5 text-right">
        <PriceInput
          value={sell ?? list}
          disabled={busy}
          className="h-8 border-emerald-900/50 bg-emerald-950/20 text-xs"
          title={
            sell == null
              ? "Non impostato: in preventivo usa il listino. Modifica per fissare il prezzo cliente."
              : "Prezzo cliente salvato sul catalogo"
          }
          onValueChange={(v) => {
            const next = v;
            if (sell == null && next === list) return;
            if (sell != null && next === sell) return;
            onSaveSell(next);
          }}
        />
      </td>
      <td className="py-1.5 text-right">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={busy}
          className="h-8 w-8 text-slate-400 hover:text-red-300"
          onClick={onDelete}
          aria-label="Elimina voce"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

export default function IeSupplierCatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const backfillTried = useRef(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadingRole, setUploadingRole] = useState<
    "PRICE_LIST" | "CATALOG" | null
  >(null);
  const [lineFilter, setLineFilter] = useState("Tutte");
  const [itemQuery, setItemQuery] = useState("");
  const [debouncedItemQuery, setDebouncedItemQuery] = useState("");
  const [showCatalogPreview, setShowCatalogPreview] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedItemQuery(itemQuery.trim()),
      250
    );
    return () => window.clearTimeout(t);
  }, [itemQuery]);

  const { data: linesData } = useQuery({
    queryKey: ["supplier-catalog-lines", id],
    queryFn: () => supplierCatalogsApi.productLines(id),
  });

  const { data: cat, isLoading } = useQuery({
    queryKey: ["supplier-catalog", id, lineFilter, debouncedItemQuery],
    queryFn: () =>
      supplierCatalogsApi.get(id, {
        line: lineFilter === "Tutte" ? undefined : lineFilter,
        q: debouncedItemQuery || undefined,
        limit: 200,
      }),
  });

  const importMut = useMutation({
    mutationFn: (replace: boolean) =>
      supplierCatalogsApi.importPdfItems(id, replace),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalog", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalog-lines", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] });
    },
  });

  const backfillMut = useMutation({
    mutationFn: () => supplierCatalogsApi.backfillLines(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalog-lines", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalog", id] });
    },
  });

  const uploadMut = useMutation({
    mutationFn: ({
      file,
      role,
    }: {
      file: File;
      role: "PRICE_LIST" | "CATALOG";
    }) =>
      supplierCatalogsApi.uploadFile(id, file, {
        role,
        label:
          role === "PRICE_LIST" ? "Listino prezzi" : "Catalogo con immagini",
        replaceSameRole: true,
        onProgress: setUploadPct,
      }),
    onMutate: ({ role }) => {
      setUploadingRole(role);
      setUploadPct(0);
    },
    onSuccess: () => {
      setUploadPct(0);
      setUploadingRole(null);
      qc.invalidateQueries({ queryKey: ["supplier-catalog", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] });
    },
    onError: () => {
      setUploadingRole(null);
      setUploadPct(0);
    },
  });

  const deleteFileMut = useMutation({
    mutationFn: (fileId: string) => supplierCatalogsApi.deleteFile(id, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalog", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] });
    },
  });

  const updateItemMut = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: { listPrice?: number; sellPrice?: number | null };
    }) => supplierCatalogsApi.updateItem(id, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalog", id] });
      qc.invalidateQueries({ queryKey: ["listino-quick-search"] });
      qc.invalidateQueries({ queryKey: ["listino-recent"] });
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) => supplierCatalogsApi.deleteItem(id, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalog", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalog-lines", id] });
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] });
      qc.invalidateQueries({ queryKey: ["listino-quick-search"] });
      qc.invalidateQueries({ queryKey: ["listino-recent"] });
    },
  });

  const disc = Number(cat?.defaultDiscountPercent) || 0;
  const files: SupplierCatalogFile[] = cat?.files?.length
    ? cat.files
    : cat?.filePath
      ? [
          {
            id: "legacy",
            role: "PRICE_LIST",
            label: cat.fileName || "Allegato",
            filePath: cat.filePath,
            fileName: cat.fileName,
          },
        ]
      : [];
  const itemCount = cat?._count?.items ?? cat?.items.length ?? 0;
  const productLines = linesData?.lines ?? [];
  const priceListFile = files.find((f) => f.role === "PRICE_LIST");
  const catalogImageFile = files.find((f) => f.role === "CATALOG");
  const hasBothSlots =
    Boolean(priceListFile) && Boolean(catalogImageFile);

  useEffect(() => {
    if (backfillTried.current || !cat || !linesData) return;
    if (itemCount < 1) return;
    const named = productLines.filter((l) => l.line !== "Altre");
    if (named.length > 0) return;
    backfillTried.current = true;
    backfillMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot backfill
  }, [cat, linesData, itemCount, productLines]);

  return (
    <>
      <IeHeader title="Catalogo fornitore" />
      <div className="space-y-4 p-4 sm:p-6">
        <Link
          href={routes.supplierCatalogs}
          className="text-sm text-sky-400 hover:underline"
        >
          ← Fornitori / listini
        </Link>
        {isLoading || !cat ? (
          <p className="text-slate-400">Caricamento…</p>
        ) : (
          <>
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-slate-100">{cat.title}</CardTitle>
                <p className="text-sm text-slate-400">
                  {cat.supplierName}
                  {disc > 0 ? ` · sconto listino ${disc}%` : ""}
                </p>
                <CatalogStatusBadges status={cat.status} className="mt-3" />
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div>
                  <h3 className="mb-1 text-sm font-medium text-slate-100">
                    Documenti nella stessa area
                  </h3>
                  <p className="mb-3 text-xs text-slate-500">
                    1) Listino prezzi · 2) Catalogo foto (PDF) · opzionale Excel
                    computo per unire le descrizioni. Poi premi Unisci.
                  </p>
                  <CatalogDualUpload
                    files={files}
                    disabled={uploadMut.isPending || deleteFileMut.isPending}
                    uploadingRole={uploadingRole}
                    uploadPercent={uploadPct}
                    onUpload={(file, role) =>
                      uploadMut.mutate({ file, role })
                    }
                    onDelete={(fileId) => {
                      if (
                        window.confirm("Eliminare questo file dal catalogo?")
                      ) {
                        deleteFileMut.mutate(fileId);
                      }
                    }}
                  />
                  {uploadMut.isError && (
                    <p className="mt-2 text-sm text-red-300">
                      {uploadMut.error instanceof Error
                        ? uploadMut.error.message
                        : "Upload fallito"}
                    </p>
                  )}
                </div>

                {catalogImageFile && (() => {
                  const catalogPdfUrl = publicAssetUrl(catalogImageFile.filePath);
                  const sizeMb =
                    catalogImageFile.fileSize != null
                      ? Math.round(catalogImageFile.fileSize / (1024 * 1024))
                      : null;
                  // PDF molto grandi (es. Living Now ~120 MB) non stanno bene in iframe
                  const tooLargeToEmbed =
                    (catalogImageFile.fileSize ?? 0) > 20 * 1024 * 1024;
                  return (
                    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="flex-1 text-xs text-emerald-200/90">
                          Catalogo immagini pronto
                          {sizeMb != null ? ` (${sizeMb} MB)` : ""}. Aprilo in
                          una scheda a parte mentre consulti i codici qui sotto.
                        </p>
                        <a
                          href={catalogPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-700/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
                        >
                          Apri PDF <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {!tooLargeToEmbed && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCatalogPreview((v) => !v)}
                          >
                            {showCatalogPreview
                              ? "Nascondi anteprima"
                              : "Anteprima qui"}
                          </Button>
                        )}
                      </div>
                      {tooLargeToEmbed && (
                        <p className="mt-2 text-xs text-slate-400">
                          File troppo grande per l’anteprima incorporata: usa
                          «Apri PDF» (scheda del browser). Affianca le due
                          finestre per confrontare foto e codici.
                        </p>
                      )}
                      {showCatalogPreview && !tooLargeToEmbed && (
                        <iframe
                          title="Catalogo prodotti"
                          src={catalogPdfUrl}
                          className="mt-3 h-[70vh] w-full rounded-md border border-slate-800 bg-slate-950"
                        />
                      )}
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    disabled={importMut.isPending || files.length === 0}
                    onClick={() => {
                      const hasItems = itemCount > 0;
                      if (hasItems) {
                        const replace = window.confirm(
                          "OK = ricostruisci sostituendo le voci\nAnnulla = unisci aggiornando i codici esistenti"
                        );
                        importMut.mutate(replace);
                      } else {
                        importMut.mutate(true);
                      }
                    }}
                  >
                    {importMut.isPending
                      ? "Unione in corso…"
                      : "Unisci PDF → catalogo preventivatore"}
                  </Button>
                  <p className="max-w-xl text-xs text-slate-500">
                    Estrae i codici soprattutto dal listino prezzi. Il catalogo
                    immagini resta allegato per consultazione (e arricchisce le
                    descrizioni se contiene testo).
                    {!hasBothSlots && files.length > 0
                      ? " Completa entrambi gli slot per avere prezzi + foto."
                      : ""}
                  </p>
                </div>

                {importMut.isSuccess && (
                  <p className="text-sm text-emerald-400">
                    Unite {importMut.data.parsed ?? 0} voci
                    {importMut.data.imported != null
                      ? ` (nuove ${importMut.data.imported}`
                      : ""}
                    {importMut.data.updated != null
                      ? `, aggiornate ${importMut.data.updated}`
                      : ""}
                    {importMut.data.imported != null ? ")" : ""}
                    {importMut.data.totalItems != null
                      ? ` · totale ${importMut.data.totalItems}`
                      : ""}
                    . Ora cercabili in preventivo.
                  </p>
                )}
                {importMut.isError && (
                  <p className="text-sm text-red-300">
                    {importMut.error instanceof Error
                      ? importMut.error.message
                      : "Estrazione fallita"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-base text-slate-100">
                  Voci listino
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Filtra per linea prodotto per semplificare la consultazione.
                  {backfillMut.isPending ? " Rilevamento linee in corso…" : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLineFilter("Tutte")}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors",
                      lineFilter === "Tutte"
                        ? "border-sky-600 bg-sky-950/60 text-sky-200"
                        : "border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    Tutte
                    {linesData?.total != null ? ` (${linesData.total})` : ""}
                  </button>
                  {productLines.map((l) => (
                    <button
                      key={l.line}
                      type="button"
                      onClick={() => setLineFilter(l.line)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs transition-colors",
                        lineFilter === l.line
                          ? "border-sky-600 bg-sky-950/60 text-sky-200"
                          : "border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500"
                      )}
                    >
                      {l.line} ({l.count})
                    </button>
                  ))}
                </div>
                <Input
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="Cerca codice o descrizione…"
                  className="max-w-md border-slate-700 bg-slate-950"
                />
                {cat.items.length === 0 ? (
                  <p className="text-slate-500">
                    {itemCount === 0
                      ? "Nessuna voce ancora. Carica i PDF e avvia l'unione."
                      : "Nessuna voce con questo filtro."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500">
                          <th className="py-2">SKU</th>
                          <th>Linea</th>
                          <th>Descrizione</th>
                          <th className="w-28 text-right">Listino</th>
                          <th className="w-24 text-right">Netto</th>
                          <th className="w-28 text-right">Prezzo cliente</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item, i) => (
                          <CatalogItemEditableRow
                            key={item.id || i}
                            item={item}
                            catalogDiscount={disc}
                            busy={
                              updateItemMut.isPending || deleteItemMut.isPending
                            }
                            onSaveList={(listPrice) => {
                              if (!item.id) return;
                              updateItemMut.mutate({
                                itemId: item.id,
                                data: { listPrice },
                              });
                            }}
                            onSaveSell={(sellPrice) => {
                              if (!item.id) return;
                              updateItemMut.mutate({
                                itemId: item.id,
                                data: { sellPrice },
                              });
                            }}
                            onDelete={() => {
                              if (!item.id) return;
                              if (
                                window.confirm(
                                  `Eliminare ${item.sku || item.name}?`
                                )
                              ) {
                                deleteItemMut.mutate(item.id);
                              }
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-slate-500">
                      Listino = prezzo fornitore. Netto = listino − sconto.
                      Prezzo cliente = quanto proponi in preventivo (modificabile
                      anche lì).
                    </p>
                  </div>
                )}
                {cat.items.length >= 200 && (
                  <p className="text-xs text-slate-500">
                    Anteprima max 200 voci con il filtro attuale. Affina linea o
                    ricerca, oppure cerca in preventivo.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
