"use client";

import { useEffect, useState } from "react";
import { fetchReportPdfBlob } from "@/lib/api";

export function ReportPdfPreview({ reportId }: { reportId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const blob = await fetchReportPdfBlob(reportId);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setError("");
      } catch {
        if (!cancelled) setError("Impossibile caricare l'anteprima PDF.");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reportId]);

  if (error) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
        {error}
      </p>
    );
  }

  if (!url) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Caricamento anteprima…
      </p>
    );
  }

  return (
    <iframe
      title="Anteprima verbale"
      src={url}
      className="h-[min(70vh,640px)] w-full rounded-xl border border-border bg-white"
    />
  );
}
