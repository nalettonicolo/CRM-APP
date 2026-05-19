"use client";

import { Button } from "@/components/ui/button";
import { ReportPdfPreview } from "@/components/reports/report-pdf-preview";
import type { ReportDetail } from "@/lib/api";

export function ReportPreviewStep({
  report,
  onSign,
  onSaveLater,
  onEdit,
}: {
  report: ReportDetail;
  onSign: () => void;
  onSaveLater: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium">{report.number}</p>
        <ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
          {report.quote && (
            <li className="sm:col-span-2">
              Preventivo: {report.quote.number}
              {report.quote.title ? ` — ${report.quote.title}` : ""}
            </li>
          )}
          <li>Ore: {Number(report.workHours)} h</li>
          {Number(report.kmTraveled) > 0 && (
            <li>Km: {Number(report.kmTraveled)}</li>
          )}
          {Number(report.expensesAmount) > 0 && (
            <li>Costi: € {Number(report.expensesAmount).toFixed(2)}</li>
          )}
        </ul>
      </div>

      <ReportPdfPreview reportId={report.id} />

      <div className="flex flex-col gap-2 sm:flex-row">
        {onEdit && (
          <Button type="button" variant="outline" className="flex-1" onClick={onEdit}>
            Modifica dati
          </Button>
        )}
        <Button type="button" variant="outline" className="flex-1" onClick={onSaveLater}>
          Salva per dopo
        </Button>
        <Button type="button" className="flex-1" onClick={onSign}>
          Firma e invia
        </Button>
      </div>
    </div>
  );
}
