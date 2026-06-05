"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteVisitsApi, type SiteVisitSheet } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { SiteVisitPhotos } from "./site-visit-photos";

const textareaClass =
  "flex min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

type FormState = {
  location: string;
  venueNotes: string;
  audioNotes: string;
  lightingNotes: string;
  accessNotes: string;
  generalNotes: string;
  status: "DRAFT" | "COMPLETED";
};

function sheetToForm(sheet: SiteVisitSheet): FormState {
  return {
    location: sheet.location || sheet.quote?.eventLocation || "",
    venueNotes: sheet.venueNotes || "",
    audioNotes: sheet.audioNotes || "",
    lightingNotes: sheet.lightingNotes || "",
    accessNotes: sheet.accessNotes || "",
    generalNotes: sheet.generalNotes || "",
    status: sheet.status,
  };
}

export function SiteVisitForm({ sheet }: { sheet: SiteVisitSheet }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => sheetToForm(sheet));
  const [banner, setBanner] = useState("");

  useEffect(() => {
    setForm(sheetToForm(sheet));
  }, [sheet.id, sheet.updatedAt]);

  const saveMut = useMutation({
    mutationFn: () =>
      siteVisitsApi.update(sheet.id, {
        location: form.location.trim() || undefined,
        venueNotes: form.venueNotes.trim() || undefined,
        audioNotes: form.audioNotes.trim() || undefined,
        lightingNotes: form.lightingNotes.trim() || undefined,
        accessNotes: form.accessNotes.trim() || undefined,
        generalNotes: form.generalNotes.trim() || undefined,
        status: form.status,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(["site-visit", "event", sheet.eventId], updated);
      qc.invalidateQueries({ queryKey: ["site-visits"] });
      setForm(sheetToForm(updated));
      setBanner("Scheda salvata.");
      setTimeout(() => setBanner(""), 2500);
    },
    onError: () => setBanner("Errore durante il salvataggio."),
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const clientName =
    sheet.client?.companyName || sheet.client?.contactName || null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Scheda sopralluogo {sheet.number}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Documento di rilevazione sul luogo — distinto dal verbale di fine
            lavoro. Annota spazio, impianti, accessi e allega foto.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {sheet.event?.title && (
              <span>Evento: {sheet.event.title}</span>
            )}
            {sheet.event?.startAt && (
              <span>
                Data: {formatDate(sheet.event.startAt)}
              </span>
            )}
            {clientName && <span>Cliente: {clientName}</span>}
            {sheet.quote?.number && (
              <span>
                Preventivo:{" "}
                <Link
                  href={`/quotes/${sheet.quote.id}`}
                  className="text-primary hover:underline"
                >
                  {sheet.quote.number}
                </Link>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {banner && (
            <p
              className={
                banner.startsWith("Errore")
                  ? "text-sm text-red-600"
                  : "text-sm text-green-700"
              }
            >
              {banner}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Luogo / indirizzo
            </label>
            <Input
              value={form.location}
              placeholder="Es. Villa Rossi, Via Roma 12, Milano"
              onChange={(e) => setField("location", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Spazio e layout
            </label>
            <textarea
              className={textareaClass}
              value={form.venueNotes}
              placeholder="Dimensioni sala, altezza soffitto, palco, capienza, vincoli architettonici…"
              onChange={(e) => setField("venueNotes", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Note audio</label>
            <textarea
              className={textareaClass}
              value={form.audioNotes}
              placeholder="Impianto esistente, punti audio, rumore di fondo, FOH, monitor, corrente disponibile…"
              onChange={(e) => setField("audioNotes", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Note luci</label>
            <textarea
              className={textareaClass}
              value={form.lightingNotes}
              placeholder="Punti luce, truss, dimmer, prese, ostacoli, effetti richiesti…"
              onChange={(e) => setField("lightingNotes", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Accessi e logistica
            </label>
            <textarea
              className={textareaClass}
              value={form.accessNotes}
              placeholder="Parcheggio, carico/scarico, orari venue, permessi, percorsi tecnici…"
              onChange={(e) => setField("accessNotes", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Altre annotazioni
            </label>
            <textarea
              className={textareaClass}
              value={form.generalNotes}
              placeholder="Osservazioni libere, contatti in loco, follow-up da preventivare…"
              onChange={(e) => setField("generalNotes", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Stato scheda</label>
            <select
              className="flex h-10 w-full max-w-xs rounded-lg border border-border bg-card px-3 text-sm"
              value={form.status}
              onChange={(e) =>
                setField("status", e.target.value as FormState["status"])
              }
            >
              <option value="DRAFT">Bozza</option>
              <option value="COMPLETED">Completata</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto del sopralluogo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scatti della sala, palco, punti di aggancio, quadri elettrici e
            accessi.
          </p>
        </CardHeader>
        <CardContent>
          <SiteVisitPhotos siteVisitId={sheet.id} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? "Salvataggio…" : "Salva scheda"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/calendar">Torna al calendario</Link>
        </Button>
      </div>
    </div>
  );
}
