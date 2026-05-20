"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink, ImagePlus, Pencil, Trash2 } from "lucide-react";
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
import {
  ApiError,
  eventGalleryApi,
  uploadGalleryImage,
  type EventGalleryItem,
} from "@/lib/api";
import { publicAssetUrl } from "@/lib/branding";

function invalidateGallery(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["event-gallery"] });
  qc.invalidateQueries({ queryKey: ["event-gallery", "public"] });
}

export function WorkGallerySettings({
  showHomeLink = true,
}: {
  showHomeLink?: boolean;
}) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [editing, setEditing] = useState<EventGalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["event-gallery"],
    queryFn: eventGalleryApi.list,
  });

  const publishedCount = items.filter((i) => i.isPublished).length;

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventGalleryApi.delete(id),
    onSuccess: () => invalidateGallery(qc),
  });

  const toggleMut = useMutation({
    mutationFn: (item: EventGalleryItem) =>
      eventGalleryApi.update(item.id, { isPublished: !item.isPublished }),
    onSuccess: () => invalidateGallery(qc),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      eventGalleryApi.update(editing!.id, {
        title: editTitle.trim() || null,
        caption: editCaption.trim(),
      }),
    onSuccess: () => {
      invalidateGallery(qc);
      setEditing(null);
    },
  });

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    const desc = caption.trim();
    if (desc.length < 3) {
      setUploadError("Inserisci una descrizione breve (almeno 3 caratteri).");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const { relativeUrl } = await uploadGalleryImage(file);
      await eventGalleryApi.create({
        imagePath: relativeUrl,
        title: title.trim() || undefined,
        caption: desc,
        isPublished: true,
      });
      setTitle("");
      setCaption("");
      invalidateGallery(qc);
    } catch (e) {
      setUploadError(
        e instanceof ApiError ? e.message : "Caricamento non riuscito."
      );
    } finally {
      setUploading(false);
    }
  }

  function openEdit(item: EventGalleryItem) {
    setEditing(item);
    setEditTitle(item.title || "");
    setEditCaption(item.caption || "");
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Le foto pubblicate compaiono nella home, sezione{" "}
        <strong className="text-foreground">&quot;I nostri eventi&quot;</strong>
        , con la descrizione sotto ogni immagine. Finché non carichi nulla, i
        visitatori vedono il messaggio attuale (&quot;Presto pubblicheremo…&quot;).
      </p>
      {showHomeLink && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            Anteprima home
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-4 w-4" />
            Carica nuova foto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Descrizione breve *
            </label>
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              placeholder="Es. Matrimonio in villa — impianto audio e luci per 200 ospiti"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={280}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Visibile sotto la foto in homepage (max 280 caratteri).
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Titolo (opzionale)
            </label>
            <Input
              placeholder="Es. Concerto estate 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Immagine *</label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => {
                void handleUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {uploading && (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          )}
          {uploadError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-sm font-medium">
          Foto caricate ({items.length})
          {publishedCount > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">
              · {publishedCount} visibili in home
            </span>
          )}
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Nessuna foto. Carica la prima per sostituire il testo placeholder in
            homepage.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicAssetUrl(item.imagePath)}
                  alt={item.caption || item.title || "Lavoro"}
                  className="aspect-[4/3] w-full object-cover"
                />
                <CardContent className="space-y-2 p-3">
                  {item.title && (
                    <p className="text-sm font-semibold">{item.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.caption || "—"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifica
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMut.mutate(item)}
                    >
                      {item.isPublished ? "Nascondi" : "In home"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (window.confirm("Eliminare questa foto?")) {
                          deleteMut.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Descrizione breve *
              </label>
              <textarea
                className="flex min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                maxLength={280}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Titolo</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annulla
            </Button>
            <Button
              disabled={
                updateMut.isPending || editCaption.trim().length < 3
              }
              onClick={() => updateMut.mutate()}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
