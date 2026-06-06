"use client";

import Link from "next/link";
import {
  Tags,
  ClipboardList,
  Truck,
  Printer,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PrintHubItem = {
  href: string;
  label: string;
  desc: string;
  icon: typeof Truck;
  primary?: boolean;
};

const sections: { title: string; items: PrintHubItem[] }[] = [
  {
    title: "Documenti di trasporto",
    items: [
      {
        href: "/inventory/print/ddt",
        label: "DDT — Documenti di trasporto",
        desc: "Crea, gestisci e stampa DDT professionali con mittente, destinatario, causale, righe merce e firme.",
        icon: Truck,
        primary: true,
      },
    ],
  },
  {
    title: "Magazzino e noleggio",
    items: [
      {
        href: "/inventory/print/labels",
        label: "Etichette SKU",
        desc: "Stampa etichette con codice AUD/LUC e nome articolo.",
        icon: Tags,
      },
      {
        href: "/inventory/rentals/preparation",
        label: "Lista preparazione noleggio",
        desc: "Materiale a noleggio con quantità a magazzino, senza prezzi.",
        icon: ClipboardList,
      },
    ],
  },
];

export default function PrintHubPage() {
  return (
    <>
      <Header title="Stampa" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link
          href="/inventory"
          className="mb-4 inline-block text-sm text-primary hover:underline"
        >
          ← Magazzino
        </Link>

        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Centro stampa operativo: <strong>DDT</strong> per consegne e ritiri
          materiale, etichette magazzino e liste di preparazione noleggio.
        </p>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.href}
                      className={
                        item.primary
                          ? "border-primary/30 bg-primary/5 shadow-sm"
                          : "flex flex-col"
                      }
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className="h-5 w-5 text-primary" />
                          {item.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3">
                        <p className="flex-1 text-sm text-muted-foreground">
                          {item.desc}
                        </p>
                        <Button
                          asChild
                          size="sm"
                          variant={item.primary ? "default" : "secondary"}
                        >
                          <Link href={item.href}>
                            <Printer className="h-4 w-4" />
                            Apri
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-8 border-dashed">
          <CardContent className="py-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Codici SKU automatici:</strong>{" "}
            Audio → <code className="text-xs">AUD-0001</code>, Luci →{" "}
            <code className="text-xs">LUC-0001</code>, altro noleggio →{" "}
            <code className="text-xs">NOL-0001</code>. I DDT usano numerazione{" "}
            <code className="text-xs">DDT-2026-0001</code>.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
