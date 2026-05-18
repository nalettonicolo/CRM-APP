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

  return (
    <>
      <Header title="Nuovo report" />
      <div className="p-4 sm:p-6">
        <DetailBack href="/reports" label="Torna ai report" />
        {interventionId && (
          <p className="mb-4 text-sm text-muted-foreground">
            Collegato all&apos;intervento programmato (dati precompilati).
          </p>
        )}
        <ReportCompileForm interventionId={interventionId} />
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
