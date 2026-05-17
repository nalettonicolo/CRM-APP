"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  eventGalleryApi,
  uploadGalleryImage,
  type EventGalleryItem,
} from "@/lib/api";
import { publicAssetUrl } from "@/lib/branding";
import { formatDate } from "@/lib/utils";

export default function EventGallerySettingsPage() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["event-gallery"],
    queryFn: eventGalleryApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventGalleryApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-gallery"] }),
  });

  const toggleMut = useMutation({
    mutationFn: (item: EventGalleryItem) =>
      eventGalleryApi.update(item.id, { isPublished: !item.isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event-gallery"] }),
  });

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { relativeUrl } = await uploadGalleryImage(file);
      await eventGalleryApi.create({
        imagePath: relativeUrl,
        title: title.trim() || undefined,
        caption: caption.trim() || undefined,
        isPublished: true,
      });
      setTitle("");
      setCaption("");
      qc.invalidateQueries({ queryKey: ["event-gallery"] });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Header title="Galleria eventi" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link href="/settings" className="text-sm text-primary hover:underline">
          ← Impostazioni
        </Link>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Carica foto dei vostri eventi: compariranno nella home pubblica nella
          sezione &quot;I nostri eventi&quot;. Potrai usarle anche in futuro
          nell&apos;area cliente come storico.
        </p>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImagePlus className="h-4 w-4" />
              Nuova foto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Titolo evento (opzionale)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              placeholder="Didascalia breve"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            {uploading && (
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground">Caricamento…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna foto ancora. Carica la prima sopra.
            </p>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicAssetUrl(item.imagePath)}
                  alt={item.title || "Evento"}
                  className="aspect-[4/3] w-full object-cover"
                />
                <CardContent className="space-y-2 p-3">
                  <p className="font-medium text-sm">
                    {item.title || "Senza titolo"}
                  </p>
                  {item.eventDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.eventDate)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMut.mutate(item)}
                    >
                      {item.isPublished ? "Nascondi" : "Pubblica"}
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
            ))
          )}
        </div>
      </div>
    </>
  );
}
