"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Mic2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/branding/brand-logo";
import { ContactForm } from "@/components/landing/contact-form";
import { PublicHeader } from "@/components/landing/public-header";
import { settingsApi } from "@/lib/api";
import { useFadeUp } from "@/lib/motion-presets";
import { EventGallerySection } from "@/components/landing/event-gallery-section";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import {
  getAppName,
  getLogoPath,
  getSiteHome,
  type PublicSettings,
} from "@/lib/public-settings";

const featureIcons = [Mic2, Lightbulb, Wrench];

function ServiceFeatureCard({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) {
  const Icon = featureIcons[index] ?? Mic2;
  const fadeUp = useFadeUp(index * 0.08);
  return (
    <motion.div {...fadeUp} className="public-card p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
    </motion.div>
  );
}

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
    retry: 1,
    throwOnError: false,
  });

  const settings = data ?? initialSettings;
  const site = getSiteHome(settings);
  const appName = getAppName(settings);
  const logoSrc = getLogoPath(settings);
  const heroMotion = useFadeUp(0, 12);
  const cardsMotion = useFadeUp(0.12, 20);

  return (
    <motion.div className="public-page min-h-screen">
      <PublicHeader appName={appName} logoSrc={logoSrc} />

      <section className="relative overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,oklch(0.45_0.15_270/0.22),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_40%,oklch(0.35_0.12_290/0.15),transparent_40%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
            <motion.div
              {...heroMotion}
              className="mx-auto max-w-2xl text-center lg:mx-0 lg:max-w-none lg:text-left"
            >
              <span className="mb-4 inline-block rounded-full border border-violet-400/35 bg-violet-500/10 px-3.5 py-1 text-xs font-medium tracking-wide text-violet-200 sm:text-sm">
                {site.badge}
              </span>
              <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.65rem] xl:text-5xl">
                {site.headline}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-300/95 sm:text-lg lg:mx-0">
                {site.subheadline}
              </p>
              <motion.div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="#contatto" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full px-8 text-base shadow-lg shadow-primary/20 sm:w-auto">
                    Richiedi preventivo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#servizi" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full border-white/20 bg-white/5 px-8 text-base text-white hover:border-white/30 hover:bg-white/10 sm:w-auto"
                  >
                    I nostri servizi
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {logoSrc && (
              <motion.div
                {...heroMotion}
                className="hidden justify-center sm:flex lg:justify-end"
              >
                <BrandLogo
                  logoUrl={logoSrc}
                  appName={appName}
                  variant="hero"
                  animated
                  className="lg:mr-2"
                />
              </motion.div>
            )}
          </div>

          <motion.div
            {...cardsMotion}
            className="mx-auto mt-10 grid max-w-4xl gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4"
          >
            {[
              { label: "Audio live", hint: "FOH · monitor · RF", icon: Mic2 },
              { label: "Luci evento", hint: "DMX · atmosphere", icon: Lightbulb },
              { label: "Produzione", hint: "Montaggio · rider", icon: Wrench },
            ].map((card) => {
              const Icon = card.icon;
              return (
              <motion.div
                key={card.label}
                className="public-card flex items-start gap-3 rounded-xl p-4 sm:p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-white">{card.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {card.hint}
                  </p>
                </div>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <motion.div className="public-section-alt">
        <EventGallerySection />
      </motion.div>

      <section id="servizi" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <motion.div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Servizi</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Soluzioni tecniche per eventi dal vivo — su misura per venue, artisti e
            organizzatori.
          </p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-3">
          {site.features.map((f, i) => (
            <ServiceFeatureCard
              key={`${f.title}-${i}`}
              title={f.title}
              description={f.description}
              index={i}
            />
          ))}
        </div>
      </section>

      <section
        id="contatto"
        className="public-section-alt px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <motion.div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Contatti e preventivi
          </h2>
          <p className="mb-8 mt-3 text-center text-slate-400">{site.accessIntro}</p>
          <ContactForm />
        </motion.div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-500">
        <p>
          © {new Date().getFullYear()} {site.footerLine}
        </p>
        <LegalFooterLinks
          className="mt-3"
          linkClassName="text-slate-400 hover:text-violet-300"
        />
      </footer>
    </motion.div>
  );
}
