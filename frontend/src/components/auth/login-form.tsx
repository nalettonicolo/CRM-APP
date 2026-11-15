"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { authApi, settingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  getAppName,
  getLogoPath,
  type PublicSettings,
} from "@/lib/public-settings";
import { REVEAL_EASE } from "@/lib/motion-presets";
import { publicFontClasses } from "@/lib/public-fonts";
import { cn } from "@/lib/utils";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";

export function LoginForm({
  initialSettings = null,
}: {
  initialSettings?: PublicSettings | null;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** Destinazione dopo l'accesso: se valorizzata mostra il passaggio animato verso l'area. */
  const [entering, setEntering] = useState<string | null>(null);

  const { data: pub } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: settingsApi.public,
    staleTime: 60 * 1000,
    initialData: initialSettings ?? undefined,
    refetchOnMount: true,
  });

  const settings = pub ?? initialSettings;
  const appName = getAppName(settings);
  const tagline = (settings?.app_name as { tagline?: string })?.tagline?.trim();
  const logoSrc = getLogoPath(settings);
  const brandInitial = appName.charAt(0).toUpperCase() || "N";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Inserisci un indirizzo email valido.");
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.login(email, fd.get("password") as string);
      localStorage.setItem("accessToken", res.accessToken);
      setUser(res.user);
      let destination = "/dashboard";
      if (res.user.role === "CLIENT") {
        destination = "/portal";
      } else if (
        res.user.role === "ADMIN" ||
        res.user.role === "SUPER_ADMIN"
      ) {
        destination = "/seleziona-area";
      }
      if (reduceMotion) {
        router.push(destination);
      } else {
        // il passaggio animato chiama router.push alla fine (vedi onAnimationComplete)
        setEntering(destination);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Credenziali non valide";
      if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
        const api =
          process.env.NEXT_PUBLIC_API_URL || "(NEXT_PUBLIC_API_URL non impostata)";
        const tunnelHint = api.includes("trycloudflare.com")
          ? " L'URL trycloudflare è scaduto: sul Mint esegui ./backend/scripts/fix-tunnel-1033.sh, poi allinea API_URL e NEXT_PUBLIC_API_URL al nuovo URL."
          : "";
        setError(
          `Impossibile contattare l'API (${api}). Verifica che crm-api e crm-tunnel siano online sul server (pm2 list) e che Netlify usi lo stesso URL HTTPS.${tunnelHint}`
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("public-page flex min-h-screen", publicFontClasses)}>
      <div className="hidden flex-1 items-center gap-8 p-12 lg:flex">
        <div className="public-ruler h-72 shrink-0" aria-hidden />
        <div className="public-rise">
          {logoSrc ? (
            <div className="public-case mb-8 inline-block p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={appName}
                className="h-16 w-auto max-w-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="public-display mb-8 flex h-14 w-14 items-center justify-center bg-primary text-3xl text-primary-foreground">
              {brandInitial}
            </div>
          )}
          <h1 className="public-display text-6xl xl:text-7xl">{appName}</h1>
          {tagline && <p className="public-muted mt-3 text-sm">{tagline}</p>}
          <p className="public-muted mt-5 max-w-md text-lg">
            Area riservata al personale e agli amministratori.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div
          className="public-card public-case public-rise w-full max-w-md p-6 sm:p-8"
          style={
            {
              "--rise-delay": "0.1s",
              borderTop: "4px solid var(--public-tape)",
            } as React.CSSProperties
          }
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="mx-auto mb-4 h-12 w-auto max-w-[160px] object-contain lg:hidden"
            />
          ) : null}
          <h2 className="public-display text-4xl">Accedi</h2>
          <p className="public-muted mt-2 text-sm">
            Usa l&apos;email e la password del tuo account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="public-label">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                placeholder="nome@esempio.it"
                autoComplete="email"
                className="public-input"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="public-label">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className="public-input"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-sm bg-red-500/15 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-12 w-full rounded-sm text-base"
              disabled={loading || entering !== null}
            >
              {loading ? "Accesso..." : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
              Password dimenticata?
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-[color:var(--public-muted)]">
            <Link href="/" className="underline-offset-4 hover:text-primary hover:underline">
              ← Torna alla home
            </Link>
          </div>
          <LegalFooterLinks
            className="mt-4 text-sm"
            linkClassName="text-[color:var(--public-muted)] hover:text-primary"
          />
        </div>
      </div>

      {entering && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          transition={{ duration: 0.45, ease: REVEAL_EASE }}
          onAnimationComplete={() => router.push(entering)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[color:var(--public-tape)]"
        >
          <p className="public-display text-5xl text-[color:var(--public-on-tape)] sm:text-7xl">
            Accesso in corso
          </p>
        </motion.div>
      )}
    </div>
  );
}
