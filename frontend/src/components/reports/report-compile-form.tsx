"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FileText, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientSearchSelect } from "@/components/clients/client-search-select";
import { ReportPreviewStep } from "@/components/reports/report-preview-step";
import { ReportSignStep } from "@/components/reports/report-sign-step";
import {
  interventionsApi,
  quotesApi,
  reportsApi,
  settingsApi,
  type Quote,
  type ReportDetail,
  type ReportPayload,
} from "@/lib/api";
import {
  appendToDescription,
  buildQuoteItemsBlock,
  buildQuoteReferenceBlock,
} from "@/lib/report-quote";
import { dateInputToIso, toDateInputValue } from "@/lib/utils";

const textareaClass =
  "flex min-h-[100px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

type CheckItem = { label: string; checked: boolean };
type MaterialRow = { name: string; quantity: string; unit: string };
type Step = "form" | "preview" | "sign";

const DEFAULT_REPORT_CHECKLIST_TEMPLATES = [
  "Allestimento completato",
  "Collaudo audio/luci",
  "Smontaggio e ripristino area",
];

export function ReportCompileForm({
  reportId: initialReportId,
  initial,
  interventionId: interventionIdProp,
  clientId: clientIdProp,
  quoteId: quoteIdProp,
}: {
  reportId?: string;
  initial?: ReportDetail;
  interventionId?: string;
  clientId?: string;
  quoteId?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("form");
  const [savedReport, setSavedReport] = useState<ReportDetail | null>(initial ?? null);
  const [activeReportId, setActiveReportId] = useState(initialReportId);

  const [clientId, setClientId] = useState(initial?.clientId || initial?.client?.id || "");
  const [quoteId, setQuoteId] = useState(
    initial?.quoteId || initial?.quote?.id || ""
  );
  const [description, setDescription] = useState(initial?.description || "");
  const [workHours, setWorkHours] = useState(
    initial?.workHours != null ? String(Number(initial.workHours)) : ""
  );
  const [kmTraveled, setKmTraveled] = useState(
    initial?.kmTraveled != null ? String(Number(initial.kmTraveled)) : ""
  );
  const [expensesAmount, setExpensesAmount] = useState(
    initial?.expensesAmount != null ? String(Number(initial.expensesAmount)) : ""
  );
  const [expensesNotes, setExpensesNotes] = useState(initial?.expensesNotes || "");
  const [createdAt, setCreatedAt] = useState(
    initial?.createdAt ? toDateInputValue(initial.createdAt) : ""
  );
  const [checklist, setChecklist] = useState<CheckItem[]>(
    (initial?.checklist as CheckItem[]) || []
  );
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>(
    initial?.materials?.map((m) => ({
      name: m.name,
      quantity: String(Number(m.quantity)),
      unit: m.unit || "pz",
    })) || []
  );
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.latitude != null && initial?.longitude != null
      ? { lat: Number(initial.latitude), lng: Number(initial.longitude) }
      : null
  );
  const [error, setError] = useState("");
  const [interventionId, setInterventionId] = useState(
    initial?.intervention?.id || interventionIdProp || ""
  );

  const { data: interventionPrefill } = useQuery({
    queryKey: ["intervention", interventionIdProp],
    queryFn: () => interventionsApi.get(interventionIdProp!),
    enabled: !!interventionIdProp && !initial,
  });

  const { data: quotePrefill } = useQuery({
    queryKey: ["quote-prefill", quoteIdProp],
    queryFn: () => quotesApi.get(quoteIdProp!),
    enabled: !!quoteIdProp && !initial,
  });

  useEffect(() => {
    if (!interventionPrefill || initial) return;
    setInterventionId(interventionPrefill.id);
    setClientId(interventionPrefill.client?.id || "");
    if (interventionPrefill.description && !description) {
      setDescription(
        `Intervento ${interventionPrefill.number}: ${interventionPrefill.title}\n\n${interventionPrefill.description}`
      );
    } else if (interventionPrefill.title) {
      setDescription(`Intervento ${interventionPrefill.number}: ${interventionPrefill.title}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interventionPrefill, initial]);

  useEffect(() => {
    if (initial) return;
    if (clientIdProp) setClientId(clientIdProp);
  }, [clientIdProp, initial]);

  useEffect(() => {
    if (!quotePrefill || initial) return;
    setQuoteId(quotePrefill.id);
    if (quotePrefill.clientId) setClientId(quotePrefill.clientId);
    setDescription((d) =>
      d.trim()
        ? d
        : appendToDescription("", buildQuoteReferenceBlock(quotePrefill))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotePrefill, initial]);

  const { data: clientQuotes } = useQuery({
    queryKey: ["quotes-by-client", clientId],
    queryFn: () =>
      quotesApi.list({ clientId, limit: "100" }),
    enabled: Boolean(clientId),
  });

  const { data: selectedQuoteFull } = useQuery({
    queryKey: ["quote-for-report", quoteId],
    queryFn: () => quotesApi.get(quoteId),
    enabled: Boolean(quoteId),
  });

  const { data: publicSettings } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
  });

  const reportTemplatesSetting = publicSettings?.report_checklist_templates;
  const reportChecklistTemplates =
    Array.isArray(reportTemplatesSetting) && reportTemplatesSetting.length > 0
      ? reportTemplatesSetting.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        )
      : DEFAULT_REPORT_CHECKLIST_TEMPLATES;

  useEffect(() => {
    if (initial || checklist.length > 0) return;
    setChecklist(
      reportChecklistTemplates.map((label) => ({ label, checked: false }))
    );
  }, [checklist.length, initial, reportChecklistTemplates]);

  const selectedQuote =
    selectedQuoteFull ||
    clientQuotes?.data?.find((q) => q.id === quoteId) ||
    initial?.quote;

  const reportMeta = savedReport ?? initial;
  const canEditCreatedAt = reportMeta?.canEditCreatedAt !== false;

  function buildPayload(): ReportPayload {
    const payload: ReportPayload = {
      clientId,
      quoteId: quoteId || null,
      interventionId: interventionId || undefined,
      description,
      workHours: workHours ? Number(workHours) : 0,
      kmTraveled: kmTraveled ? Number(kmTraveled) : 0,
      expensesAmount: expensesAmount ? Number(expensesAmount) : 0,
      expensesNotes: expensesNotes.trim() || undefined,
      checklist,
      materials: materials
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name,
          quantity: Number(m.quantity) || 0,
          unit: m.unit || "pz",
        })),
      latitude: coords?.lat,
      longitude: coords?.lng,
      status: "DRAFT",
    };
    if (activeReportId && canEditCreatedAt && createdAt) {
      payload.createdAt = dateInputToIso(createdAt, 12);
    }
    return payload;
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Seleziona un cliente.");
      const payload = buildPayload();
      if (activeReportId) {
        return reportsApi.update(activeReportId, payload);
      }
      return reportsApi.createDraft(payload);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report", data.id] });
      setSavedReport(data);
      setActiveReportId(data.id);
      setStep("preview");
      setError("");
    },
    onError: (e: Error) => setError(e.message || "Salvataggio fallito."),
  });

  async function insertQuoteBlock(
    builder: (quote: Quote) => string
  ) {
    if (!quoteId) {
      setError("Seleziona un preventivo.");
      return;
    }
    try {
      const quote = selectedQuoteFull ?? (await quotesApi.get(quoteId));
      setDescription((d) => appendToDescription(d, builder(quote)));
      setError("");
    } catch {
      setError("Impossibile caricare il dettaglio del preventivo.");
    }
  }

  function captureGeo() {
    if (!navigator.geolocation) {
      setError("Geolocalizzazione non supportata.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError("");
      },
      () => setError("Impossibile ottenere la posizione.")
    );
  }

  function addChecklistTemplate(label: string) {
    const value = label.trim();
    if (!value) return;
    setChecklist((list) => [...list, { label: value, checked: false }]);
    setSelectedTemplate("");
  }

  if (step === "preview" && savedReport) {
    return (
      <ReportPreviewStep
        report={savedReport}
        onSign={() => setStep("sign")}
        onSaveLater={() => router.push(`/reports/${savedReport.id}`)}
        onEdit={() => setStep("form")}
      />
    );
  }

  if (step === "sign" && activeReportId) {
    return (
      <ReportSignStep
        reportId={activeReportId}
        clientEmail={savedReport?.client?.email}
        initialTechnicianSignature={savedReport?.technicianSignature}
        initialClientSignature={savedReport?.clientSignature}
        onBack={() => setStep("preview")}
        onDone={(message) => {
          const notice = message
            ? `?notice=${encodeURIComponent(message)}`
            : "";
          router.push(`/reports/${activeReportId}${notice}`);
        }}
      />
    );
  }

  return (
    <form
      className="mx-auto max-w-lg space-y-5 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        saveMut.mutate();
      }}
    >
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <ClientSearchSelect
          value={clientId}
          required
          onChange={(id) => {
            setClientId(id);
            setQuoteId("");
          }}
          placeholder="Cerca o crea cliente…"
        />
      </div>

      {clientId && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Preventivo (richiamo)
          </label>
          <select
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={quoteId}
            onChange={(e) => setQuoteId(e.target.value)}
          >
            <option value="">Nessun preventivo</option>
            {clientQuotes?.data
              ?.filter((q) => q.status !== "REJECTED")
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.number}
                  {q.title ? ` — ${q.title}` : ""}
                </option>
              ))}
          </select>
          {quoteId && selectedQuote && (
            <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                {selectedQuote.number}
                {selectedQuote.title ? ` — ${selectedQuote.title}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    insertQuoteBlock(buildQuoteReferenceBlock)
                  }
                >
                  Inserisci riferimenti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertQuoteBlock(buildQuoteItemsBlock)}
                >
                  Inserisci dettaglio voci
                </Button>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={`/quotes/${quoteId}`} target="_blank">
                    Apri preventivo
                  </Link>
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                I testi vengono aggiunti alla descrizione lavoro; puoi modificarli
                liberamente prima del salvataggio.
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Descrizione lavoro</label>
        <textarea
          className={textareaClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Attività svolte…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {activeReportId && (
          <div>
            <label className="mb-1 block text-sm font-medium">Data verbale</label>
            <Input
              type="date"
              value={createdAt}
              disabled={!canEditCreatedAt}
              onChange={(e) => setCreatedAt(e.target.value)}
            />
            {!canEditCreatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Non modificabile: esiste già un documento con numero progressivo
                successivo.
              </p>
            )}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Ore lavoro</label>
          <Input
            type="number"
            step="0.25"
            min="0"
            value={workHours}
            onChange={(e) => setWorkHours(e.target.value)}
            placeholder="es. 4"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Km percorsi</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={kmTraveled}
            onChange={(e) => setKmTraveled(e.target.value)}
            placeholder="es. 120"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Costi (€)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={expensesAmount}
            onChange={(e) => setExpensesAmount(e.target.value)}
            placeholder="es. 45"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Dettaglio costi</label>
        <Input
          value={expensesNotes}
          onChange={(e) => setExpensesNotes(e.target.value)}
          placeholder="Pedaggi, parcheggio, materiali…"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Voci attività</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setChecklist((c) => [...c, { label: "", checked: false }])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Voce libera
          </Button>
        </div>
        <div className="mb-3 flex gap-2">
          <select
            className="flex h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            <option value="">Seleziona voce predefinita…</option>
            {reportChecklistTemplates.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedTemplate}
            onClick={() => addChecklistTemplate(selectedTemplate)}
          >
            Aggiungi
          </Button>
        </div>
        <ul className="space-y-2">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setChecklist((list) =>
                    list.map((x, j) =>
                      j === i ? { ...x, checked: e.target.checked } : x
                    )
                  )
                }
                className="h-4 w-4 rounded border-border"
              />
              <Input
                value={item.label}
                onChange={(e) =>
                  setChecklist((list) =>
                    list.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x
                    )
                  )
                }
                placeholder="Voce attività"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setChecklist((list) => list.filter((_, j) => j !== i))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Button type="button" variant="outline" className="w-full" onClick={captureGeo}>
          <MapPin className="h-4 w-4" />
          {coords
            ? `Posizione: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            : "Registra geolocalizzazione"}
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Materiali</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setMaterials((m) => [...m, { name: "", quantity: "1", unit: "pz" }])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Materiale
          </Button>
        </div>
        <ul className="space-y-2">
          {materials.map((m, i) => (
            <li key={i} className="grid grid-cols-[1fr_72px_56px_auto] gap-2">
              <Input
                placeholder="Nome"
                value={m.name}
                onChange={(e) =>
                  setMaterials((rows) =>
                    rows.map((r, j) =>
                      j === i ? { ...r, name: e.target.value } : r
                    )
                  )
                }
              />
              <Input
                type="number"
                min="0"
                value={m.quantity}
                onChange={(e) =>
                  setMaterials((rows) =>
                    rows.map((r, j) =>
                      j === i ? { ...r, quantity: e.target.value } : r
                    )
                  )
                }
              />
              <Input
                value={m.unit}
                onChange={(e) =>
                  setMaterials((rows) =>
                    rows.map((r, j) =>
                      j === i ? { ...r, unit: e.target.value } : r
                    )
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMaterials((rows) => rows.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t border-border bg-background/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <Button
          type="submit"
          className="w-full"
          disabled={saveMut.isPending}
        >
          {saveMut.isPending ? "Salvataggio…" : "Salva e anteprima"}
        </Button>
      </div>
    </form>
  );
}
