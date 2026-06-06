"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TransportDocumentForm,
  emptyTransportForm,
  transportFormToPayload,
} from "@/components/transport/transport-document-form";
import { transportDocumentsApi } from "@/lib/api";

export default function NewTransportDocumentPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyTransportForm());
  const [error, setError] = useState("");

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = transportFormToPayload(form);
      if (!payload.clientId) throw new Error("Seleziona un cliente.");
      if (!payload.lines.length) {
        throw new Error("Aggiungi almeno una riga merce.");
      }
      return transportDocumentsApi.create(payload);
    },
    onSuccess: (doc) => router.push(`/inventory/print/ddt/${doc.id}`),
    onError: (e: Error) => setError(e.message || "Salvataggio non riuscito."),
  });

  return (
    <>
      <Header title="Nuovo DDT" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link
          href="/inventory/print/ddt"
          className="mb-4 inline-block text-sm text-primary hover:underline"
        >
          ← Elenco DDT
        </Link>

        <Card className="max-w-5xl">
          <CardContent className="p-4 sm:p-6">
            {error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <TransportDocumentForm form={form} setForm={setForm} />
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                disabled={saveMut.isPending}
                onClick={() => {
                  setError("");
                  saveMut.mutate();
                }}
              >
                Crea DDT
              </Button>
              <Button variant="outline" asChild>
                <Link href="/inventory/print/ddt">Annulla</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
