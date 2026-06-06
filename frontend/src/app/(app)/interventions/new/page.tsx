"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { DetailBack } from "@/components/detail/detail-shell";
import { InterventionForm } from "@/components/interventions/intervention-form";
import { interventionsApi } from "@/lib/api";
import { SECTION_CREATE } from "@/lib/section-create";

export default function NewInterventionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <Header title={SECTION_CREATE.intervention} />
      <div className="p-3 sm:p-4 md:p-6">
        <DetailBack href="/interventions" label="Torna agli interventi" />
        <Card className="max-w-2xl">
          <CardContent className="p-3 sm:p-4 md:p-6">
            {error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <InterventionForm
              submitLabel="Crea intervento"
              loading={loading}
              onSubmit={async (data) => {
                setLoading(true);
                setError("");
                try {
                  const intervention = await interventionsApi.create(data);
                  qc.invalidateQueries({ queryKey: ["interventions"] });
                  qc.invalidateQueries({ queryKey: ["clients"] });
                  qc.invalidateQueries({ queryKey: ["client", data.clientId] });
                  router.push(`/interventions/${intervention.id}`);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Errore");
                } finally {
                  setLoading(false);
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
