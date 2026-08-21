"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, FileUp, ImageIcon, Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicAssetUrl } from "@/lib/branding";
import type { SupplierCatalogFile } from "@/lib/api";
import { cn } from "@/lib/utils";

type SlotRole = "PRICE_LIST" | "CATALOG";

function SlotDropzone({
  title,
  hint,
  icon,
  file,
  disabled,
  uploading,
  uploadPercent,
  onFile,
  onDelete,
}: {
  title: string;
  hint: string;
  icon: "list" | "images";
  file?: SupplierCatalogFile | null;
  disabled?: boolean;
  uploading?: boolean;
  uploadPercent?: number;
  onFile: (file: File) => void;
  onDelete?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const hasFile = Boolean(file?.filePath);

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (f) onFile(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            icon === "images"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-sky-500/15 text-sky-300"
          )}
        >
          {icon === "images" ? (
            <ImageIcon className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100">{title}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>

      {hasFile && file && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-2">
          <a
            href={publicAssetUrl(file.filePath)}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm text-sky-300 hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {file.label || file.fileName || "PDF"}
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </a>
          {onDelete && file.id !== "legacy" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0 text-red-300 hover:text-red-200"
              disabled={disabled}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
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
          "relative flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-6 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-slate-800 opacity-60"
            : dragOver
              ? "cursor-pointer border-sky-500/70 bg-sky-950/40"
              : "cursor-pointer border-slate-600/80 hover:border-sky-600/50 hover:bg-slate-900/60"
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            dragOver ? "bg-sky-500/20 text-sky-300" : "bg-slate-800 text-slate-300"
          )}
        >
          {uploading ? (
            <FileUp className="h-4 w-4 animate-pulse" />
          ) : hasFile ? (
            <Replace className="h-4 w-4" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
        </div>
        <p className="text-sm font-medium text-slate-100">
          {uploading
            ? `Caricamento ${uploadPercent ?? 0}%…`
            : hasFile
              ? "Sostituisci PDF"
              : "Trascina o clicca"}
        </p>
        <p className="text-[11px] text-slate-500">PDF o Excel · max 150 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*,.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => pick(e.target.files)}
        />
      </div>
    </div>
  );
}

/** Due slot affiancati: listino prezzi + catalogo immagini (stessa area fornitore). */
export function CatalogDualUpload({
  files,
  disabled,
  uploadingRole,
  uploadPercent,
  onUpload,
  onDelete,
  className,
}: {
  files: SupplierCatalogFile[];
  disabled?: boolean;
  uploadingRole?: SlotRole | null;
  uploadPercent?: number;
  onUpload: (file: File, role: SlotRole) => void;
  onDelete?: (fileId: string) => void;
  className?: string;
}) {
  const priceList =
    files.find((f) => f.role === "PRICE_LIST") ||
    (files.length === 1 ? files[0] : null);
  const catalog =
    files.find(
      (f) =>
        f.role === "CATALOG" && (!priceList || f.id !== priceList.id)
    ) ||
    files.find(
      (f) =>
        f.role === "OTHER" && (!priceList || f.id !== priceList.id)
    ) ||
    files.find((f) => priceList && f.id !== priceList.id) ||
    null;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <SlotDropzone
        title="1. Listino prezzi"
        hint="Codici SKU e prezzi (€) — es. listino RR"
        icon="list"
        file={priceList}
        disabled={disabled}
        uploading={uploadingRole === "PRICE_LIST"}
        uploadPercent={uploadPercent}
        onFile={(file) => onUpload(file, "PRICE_LIST")}
        onDelete={
          priceList && onDelete && priceList.id !== "legacy"
            ? () => onDelete(priceList.id)
            : undefined
        }
      />
      <SlotDropzone
        title="2. Catalogo con immagini"
        hint="PDF illustrato e/o Excel codici (Living Now)"
        icon="images"
        file={catalog}
        disabled={disabled}
        uploading={uploadingRole === "CATALOG"}
        uploadPercent={uploadPercent}
        onFile={(file) => onUpload(file, "CATALOG")}
        onDelete={
          catalog && onDelete && catalog.id !== "legacy"
            ? () => onDelete(catalog.id)
            : undefined
        }
      />
    </div>
  );
}
