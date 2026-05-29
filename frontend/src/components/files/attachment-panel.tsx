"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Trash2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachmentsApi, type AttachmentItem } from "@/lib/api";
import { cn } from "@/lib/utils";

type EntityType = "client" | "quote" | "intervention" | "report" | "invoice";

export function AttachmentPanel({
  entityType,
  entityId,
  readOnly = false,
}: {
  entityType: EntityType;
  entityId: string;
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const qc = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: () => attachmentsApi.list(entityType, entityId),
    enabled: !!entityId,
  });

  const upload = useMutation({
    mutationFn: (file: File) =>
      attachmentsApi.upload(file, entityType, entityId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attachments", entityType, entityId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attachments", entityType, entityId] }),
  });

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || readOnly) return;
      Array.from(list).forEach((f) => upload.mutate(f));
    },
    [readOnly, upload]
  );

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Trascina file qui o clicca per caricare</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, immagini, documenti</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {upload.isPending && (
        <p className="text-sm text-muted-foreground">Caricamento in corso...</p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento allegati...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun allegato.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {files.map((f: AttachmentItem) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(f.size / 1024).toFixed(0)} KB ·{" "}
                    {new Date(f.createdAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={attachmentsApi.downloadUrl(f)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(f.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
