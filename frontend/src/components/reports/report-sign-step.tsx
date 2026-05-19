"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  SignaturePad,
  readSignatureFromPad,
} from "@/components/signature/signature-pad";
import { DOCUMENT_COPY } from "@/lib/document-copy";
import { reportsApi } from "@/lib/api";

export function ReportSignStep({
  reportId,
  initialTechnicianSignature,
  initialClientSignature,
  onDone,
  onBack,
}: {
  reportId: string;
  initialTechnicianSignature?: string | null;
  initialClientSignature?: string | null;
  onDone: () => void;
  onBack?: () => void;
}) {
  const techGetRef = useRef<(() => string | undefined) | undefined>(undefined);
  const clientGetRef = useRef<(() => string | undefined) | undefined>(undefined);
  const [error, setError] = useState("");

  const submitMut = useMutation({
    mutationFn: async () => {
      const technicianSignature = readSignatureFromPad(techGetRef.current);
      if (!technicianSignature) {
        throw new Error("Apponi la firma del tecnico prima di inviare.");
      }
      const clientSignature = readSignatureFromPad(clientGetRef.current);
      return reportsApi.update(reportId, {
        technicianSignature,
        clientSignature: clientSignature || undefined,
        status: "SUBMITTED",
      });
    },
    onSuccess: () => onDone(),
    onError: (e: Error) => setError(e.message || "Invio fallito."),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Apponi le firme sul verbale. Dopo l&apos;invio il documento non sarà più
        modificabile (salvo amministratori).
      </p>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <SignaturePad
        label={DOCUMENT_COPY.report.technicianSignature}
        initialDataUrl={initialTechnicianSignature}
        onReady={(fn) => {
          techGetRef.current = fn;
        }}
      />

      <SignaturePad
        label={`${DOCUMENT_COPY.report.clientSignature} (opzionale)`}
        initialDataUrl={initialClientSignature}
        onReady={(fn) => {
          clientGetRef.current = fn;
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {onBack && (
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Indietro
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          disabled={submitMut.isPending}
          onClick={() => submitMut.mutate()}
        >
          {submitMut.isPending ? "Invio…" : "Firma e invia verbale"}
        </Button>
      </div>
    </div>
  );
}

