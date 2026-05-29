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

      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
        <motion.div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.45_0.15_270/0.2),transparent_50%)]" />
        <motion.div className="relative mx-auto max-w-6xl">
          <motion.div {...heroMotion} className="mx-auto max-w-3xl text-center">
            <BrandLogo
              logoUrl={logoSrc || undefined}
              appName={appName}
              variant="hero"
              animated
              className="mb-4 sm:mb-6"
            />
            <span className="mb-5 inline-block rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-1.5 text-sm font-medium text-violet-200">
              {site.badge}
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.15]">
              {site.headline}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {site.subheadline}
            </p>
            <motion.div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Link href="#contatto" className="w-full sm:w-auto">
                <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
                  Richiedi preventivo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#servizi" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-white/25 bg-white/5 px-8 text-base text-white hover:bg-white/10 sm:w-auto"
                >
                  I nostri servizi
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            {...cardsMotion}
            className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3 sm:gap-4"
          >
            {[
              { label: "Audio live", hint: "FOH · monitor · RF" },
              { label: "Luci evento", hint: "DMX · atmosphere" },
              { label: "Produzione", hint: "Montaggio · rider" },
            ].map((card) => (
              <motion.div
                key={card.label}
                className="public-card rounded-xl p-4 text-left sm:p-5"
              >
                <p className="text-sm font-semibold text-white">{card.label}</p>
                <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
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
      </footer>
    </motion.div>
  );
}
