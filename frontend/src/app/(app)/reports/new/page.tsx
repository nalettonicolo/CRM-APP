"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { ReportCompileForm } from "@/components/reports/report-compile-form";
import { DetailBack } from "@/components/detail/detail-shell";

function NewReportContent() {
  const searchParams = useSearchParams();
  const interventionId = searchParams.get("interventionId") || undefined;
  const clientId = searchParams.get("clientId") || undefined;
  const quoteId = searchParams.get("quoteId") || undefined;
  const fromCalendar = Boolean(clientId || quoteId || interventionId);

  return (
    <>
      <Header title="Nuovo report" />
      <div className="p-4 sm:p-6">
        <DetailBack href="/reports" label="Torna ai report" />
        {fromCalendar && (
          <p className="mb-4 text-sm text-muted-foreground">
            Dati precompilati dall&apos;evento in calendario
            {quoteId ? " e dal preventivo collegato" : ""}.
          </p>
        )}
        <ReportCompileForm
          interventionId={interventionId}
          clientId={clientId}
          quoteId={quoteId}
        />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/reports" className="text-primary hover:underline">
            Annulla
          </Link>
        </p>
      </div>
    </>
  );
}

export default function NewReportPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Caricamento...</p>}>
      <NewReportContent />
    </Suspense>
  );
}
