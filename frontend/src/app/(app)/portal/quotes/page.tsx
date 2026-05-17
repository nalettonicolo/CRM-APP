"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, PenLine } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadQuotePdf, portalApi } from "@/lib/api";
import { quoteStatusLabels } from "@/lib/labels";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  SENT: "bg-blue-500/15 text-blue-700",
  ACCEPTED: "bg-green-500/15 text-green-700",
  REJECTED: "bg-red-500/15 text-red-600",
  EXPIRED: "bg-amber-500/15 text-amber-700",
};

export default function PortalQuotesPage() {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signId, setSignId] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: portalApi.dashboard,
  });

  const signMut = useMutation({
    mutationFn: () => {
      const canvas = canvasRef.current;
      if (!canvas || !signId) throw new Error("Firma mancante");
      return portalApi.signQuote(signId, canvas.toDataURL("image/png"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-dashboard"] });
      setSignId(null);
    },
  });

  const quotes = data?.quotes ?? [];

  return (
    <>
      <Header title="I tuoi preventivi" />
      <div className="p-6">
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : quotes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nessun preventivo disponibile.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((q) => (
              <Card key={q.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{q.number}</p>
                    <p className="font-semibold">{q.title || "Preventivo"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(q.createdAt)}
                    </p>
                    <span
                      className={cn(
                        "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                        statusStyle[q.status]
                      )}
                    >
                      {quoteStatusLabels[q.status] || q.status}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-semibold tabular-nums">
                      {formatCurrency(Number(q.total))}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pdfBusy === q.id}
                        onClick={async () => {
                          setPdfBusy(q.id);
                          try {
                            await downloadQuotePdf(
                              q.id,
                              `preventivo-${q.number}.pdf`
                            );
                          } finally {
                            setPdfBusy(null);
                          }
                        }}
                      >
                        <Download className="h-4 w-4" /> PDF
                      </Button>
                      {q.status === "SENT" && (
                        <Button size="sm" onClick={() => setSignId(q.id)}>
                          <PenLine className="h-4 w-4" /> Firma
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!signId} onOpenChange={(o) => !o && setSignId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firma preventivo</DialogTitle>
          </DialogHeader>
          <canvas
            ref={canvasRef}
            width={320}
            height={120}
            className="w-full rounded-lg border border-border bg-white touch-none"
            onMouseDown={(e) => draw(e, canvasRef)}
            onMouseMove={(e) => draw(e, canvasRef, true)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignId(null)}>
              Annulla
            </Button>
            <Button disabled={signMut.isPending} onClick={() => signMut.mutate()}>
              Conferma firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

let drawing = false;

function draw(
  e: React.MouseEvent<HTMLCanvasElement>,
  ref: React.RefObject<HTMLCanvasElement | null>,
  move?: boolean
) {
  const canvas = ref.current;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (!move) {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  } else if (!drawing) return;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111";
  ctx.lineTo(x, y);
  ctx.stroke();
}
