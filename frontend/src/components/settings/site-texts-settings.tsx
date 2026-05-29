"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsApi } from "@/lib/api";
import { mergeSiteHome, type SiteHomeSettings } from "@/lib/branding";
import { cn } from "@/lib/utils";

const textareaClass =
  "flex min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

const DEFAULT_REPORT_CHECKLIST_TEMPLATES = [
  "Allestimento completato",
  "Collaudo audio/luci",
  "Smontaggio e ripristino area",
];

export function SiteTextsSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const [banner, setBanner] = useState("");
  const [siteHome, setSiteHome] = useState<SiteHomeSettings>(() =>
    mergeSiteHome(undefined)
  );
  const [reportChecklistTemplates, setReportChecklistTemplates] = useState<string[]>(
    DEFAULT_REPORT_CHECKLIST_TEMPLATES
  );

  useEffect(() => {
    if (!data) return;
    setSiteHome(mergeSiteHome(data.site_home));
    const reportTemplates = data.report_checklist_templates;
    setReportChecklistTemplates(
      Array.isArray(reportTemplates) && reportTemplates.length > 0
        ? reportTemplates.filter((x): x is string => typeof x === "string")
        : DEFAULT_REPORT_CHECKLIST_TEMPLATES
    );
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

  function updateFeature(i: number, field: "title" | "description", value: string) {
    setSiteHome((prev) => {
      const features = prev.features.map((f, j) =>
        j === i ? { ...f, [field]: value } : f
      );
      return { ...prev, features };
    });
  }

  if (isLoading && !data) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
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
          <CardTitle>Sito pubblico — hero e servizi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Badge, titoli, tre punti di forza, testo contatti e riga del footer
            nella homepage.
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
              Riga piè di pagina (dopo © anno)
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
            onClick={() => saveMut.mutate({ key: "site_home", value: siteHome })}
          >
            Salva testi sito
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report — voci predefinite</CardTitle>
          <p className="text-sm text-muted-foreground">
            Voci riutilizzabili nella sezione &quot;Voci attività&quot; dei report.
            Durante la compilazione potrai selezionarle e modificarle.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {reportChecklistTemplates.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) =>
                  setReportChecklistTemplates((rows) =>
                    rows.map((row, i) => (i === index ? e.target.value : row))
                  )
                }
                placeholder="Voce attività"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setReportChecklistTemplates((rows) =>
                    rows.filter((_, i) => i !== index)
                  )
                }
              >
                Rimuovi
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportChecklistTemplates((rows) => [...rows, ""])}
            >
              Aggiungi voce
            </Button>
            <Button
              disabled={saveMut.isPending}
              onClick={() =>
                saveMut.mutate({
                  key: "report_checklist_templates",
                  value: reportChecklistTemplates
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            >
              Salva voci report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
