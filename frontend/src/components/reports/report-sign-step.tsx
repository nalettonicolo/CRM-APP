"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  SignaturePad,
  readSignatureFromPad,
} from "@/components/signature/signature-pad";
import { DOCUMENT_COPY } from "@/lib/document-copy";
import { reportsApi } from "@/lib/api";

export function ReportSignStep({
  reportId,
  clientEmail,
  initialTechnicianSignature,
  initialClientSignature,
  onDone,
  onBack,
}: {
  reportId: string;
  clientEmail?: string | null;
  initialTechnicianSignature?: string | null;
  initialClientSignature?: string | null;
  onDone: (message?: string) => void;
  onBack?: () => void;
}) {
  const qc = useQueryClient();
  const techGetRef = useRef<(() => string | undefined) | undefined>(undefined);
  const clientGetRef = useRef<(() => string | undefined) | undefined>(undefined);
  const [error, setError] = useState("");
  const [sendByEmail, setSendByEmail] = useState(Boolean(clientEmail?.trim()));

  const submitMut = useMutation({
    mutationFn: async () => {
      const technicianSignature = readSignatureFromPad(techGetRef.current);
      if (!technicianSignature) {
        throw new Error("Apponi la firma del tecnico prima di inviare.");
      }
      const clientSignature = readSignatureFromPad(clientGetRef.current);
      await reportsApi.update(reportId, {
        technicianSignature,
        clientSignature: clientSignature || undefined,
        status: "SUBMITTED",
      });

      if (sendByEmail && clientEmail?.trim()) {
        return reportsApi.sendEmail(reportId);
      }
      return null;
    },
    onSuccess: (sendResult) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report", reportId] });
      if (sendResult?.message) {
        onDone(sendResult.message);
      } else if (sendByEmail && !clientEmail?.trim()) {
        onDone(DOCUMENT_COPY.report.noClientEmail);
      } else {
        onDone("Verbale inviato e archiviato.");
      }
    },
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

      {clientEmail?.trim() ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={sendByEmail}
            onChange={(e) => setSendByEmail(e.target.checked)}
          />
          <span>
            <span className="font-medium">{DOCUMENT_COPY.report.sendEmailOnSubmit}</span>
            <span className="mt-1 block text-muted-foreground">
              {DOCUMENT_COPY.report.sendEmailOnSubmitHint} ({clientEmail.trim()})
            </span>
          </span>
        </label>
      ) : (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          {DOCUMENT_COPY.report.noClientEmail}
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
          onClick={() => {
            setError("");
            submitMut.mutate();
          }}
        >
          {submitMut.isPending
            ? "Invio…"
            : sendByEmail && clientEmail?.trim()
              ? "Firma e invia al cliente"
              : "Firma e archivia verbale"}
        </Button>
      </div>
    </div>
  );
}
