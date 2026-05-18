"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { DetailBack } from "@/components/detail/detail-shell";
import { QuoteForm } from "@/components/quotes/quote-form";
import { quotesApi } from "@/lib/api";

export default function EditQuotePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => quotesApi.get(id),
  });

  return (
    <>
      <Header title="Modifica preventivo" />
      <div className="p-6">
        <DetailBack href={`/quotes/${id}`} label="Torna al preventivo" />
        <Card className="max-w-4xl">
          <CardContent className="p-6">
            {isLoading ? (
              <p className="text-muted-foreground">Caricamento...</p>
            ) : !quote ? (
              <p className="text-destructive">Preventivo non trovato.</p>
            ) : (
              <>
                {error && (
                  <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <QuoteForm
                  initial={quote}
                  submitLabel="Salva modifiche"
                  loading={loading}
                  onSubmit={async (data) => {
                    setLoading(true);
                    setError("");
                    try {
                      await quotesApi.update(id, {
                        title: data.title,
                        notes: data.notes,
                        validUntil: data.validUntil ?? null,
                        eventAt: data.eventAt ?? null,
                        withholdingTaxPercent: data.withholdingTaxPercent,
                        withholdingTaxAmount: data.withholdingTaxAmount,
                        stampDutyAmount: data.stampDutyAmount,
                        paymentTerms: data.paymentTerms,
                        items: data.items.map((i) => ({
                          type: i.type,
                          description: i.description,
                          quantity: i.quantity,
                          unitPrice: i.unitPrice,
                          vatRate: i.vatRate,
                          unit: i.unit,
                          serviceId: i.serviceId,
                          productId: i.productId,
                        })),
                      });
                      router.push(`/quotes/${id}`);
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : "Errore");
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
