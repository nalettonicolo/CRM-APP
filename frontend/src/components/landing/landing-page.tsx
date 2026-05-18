"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Mic2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/landing/contact-form";
import { settingsApi } from "@/lib/api";
import { BrandLogo } from "@/components/branding/brand-logo";
import { EventGallerySection } from "@/components/landing/event-gallery-section";
import {
  getAppName,
  getLogoPath,
  getSiteHome,
  type PublicSettings,
} from "@/lib/public-settings";

const featureIcons = [Mic2, Lightbulb, Wrench];

type LandingPageProps = {
  initialSettings?: PublicSettings | null;
};

export function LandingPage({ initialSettings = null }: LandingPageProps) {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
    staleTime: 60 * 1000,
    initialData: initialSettings ?? undefined,
    refetchOnMount: true,
  });

  const settings = data ?? initialSettings;
  const site = getSiteHome(settings);
  const appName = getAppName(settings);
  const logoSrc = getLogoPath(settings);

  return (
    <motion.div className="min-h-screen gradient-mesh" initial={false}>
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <motion.div className="flex items-center gap-3">
          <BrandLogo logoUrl={logoSrc || undefined} appName={appName} variant="nav" />
          <span className="text-lg font-semibold">{appName}</span>
        </motion.div>
        <motion.div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Area riservata
            </Button>
          </Link>
          <Link href="#contatto">
            <Button size="sm">
              Richiedi preventivo <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {logoSrc ? (
            <motion.div className="mb-10 lg:mb-12">
              <BrandLogo logoUrl={logoSrc} appName={appName} variant="hero" />
            </motion.div>
          ) : null}
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm text-primary">
            {site.badge}
          </span>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight lg:text-6xl">
            {site.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {site.subheadline}
          </p>
          <motion.div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="#contatto">
              <Button size="lg">
                Richiedi preventivo <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#servizi">
              <Button size="lg" variant="outline">
                I nostri servizi
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-border glass shadow-2xl"
        >
          <motion.div className="aspect-video bg-gradient-to-br from-primary/20 via-transparent to-purple-500/10 p-8">
            <motion.div className="grid h-full grid-cols-3 gap-4">
              {[
                { label: "Audio live", hint: "FOH · monitor · RF" },
                { label: "Luci evento", hint: "DMX · atmosphere" },
                { label: "Produzione", hint: "Montaggio · rider" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl bg-card/80 p-4 text-left shadow-lg backdrop-blur"
                >
                  <div className="mb-2 h-2 w-16 rounded bg-primary/30" />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-muted" />
                    <div className="h-2 w-3/4 rounded bg-muted" />
                  </div>
                  <p className="mt-4 text-xs font-medium">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground">{card.hint}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <EventGallerySection />

      <section id="servizi" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold">Servizi</h2>
        <p className="mb-12 text-center text-muted-foreground">
          Soluzioni tecniche per eventi dal vivo — su misura per venue, artisti e
          organizzatori.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {site.features.map((f, i) => {
            const Icon = featureIcons[i] ?? Mic2;
            return (
              <motion.div
                key={`${f.title}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <Icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="contatto" className="mx-auto max-w-xl px-6 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold">Contatti e preventivi</h2>
        <p className="mb-8 text-center text-muted-foreground">{site.accessIntro}</p>
        <ContactForm />
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {site.footerLine}
        </p>
      </footer>
    </motion.div>
  );
}
