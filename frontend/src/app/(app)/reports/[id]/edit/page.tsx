"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { DetailBack } from "@/components/detail/detail-shell";
import { ReportCompileForm } from "@/components/reports/report-compile-form";
import { reportsApi } from "@/lib/api";

export default function EditReportPage() {
  const id = useParams().id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["report", id],
    queryFn: () => reportsApi.get(id),
  });

  if (data && data.status !== "DRAFT") {
    return (
      <>
        <Header title="Modifica report" />
        <div className="p-6 text-destructive">
          Solo le bozze possono essere modificate.
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Modifica report" />
      <div className="p-4 sm:p-6">
        <DetailBack href={`/reports/${id}`} label="Torna al report" />
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento…</p>
        ) : isError || !data ? (
          <p className="text-destructive">Report non trovato.</p>
        ) : (
          <ReportCompileForm reportId={id} initial={data} />
        )}
      </div>
    </>
  );
}
