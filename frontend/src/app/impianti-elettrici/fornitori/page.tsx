"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  FileText,
  FileUp,
  Plus,
  Replace,
} from "lucide-react";
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
import { cn, formatCurrency } from "@/lib/utils";

function ProgressBar({
  value,
  label,
  indeterminate,
}: {
  value?: number;
  label: string;
  indeterminate?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="w-full space-y-1.5" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
        <span className="truncate">{label}</span>
        {!indeterminate && <span className="tabular-nums">{pct}%</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        {indeterminate ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-500/80" />
        ) : (
          <div
            className="h-full rounded-full bg-sky-500 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function CatalogPdfZone({
  hasFile,
  fileName,
  fileHref,
  disabled,
  uploading,
  uploadPercent,
  onFile,
}: {
  hasFile: boolean;
  fileName?: string | null;
  fileHref?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  uploadPercent?: number;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    const file = list?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {hasFile && fileHref && (
        <a
          href={fileHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-sky-300 transition-colors hover:border-sky-700/60 hover:bg-slate-900"
        >
          <FileText className="h-4 w-4 shrink-0 text-sky-400" />
          <span className="min-w-0 flex-1 truncate font-medium">
            {fileName || "Catalogo PDF"}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </a>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) pick(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-slate-800 bg-slate-950/40 opacity-60"
            : dragOver
              ? "cursor-pointer border-sky-500/70 bg-sky-950/40"
              : "cursor-pointer border-slate-600/80 bg-slate-950/50 hover:border-sky-600/50 hover:bg-slate-900/70"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            dragOver ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-300"
          )}
        >
          {hasFile ? (
            <Replace className="h-5 w-5" />
          ) : (
            <FileUp className="h-5 w-5" />
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-100">
            {uploading
              ? "Caricamento in corso…"
              : hasFile
                ? "Sostituisci PDF"
                : "Carica catalogo PDF"}
          </p>
          <p className="text-xs text-slate-400">
            Trascina qui oppure clicca · max 150 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => pick(e.target.files)}
        />
      </div>

      {uploading && <ProgressBar value={uploadPercent} label="Invio file…" />}
    </div>
  );
}

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
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");

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
      supplierCatalogsApi.uploadPdf(id, file, setUploadPercent),
    onMutate: ({ id, file }) => {
      setUploadTargetId(id);
      setUploadPercent(0);
      setUploadFileName(file.name);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-catalogs"] });
    },
    onSettled: () => {
      setUploadTargetId(null);
      setUploadPercent(0);
      setUploadFileName("");
    },
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

        {uploadMut.isPending && (
          <div className="mb-4 rounded-lg border border-sky-800/50 bg-slate-900/90 p-3 shadow-lg shadow-sky-950/30">
            <ProgressBar
              value={uploadPercent}
              label={
                uploadFileName
                  ? `Caricamento ${uploadFileName}`
                  : "Caricamento PDF"
              }
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Non chiudere la pagina: i file grandi possono richiedere alcuni
              minuti.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="max-w-sm">
            <ProgressBar indeterminate label="Caricamento cataloghi…" />
          </div>
        ) : catalogs.length === 0 ? (
          <p className="text-slate-400">Nessun catalogo ancora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogs.map((cat) => {
              const disc = Number(cat.defaultDiscountPercent) || 0;
              const isUploading =
                uploadMut.isPending && uploadTargetId === cat.id;
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
                      <CatalogPdfZone
                        hasFile={!!cat.filePath}
                        fileName={cat.fileName}
                        fileHref={
                          cat.filePath ? publicAssetUrl(cat.filePath) : null
                        }
                        disabled={uploadMut.isPending}
                        uploading={isUploading}
                        uploadPercent={uploadPercent}
                        onFile={(file) =>
                          uploadMut.mutate({ id: cat.id, file })
                        }
                      />
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
              disabled={createMut.isPending}
            />
            <Input
              placeholder="Titolo *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={createMut.isPending}
            />
            <select
              className={appSelectClass}
              value={kind}
              disabled={createMut.isPending}
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
              disabled={createMut.isPending}
              onChange={(e) => setDiscount(e.target.value)}
            />
            {kind === "PRICE_LIST" && (
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="SKU"
                  value={itemSku}
                  disabled={createMut.isPending}
                  onChange={(e) => setItemSku(e.target.value)}
                />
                <Input
                  placeholder="Voce"
                  value={itemName}
                  disabled={createMut.isPending}
                  onChange={(e) => setItemName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Prezzo listino"
                  value={itemPrice}
                  disabled={createMut.isPending}
                  onChange={(e) => setItemPrice(e.target.value)}
                />
              </div>
            )}
            {createMut.isPending && (
              <ProgressBar indeterminate label="Creazione catalogo…" />
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
            <Button
              variant="outline"
              disabled={createMut.isPending}
              onClick={() => setOpen(false)}
            >
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
