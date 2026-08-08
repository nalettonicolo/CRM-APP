"use client";

import Link from "next/link";
import { Truck, Tags } from "lucide-react";
import { IeHeader } from "@/components/ie/ie-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";

export default function IePrintHubPage() {
  const routes = useWorkspaceRoutes();

  const items = [
    {
      href: routes.printDdt,
      label: "DDT — Documenti di trasporto",
      desc: "Crea e stampa DDT professionali.",
      icon: Truck,
      primary: true,
    },
    {
      href: `${routes.printLabels}`,
      label: "Etichette magazzino",
      desc: "Stampa etichette con codice SKU.",
      icon: Tags,
    },
  ];

  return (
    <>
      <IeHeader title="Documenti e stampa" />
      <div className="p-4 sm:p-6">
        <p className="mb-6 text-sm text-slate-400">
          Centro stampa per impianti elettrici: DDT e etichette. Stessi dati del
          magazzino condiviso.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                className={
                  item.primary
                    ? "border-sky-700/40 bg-sky-950/30"
                    : "border-slate-800 bg-slate-900/50"
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                    <Icon className="h-5 w-5 text-sky-400" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-slate-400">{item.desc}</p>
                  <Button asChild size="sm" variant={item.primary ? "default" : "secondary"}>
                    <Link href={item.href}>Apri</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
