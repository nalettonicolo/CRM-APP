"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/landing/contact-form";

export default function LandingPage() {
  return (
    <motion.div className="min-h-screen gradient-mesh" initial={false}>
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-white">
            N
          </div>
          <span className="text-lg font-semibold">NexusCRM</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost">Accedi</Button>
          </Link>
          <Link href="#contatto">
            <Button>
              Richiedi demo <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm text-primary">
            Gestionale SaaS Enterprise
          </span>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight lg:text-6xl">
            Gestisci clienti, preventivi e interventi in un&apos;unica piattaforma
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            CRM premium per aziende tecniche. Preventivi avanzati, report
            mobili, magazzino intelligente e area clienti privata.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="#contatto">
              <Button size="lg">
                Inizia ora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Area riservata
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-border glass shadow-2xl"
        >
          <div className="aspect-video bg-gradient-to-br from-primary/20 via-transparent to-purple-500/10 p-8">
            <div className="grid h-full grid-cols-3 gap-4">
              {["Dashboard", "Preventivi", "Magazzino"].map((label) => (
                <div
                  key={label}
                  className="rounded-xl bg-card/80 p-4 text-left shadow-lg backdrop-blur"
                >
                  <div className="mb-2 h-2 w-16 rounded bg-primary/30" />
                  <div className="space-y-2">
                    <motion.div className="h-2 w-full rounded bg-muted" />
                    <motion.div className="h-2 w-3/4 rounded bg-muted" />
                    <motion.div className="h-2 w-1/2 rounded bg-muted" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Operatività real-time",
              desc: "Dashboard KPI, alert magazzino e calendario integrato.",
            },
            {
              icon: Shield,
              title: "Sicurezza enterprise",
              desc: "JWT, ruoli granulari, audit log e area privata clienti.",
            },
            {
              icon: CheckCircle,
              title: "Mobile-first tecnici",
              desc: "Report touch, firme digitali e compilazione tablet.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <f.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="contatto" className="mx-auto max-w-xl px-6 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold">Richiedi informazioni</h2>
        <p className="mb-8 text-center text-muted-foreground">
          Compila il modulo — ti ricontatteremo al più presto.
        </p>
        <ContactForm />
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NexusCRM — Tutti i diritti riservati
      </footer>
    </motion.div>
  );
}
