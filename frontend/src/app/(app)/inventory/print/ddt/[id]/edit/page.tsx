"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TransportDocumentForm,
  emptyTransportForm,
  transportFormFromDocument,
  transportFormToPayload,
} from "@/components/transport/transport-document-form";
import { transportDocumentsApi } from "@/lib/api";

export default function EditTransportDocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form, setForm] = useState(emptyTransportForm());
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transport-document", id],
    queryFn: () => transportDocumentsApi.get(id),
  });

  useEffect(() => {
    if (data) setForm(transportFormFromDocument(data));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload = transportFormToPayload(form);
      if (!payload.lines.length) {
        throw new Error("Aggiungi almeno una riga merce.");
      }
      return transportDocumentsApi.update(id, payload);
    },
    onSuccess: () => router.push(`/inventory/print/ddt/${id}`),
    onError: (e: Error) => setError(e.message || "Salvataggio non riuscito."),
  });

  return (
    <>
      <Header title="Modifica DDT" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link
          href={`/inventory/print/ddt/${id}`}
          className="mb-4 inline-block text-sm text-primary hover:underline"
        >
          ← Dettaglio DDT
        </Link>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento…</p>
        ) : isError || !data ? (
          <p className="text-destructive">DDT non trovato.</p>
        ) : (
          <Card className="max-w-5xl">
            <CardContent className="p-4 sm:p-6">
              {error && (
                <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <TransportDocumentForm
                form={form}
                setForm={setForm}
                showStatus
              />
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  disabled={saveMut.isPending}
                  onClick={() => {
                    setError("");
                    saveMut.mutate();
                  }}
                >
                  Salva modifiche
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/inventory/print/ddt/${id}`}>Annulla</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
