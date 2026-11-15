"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Mic2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/branding/brand-logo";
import { ContactForm } from "@/components/landing/contact-form";
import { PublicHeader } from "@/components/landing/public-header";
import { Reveal } from "@/components/landing/reveal";
import { settingsApi } from "@/lib/api";
import { REVEAL_EASE, useReveal } from "@/lib/motion-presets";
import { publicFontClasses } from "@/lib/public-fonts";
import { cn } from "@/lib/utils";
import { EventGallerySection } from "@/components/landing/event-gallery-section";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import {
  getAppName,
  getLogoPath,
  getSiteHome,
  type PublicSettings,
} from "@/lib/public-settings";

const featureIcons = [Mic2, Lightbulb, Wrench];
const riseDelay = (s: string) => ({ "--rise-delay": s }) as CSSProperties;
/** Livelli del "meter" di ogni canale: puramente decorativi. */
const meterLevels = [0.82, 0.64, 0.9];

/** Un servizio = un canale del mixer: numero, titolo, descrizione e meter che sale. */
function ServiceChannel({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) {
  const Icon = featureIcons[index] ?? Mic2;
  const { ref, shown } = useReveal<HTMLLIElement>();
  const level = meterLevels[index] ?? 0.7;
  return (
    <motion.li
      ref={ref}
      initial={false}
      animate={
        shown
          ? {
              opacity: 1,
              y: 0,
              transition: { duration: 0.55, delay: index * 0.1, ease: REVEAL_EASE },
            }
          : { opacity: 0, y: 24, transition: { duration: 0 } }
      }
      className="grid gap-3 border-t border-[color:var(--public-line)] py-8 md:grid-cols-[5.5rem_minmax(0,17rem)_minmax(0,1fr)] md:gap-8"
    >
      <p
        className="public-display text-5xl text-primary md:text-6xl"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </p>
      <h3 className="flex items-start gap-3 text-xl font-semibold text-[color:var(--public-bone)]">
        <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
        {title}
      </h3>
      <div>
        <p className="public-muted leading-relaxed">{description}</p>
        <div
          className="mt-5 h-1.5 w-full max-w-sm bg-[color:var(--public-line)]"
          aria-hidden
        >
          <motion.span
            initial={false}
            animate={{
              scaleX: shown ? level : 0,
              transition: {
                duration: 0.9,
                delay: 0.2 + index * 0.1,
                ease: REVEAL_EASE,
              },
            }}
            className="block h-full origin-left bg-primary"
          />
        </div>
      </div>
    </motion.li>
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

  return (
    <div className={cn("public-page min-h-screen", publicFontClasses)}>
      <PublicHeader appName={appName} logoSrc={logoSrc} />

      <section className="px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:gap-16">
            <div>
              <span className="public-tape public-tape-in mb-6">{site.badge}</span>
              <h1
                className="public-display public-rise text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-[5.25rem]"
                style={riseDelay("0.08s")}
              >
                {site.headline}
              </h1>
              <p
                className="public-muted public-rise mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
                style={riseDelay("0.18s")}
              >
                {site.subheadline}
              </p>
              <div
                className="public-rise mt-8 flex flex-col gap-3 sm:flex-row"
                style={riseDelay("0.28s")}
              >
                <Link href="#contatto" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full rounded-sm px-8 text-base sm:w-auto">
                    Richiedi preventivo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#servizi" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full rounded-sm border-white/35 bg-transparent px-8 text-base text-[color:var(--public-bone)] hover:border-white/60 hover:bg-white/10 sm:w-auto"
                  >
                    I nostri servizi
                  </Button>
                </Link>
              </div>
            </div>

            {logoSrc && (
              <div
                className="public-rise hidden justify-center sm:flex lg:justify-end"
                style={riseDelay("0.2s")}
              >
                <div className="public-case p-5">
                  <BrandLogo logoUrl={logoSrc} appName={appName} variant="hero" />
                </div>
              </div>
            )}
          </div>

          <Reveal delay={0.1} className="mt-12 sm:mt-16">
            <ul className="grid divide-y divide-[color:var(--public-line)] border-y border-[color:var(--public-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                { label: "Audio live", hint: "FOH · monitor · RF", icon: Mic2 },
                { label: "Luci evento", hint: "DMX · atmosphere", icon: Lightbulb },
                { label: "Produzione", hint: "Montaggio · allestimento", icon: Wrench },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <li key={card.label} className="flex items-start gap-4 px-1 py-5 sm:px-6">
                    <span className="public-display pt-0.5 text-2xl text-primary" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-base font-semibold text-[color:var(--public-bone)]">
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                        {card.label}
                      </p>
                      <p className="public-muted mt-1 text-sm">{card.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      <div className="public-section-alt">
        <EventGallerySection />
      </div>

      <section
        id="servizi"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <Reveal className="mb-10 max-w-2xl">
          <span className="public-tape mb-4">Scaletta tecnica</span>
          <h2 className="public-display text-4xl sm:text-5xl">Servizi</h2>
          <p className="public-muted mt-4 text-lg">
            Soluzioni tecniche per eventi dal vivo — su misura per venue, artisti e
            organizzatori.
          </p>
        </Reveal>
        <ol className="border-b border-[color:var(--public-line)]">
          {site.features.map((f, i) => (
            <ServiceChannel
              key={`${f.title}-${i}`}
              title={f.title}
              description={f.description}
              index={i}
            />
          ))}
        </ol>
      </section>

      <section
        id="contatto"
        className="public-section-alt scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
          <Reveal className="lg:pt-2">
            <span className="public-tape mb-4">Prova audio</span>
            <h2 className="public-display text-4xl sm:text-5xl">Contatti e preventivi</h2>
            <p className="public-muted mt-4 max-w-md text-lg">{site.accessIntro}</p>
          </Reveal>
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-[color:var(--public-line)] px-4 py-8 text-center text-sm text-[color:var(--public-muted)]">
        <p>
          © {new Date().getFullYear()} {site.footerLine}
        </p>
        <LegalFooterLinks
          className="mt-3"
          linkClassName="text-[color:var(--public-muted)] hover:text-primary"
        />
      </footer>
    </div>
  );
}
