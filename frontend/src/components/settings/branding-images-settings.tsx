"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsApi, uploadBrandingAsset } from "@/lib/api";
import { publicAssetUrl } from "@/lib/branding";
import { cn } from "@/lib/utils";

export function BrandingImagesSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const [banner, setBanner] = useState("");

  const logoUrl = publicAssetUrl((data?.logo as { url?: string })?.url);
  const favUrl = publicAssetUrl((data?.favicon as { url?: string })?.url);

  async function applyUpload(file: File | undefined, kind: "logo" | "favicon") {
    if (!file) return;
    setBanner("");
    try {
      const { relativeUrl } = await uploadBrandingAsset(file, kind);
      await settingsApi.update(kind, { url: relativeUrl });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings", "public"] });
      setBanner(kind === "logo" ? "Logo aggiornato." : "Favicon aggiornata.");
      setTimeout(() => setBanner(""), 2500);
    } catch {
      setBanner("Upload non riuscito.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {banner && (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            banner.startsWith("Errore") || banner.includes("non riuscito")
              ? "border-red-500/40 bg-red-500/10 text-red-700"
              : "border-green-500/40 bg-green-500/10 text-green-800"
          )}
        >
          {banner}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Logo e favicon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Il logo compare in home, login e PDF. La favicon nel browser e sul
            telefono (PNG o SVG consigliato, sfondo trasparente per il logo).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 max-w-[200px] rounded-lg border border-border object-contain p-1"
              />
            ) : (
              <span className="text-sm text-muted-foreground">Nessun logo</span>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Carica logo</label>
              <Input
                type="file"
                accept="image/*"
                className="max-w-xs"
                onChange={(e) => applyUpload(e.target.files?.[0], "logo")}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {favUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={favUrl}
                alt="Favicon"
                className="h-10 w-10 rounded border border-border object-contain"
              />
            ) : (
              <span className="text-sm text-muted-foreground">Nessuna favicon</span>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Carica favicon</label>
              <Input
                type="file"
                accept="image/*,.ico"
                className="max-w-xs"
                onChange={(e) => applyUpload(e.target.files?.[0], "favicon")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
