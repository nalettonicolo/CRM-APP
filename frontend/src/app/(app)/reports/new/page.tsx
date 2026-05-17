"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ReportCompileForm } from "@/components/reports/report-compile-form";
import { DetailBack } from "@/components/detail/detail-shell";

export default function NewReportPage() {
  return (
    <>
      <Header title="Nuovo report" />
      <div className="p-4 sm:p-6">
        <DetailBack href="/reports" label="Torna ai report" />
        <ReportCompileForm />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/reports" className="text-primary hover:underline">
            Annulla
          </Link>
        </p>
      </div>
    </>
  );
}
