"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attachmentsApi, type AttachmentItem } from "@/lib/api";
import { cn } from "@/lib/utils";

function isImage(mime: string) {
  return mime.startsWith("image/");
}

/** Foto protetta: si scarica con il login e si mostra come file temporaneo. */
function AttachmentImage({
  item,
  className,
}: {
  item: AttachmentItem;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    attachmentsApi
      .fetchBlob(item)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item]);

  if (!src) return <div className={cn("bg-muted/40", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={item.originalName} className={className} />;
}

export function SiteVisitPhotos({
  siteVisitId,
  readOnly = false,
}: {
  siteVisitId: string;
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const qc = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["attachments", "site_visit", siteVisitId],
    queryFn: () => attachmentsApi.list("site_visit", siteVisitId),
    enabled: !!siteVisitId,
  });

  const upload = useMutation({
    mutationFn: (file: File) =>
      attachmentsApi.upload(file, "site_visit", siteVisitId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["attachments", "site_visit", siteVisitId],
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["attachments", "site_visit", siteVisitId],
      }),
  });

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || readOnly) return;
      Array.from(list).forEach((f) => upload.mutate(f));
    },
    [readOnly, upload]
  );

  const images = files.filter((f) => isImage(f.mimeType));
  const otherFiles = files.filter((f) => !isImage(f.mimeType));

  return (
    <div className="space-y-4">
      {!readOnly && (
        <>
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
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <FileUp className="mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">Carica foto del luogo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trascina immagini o clicca per selezionare
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Scatta foto (mobile)
          </Button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </>
      )}

      {upload.isPending && (
        <p className="text-sm text-muted-foreground">Caricamento foto…</p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna foto allegata. Aggiungi scatti della sala, del palco, dei punti
          luce e degli accessi.
        </p>
      ) : (
        <>
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((f: AttachmentItem) => (
                <figure
                  key={f.id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <AttachmentImage
                    item={f}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 opacity-90"
                      onClick={() => remove.mutate(f.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <figcaption className="truncate px-2 py-1 text-xs text-muted-foreground">
                    {f.originalName}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {otherFiles.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {otherFiles.map((f: AttachmentItem) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      attachmentsApi
                        .open(f)
                        .catch(() => window.alert("Impossibile aprire l'allegato."))
                    }
                    className="truncate text-left text-primary hover:underline"
                  >
                    {f.originalName}
                  </button>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(f.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
