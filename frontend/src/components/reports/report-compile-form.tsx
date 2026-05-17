"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clientsApi,
  reportsApi,
  type ReportDetail,
  type ReportPayload,
} from "@/lib/api";

const textareaClass =
  "flex min-h-[100px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

type CheckItem = { label: string; checked: boolean };
type MaterialRow = { name: string; quantity: string; unit: string };

export function ReportCompileForm({
  reportId,
  initial,
}: {
  reportId?: string;
  initial?: ReportDetail;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const [clientId, setClientId] = useState(initial?.clientId || initial?.client?.id || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [workHours, setWorkHours] = useState(
    initial?.workHours != null ? String(Number(initial.workHours)) : ""
  );
  const [checklist, setChecklist] = useState<CheckItem[]>(
    (initial?.checklist as CheckItem[]) || [
      { label: "Impianto verificato", checked: false },
      { label: "Sicurezza OK", checked: false },
    ]
  );
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

  const { data: clientsData } = useQuery({
    queryKey: ["clients-select"],
    queryFn: () => clientsApi.list({ limit: "200" }),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (initial?.technicianSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initial.technicianSignature;
    }
  }, [initial?.technicianSignature]);

  function getSignature(): string | undefined {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return canvas.toDataURL("image/png");
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function setupCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!drawing.current) {
      drawing.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    drawing.current = false;
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

  function buildPayload(status?: string): ReportPayload {
    return {
      clientId,
      description,
      workHours: workHours ? Number(workHours) : 0,
      checklist,
      materials: materials
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name,
          quantity: Number(m.quantity) || 0,
          unit: m.unit || "pz",
        })),
      technicianSignature: getSignature(),
      latitude: coords?.lat,
      longitude: coords?.lng,
      status,
    };
  }

  const saveMut = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!clientId) throw new Error("Seleziona un cliente.");
      const payload = buildPayload(submit ? "SUBMITTED" : "DRAFT");
      if (reportId) {
        return reportsApi.update(reportId, payload);
      }
      return reportsApi.createDraft(payload);
    },
    onSuccess: (data) => {
      router.push(`/reports/${data.id}`);
    },
    onError: (e: Error) => setError(e.message || "Salvataggio fallito."),
  });

  return (
    <form
      className="mx-auto max-w-lg space-y-5 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        saveMut.mutate(true);
      }}
    >
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Cliente</label>
        <select
          className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
        >
          <option value="">Seleziona…</option>
          {clientsData?.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName || c.contactName || c.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descrizione lavoro</label>
        <textarea
          className={textareaClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Attività svolte…"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ore lavorate</label>
        <Input
          type="number"
          step="0.25"
          min="0"
          value={workHours}
          onChange={(e) => setWorkHours(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Checklist</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setChecklist((c) => [...c, { label: "", checked: false }])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Voce
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
                placeholder="Voce checklist"
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
        <label className="mb-1 block text-sm font-medium">Firma tecnico</label>
        <canvas
          ref={canvasRef}
          width={320}
          height={120}
          className="w-full max-w-full touch-none rounded-lg border border-border bg-white"
          onMouseDown={setupCanvas}
          onMouseMove={(e) => drawing.current && setupCanvas(e)}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            setupCanvas({
              clientX: t.clientX,
              clientY: t.clientY,
            } as React.MouseEvent<HTMLCanvasElement>);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            setupCanvas({
              clientX: t.clientX,
              clientY: t.clientY,
            } as React.MouseEvent<HTMLCanvasElement>);
          }}
          onTouchEnd={stopDraw}
        />
        <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={clearSignature}>
          Cancella firma
        </Button>
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
          type="button"
          variant="outline"
          className="flex-1"
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate(false)}
        >
          Salva bozza
        </Button>
        <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
          {saveMut.isPending ? "Invio…" : "Invia report"}
        </Button>
      </div>
    </form>
  );
}
