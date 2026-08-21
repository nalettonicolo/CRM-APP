"use client";

import Link from "next/link";
import {
  Boxes,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  NotebookPen,
  Package,
  Printer,
  Receipt,
  CalendarClock,
  Shield,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { IeHeader } from "@/components/ie/ie-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { IE_TAGLINE } from "@/lib/ie-branding";

const modules = [
  {
    hrefKey: "calendar" as const,
    title: "Calendario",
    desc: "Condiviso con Nicolò Service: niente sovrapposizioni salvo tua conferma.",
    icon: Calendar,
  },
  {
    hrefKey: "clients" as const,
    title: "Clienti",
    desc: "Anagrafica clienti Impianti Elettrici (DB separato).",
    icon: Users,
  },
  {
    hrefKey: "jobOrders" as const,
    title: "Commesse",
    desc: "Lavori multi-giorno con report giornalieri.",
    icon: ClipboardList,
  },
  {
    hrefKey: "dailyReports" as const,
    title: "Report giornalieri",
    desc: "Crea report anche vuoti e collegali dopo alla commessa.",
    icon: NotebookPen,
  },
  {
    hrefKey: "deadlines" as const,
    title: "Scadenze",
    desc: "Incassi, ricevute fornitori e spese clienti con documenti allegati.",
    icon: CalendarClock,
  },
  {
    hrefKey: "inventory" as const,
    title: "Magazzino",
    desc: "Giacenze, sedi e quantità disponibili.",
    icon: Package,
  },
  {
    hrefKey: "products" as const,
    title: "Catalogo prodotti",
    desc: "Materiali e articoli a magazzino.",
    icon: Boxes,
  },
  {
    hrefKey: "services" as const,
    title: "Catalogo servizi",
    desc: "Prestazioni e listini servizio.",
    icon: Briefcase,
  },
  {
    hrefKey: "securityCatalogs" as const,
    title: "Catalogo antifurti",
    desc: "Ajax e sistemi di sicurezza per preventivi.",
    icon: Shield,
  },
  {
    hrefKey: "supplierCatalogs" as const,
    title: "Fornitori / listini",
    desc: "PDF ufficiali e listini con scontistica.",
    icon: Truck,
  },
  {
    hrefKey: "quotes" as const,
    title: "Preventivi",
    desc: "Offerte e proposte commerciali.",
    icon: FileText,
  },
  {
    hrefKey: "invoices" as const,
    title: "Documenti di cortesia",
    desc: "Da preventivo o da commessa selezionando i report giornalieri.",
    icon: Receipt,
  },
  {
    hrefKey: "print" as const,
    title: "Documenti e stampa",
    desc: "DDT e stampe operative.",
    icon: Printer,
  },
];

export default function ImpiantiElettriciHomePage() {
  const routes = useWorkspaceRoutes();

  return (
    <>
      <IeHeader title="Panoramica" />
      <div className="p-4 sm:p-6">
        <div className="mb-6 rounded-xl border border-sky-800/40 bg-sky-950/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sky-50">Area interna riservata</p>
              <p className="mt-1 text-sm text-slate-400">{IE_TAGLINE}</p>
              <p className="mt-2 text-xs text-slate-500">
                Database separato dal gestionale Nicolò Service: stesse tabelle,
                dati indipendenti. Visibile solo agli amministratori.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const href = routes[mod.hrefKey];
            return (
              <Link key={mod.hrefKey} href={href}>
                <Card className="h-full border-slate-800 bg-slate-900/50 transition-colors hover:border-sky-700/50 hover:bg-slate-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                      <Icon className="h-5 w-5 text-sky-400" />
                      {mod.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">{mod.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
