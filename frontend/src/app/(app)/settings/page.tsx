"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsApi, uploadBrandingAsset } from "@/lib/api";
import {
  DEFAULT_APP_NAME,
  mergeSiteHome,
  publicAssetUrl,
  type SiteHomeSettings,
} from "@/lib/branding";
import { cn } from "@/lib/utils";

const textareaClass =
  "flex min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const [banner, setBanner] = useState("");
  const [appName, setAppName] = useState(DEFAULT_APP_NAME);
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [siteHome, setSiteHome] = useState<SiteHomeSettings>(() =>
    mergeSiteHome(undefined)
  );
  const [company, setCompany] = useState({
    name: "",
    vat: "",
    address: "",
    email: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    if (!data) return;
    const an = data.app_name as { name?: string; tagline?: string };
    setAppName(an?.name?.trim() || DEFAULT_APP_NAME);
    setTagline(an?.tagline?.trim() || "");
    setPrimaryColor((data.colors as { primary?: string })?.primary || "#6366f1");
    setSiteHome(mergeSiteHome(data.site_home));
    const co = (data.company as Record<string, string>) || {};
    setCompany({
      name: co.name || "",
      vat: co.vat || "",
      address: co.address || "",
      email: co.email || "",
      phone: co.phone || "",
      website: co.website || "",
    });
  }, [data]);

  const saveMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      settingsApi.update(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings", "public"] });
      setBanner("Salvato.");
      setTimeout(() => setBanner(""), 2500);
    },
    onError: () => setBanner("Errore durante il salvataggio."),
  });

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

  function updateFeature(i: number, field: "title" | "description", value: string) {
    setSiteHome((prev) => {
      const features = prev.features.map((f, j) =>
        j === i ? { ...f, [field]: value } : f
      );
      return { ...prev, features };
    });
  }

  if (isLoading && !data) {
    return (
      <>
        <Header title="Impostazioni" />
        <div className="p-6 text-muted-foreground">Caricamento…</div>
      </>
    );
  }

  return (
    <>
      <Header title="Impostazioni" />
      <div className="max-w-3xl space-y-6 p-6">
        {banner && (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              banner.startsWith("Errore")
                ? "border-red-500/40 bg-red-500/10 text-red-700"
                : "border-green-500/40 bg-green-500/10 text-green-800"
            )}
          >
            {banner}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Testi sito pubblico (servizi audio/luci)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Hero, tre servizi in evidenza, testo sopra il modulo contatti e riga
              del footer. Non è una pagina di vendita software.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Badge</label>
              <Input
                value={siteHome.badge}
                onChange={(e) => setSiteHome((s) => ({ ...s, badge: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Titolo principale</label>
              <Input
                value={siteHome.headline}
                onChange={(e) =>
                  setSiteHome((s) => ({ ...s, headline: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sottotitolo</label>
              <textarea
                className={textareaClass}
                value={siteHome.subheadline}
                onChange={(e) =>
                  setSiteHome((s) => ({ ...s, subheadline: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Testo sopra il modulo contatti
              </label>
              <textarea
                className={textareaClass}
                value={siteHome.accessIntro}
                onChange={(e) =>
                  setSiteHome((s) => ({ ...s, accessIntro: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Riga piè di pagina (dopo © ann)
              </label>
              <Input
                value={siteHome.footerLine}
                onChange={(e) =>
                  setSiteHome((s) => ({ ...s, footerLine: e.target.value }))
                }
              />
            </div>

            <p className="pt-2 text-sm font-medium">Tre punti di forza</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                <Input
                  placeholder="Titolo"
                  value={siteHome.features[i]?.title ?? ""}
                  onChange={(e) => updateFeature(i, "title", e.target.value)}
                />
                <textarea
                  className={textareaClass}
                  placeholder="Descrizione"
                  value={siteHome.features[i]?.description ?? ""}
                  onChange={(e) => updateFeature(i, "description", e.target.value)}
                />
              </div>
            ))}

            <Button
              disabled={saveMut.isPending}
              onClick={() =>
                saveMut.mutate({ key: "site_home", value: siteHome })
              }
            >
              Salva testi sito
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nome e colori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nome attività / prodotto
              </label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tagline breve</label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Colore primario</label>
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-24"
              />
            </div>
            <Button
              disabled={saveMut.isPending}
              onClick={async () => {
                setBanner("");
                try {
                  await settingsApi.update("app_name", {
                    name: appName.trim(),
                    tagline: tagline.trim(),
                  });
                  await settingsApi.update("colors", {
                    ...(data?.colors &&
                    typeof data.colors === "object" &&
                    !Array.isArray(data.colors)
                      ? (data.colors as Record<string, unknown>)
                      : {}),
                    primary: primaryColor,
                  });
                  await qc.invalidateQueries({ queryKey: ["settings"] });
                  await qc.invalidateQueries({ queryKey: ["settings", "public"] });
                  setBanner("Salvato.");
                  setTimeout(() => setBanner(""), 2500);
                } catch {
                  setBanner("Errore durante il salvataggio.");
                }
              }}
            >
              Salva nome e colori
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo e favicon</CardTitle>
            <p className="text-sm text-muted-foreground">
              Caricamento su server; consigliati PNG/SVG per il logo e ICO o PNG per
              la favicon.
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
                  onChange={(e) =>
                    applyUpload(e.target.files?.[0], "logo")
                  }
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
                <label className="mb-1 block text-sm font-medium">
                  Carica favicon
                </label>
                <Input
                  type="file"
                  accept="image/*,.ico"
                  className="max-w-xs"
                  onChange={(e) =>
                    applyUpload(e.target.files?.[0], "favicon")
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatti in home (footer)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compariranno sotto il copyright sulla pagina pubblica, se compilati.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Ragione sociale"
              value={company.name}
              onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
            />
            <Input
              placeholder="P. IVA"
              value={company.vat}
              onChange={(e) => setCompany((c) => ({ ...c, vat: e.target.value }))}
            />
            <Input
              placeholder="Indirizzo"
              value={company.address}
              onChange={(e) =>
                setCompany((c) => ({ ...c, address: e.target.value }))
              }
            />
            <Input
              placeholder="Email"
              type="email"
              value={company.email}
              onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
            />
            <Input
              placeholder="Telefono"
              value={company.phone}
              onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
            />
            <Input
              placeholder="Sito web (https://…)"
              value={company.website}
              onChange={(e) =>
                setCompany((c) => ({ ...c, website: e.target.value }))
              }
            />
            <Button
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate({ key: "company", value: company })}
            >
              Salva contatti
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMTP email</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configurazione invio (variabili ambiente sul server). Qui solo
              promemoria — collega SMTP nel file .env dell&apos;API.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="smtp.example.com" disabled />
            <Input placeholder="587" type="number" disabled />
            <Input placeholder="noreply@azienda.it" disabled />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
