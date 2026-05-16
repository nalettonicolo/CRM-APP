"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Mic2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/landing/contact-form";
import { settingsApi } from "@/lib/api";
import {
  DEFAULT_APP_NAME,
  mergeSiteHome,
  publicAssetUrl,
} from "@/lib/branding";

const featureIcons = [Mic2, Lightbulb, Wrench];

export default function LandingPage() {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
    staleTime: 60 * 1000,
  });

  const site = mergeSiteHome(data?.site_home);
  const appName =
    ((data?.app_name as { name?: string })?.name || DEFAULT_APP_NAME).trim() ||
    DEFAULT_APP_NAME;
  const logoRel = (data?.logo as { url?: string })?.url;
  const logoSrc = publicAssetUrl(logoRel);
  const firstLetter = appName.charAt(0).toUpperCase() || "N";
  const company = (data?.company as Record<string, string>) || {};
  const contactParts = [
    company.name,
    company.email,
    company.phone,
    company.address,
    company.website,
  ].filter((x) => x && String(x).trim());

  return (
    <motion.div className="min-h-screen gradient-mesh" initial={false}>
      <nav className="flex items-center justify-between px-6 py-4 lg:px-12">
        <motion.div className="flex items-center gap-2">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 rounded-lg border border-border/40 bg-card object-contain p-0.5"
            />
          ) : (
            <motion.div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {firstLetter}
            </motion.div>
          )}
          <span className="text-lg font-semibold">{appName}</span>
        </motion.div>
        <div className="flex items-center gap-3">
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
            <div className="grid h-full grid-cols-3 gap-4">
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
                    <motion.div className="h-2 w-3/4 rounded bg-muted" />
                  </div>
                  <p className="mt-4 text-xs font-medium">{card.label}</p>
                  <p className="text-[10px] text-muted-foreground">{card.hint}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

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
        </motion.div>
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
        {contactParts.length > 0 && (
          <p className="mx-auto mt-3 max-w-lg break-words">
            {contactParts.join(" · ")}
          </p>
        )}
      </footer>
    </motion.div>
  );
}
