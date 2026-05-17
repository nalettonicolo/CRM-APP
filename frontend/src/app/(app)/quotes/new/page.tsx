"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { DetailBack } from "@/components/detail/detail-shell";
import { QuoteForm } from "@/components/quotes/quote-form";
import { quotesApi } from "@/lib/api";

export default function NewQuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <Header title="Nuovo preventivo" />
      <div className="p-3 sm:p-4 md:p-6">
        <DetailBack href="/quotes" label="Torna ai preventivi" />
        <Card className="max-w-4xl">
          <CardContent className="p-3 sm:p-4 md:p-6">
            {error && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <QuoteForm
              submitLabel="Crea preventivo"
              loading={loading}
              onSubmit={async (data) => {
                setLoading(true);
                setError("");
                try {
                  const quote = await quotesApi.create({
                    clientId: data.clientId,
                    title: data.title,
                    notes: data.notes,
                    validUntil: data.validUntil,
                    depositPercent: data.depositPercent,
                    depositAmount: data.depositAmount,
                    items: data.items.map((i) => ({
                      type: i.type,
                      description: i.description,
                      quantity: i.quantity,
                      unitPrice: i.unitPrice,
                      vatRate: i.vatRate,
                    })),
                  });
                  router.push(`/quotes/${quote.id}`);
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
