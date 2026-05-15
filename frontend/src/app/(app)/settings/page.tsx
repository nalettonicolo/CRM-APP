"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { settingsApi } from "@/lib/api";

export default function SettingsPage() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const appName = (data?.app_name as { name?: string })?.name || "NexusCRM";
  const company = (data?.company as Record<string, string>) || {};

  return (
    <>
      <Header title="Impostazioni" />
      <div className="p-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nome gestionale
              </label>
              <Input defaultValue={appName} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Colore primario</label>
              <Input
                type="color"
                defaultValue={
                  (data?.colors as { primary?: string })?.primary || "#6366f1"
                }
                className="h-10 w-20"
              />
            </div>
            <Button>Salva branding</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dati azienda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input defaultValue={company.name} placeholder="Ragione sociale" />
            <Input defaultValue={company.vat} placeholder="P.IVA" />
            <Input defaultValue={company.email} placeholder="Email" />
            <Input defaultValue={company.phone} placeholder="Telefono" />
            <Button>Salva dati</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMTP Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="smtp.example.com" />
            <Input placeholder="587" type="number" />
            <Input placeholder="noreply@azienda.it" />
            <Button variant="outline">Test invio email</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
