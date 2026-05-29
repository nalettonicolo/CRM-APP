"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { authApi, settingsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  getAppName,
  getLogoPath,
  type PublicSettings,
} from "@/lib/public-settings";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";

export function LoginForm({
  initialSettings = null,
}: {
  initialSettings?: PublicSettings | null;
}) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (res.user.role === "CLIENT") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
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
    <motion.div className="public-page flex min-h-screen" initial={false}>
      <div className="hidden flex-1 flex-col justify-center p-12 lg:flex">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={appName}
              className="mb-6 h-16 w-auto max-w-[200px] object-contain"
            />
          ) : (
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
              {brandInitial}
            </div>
          )}
          <h1 className="text-3xl font-bold text-white">{appName}</h1>
          {tagline && (
            <p className="mt-1 text-sm text-slate-400">{tagline}</p>
          )}
          <p className="mt-4 max-w-md text-slate-400">
            Area riservata al personale e agli amministratori.
          </p>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="public-card w-full max-w-md p-6 sm:p-8"
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="mx-auto mb-4 h-12 w-auto max-w-[160px] object-contain lg:hidden"
            />
          ) : null}
          <h2 className="text-2xl font-semibold text-white">Accedi</h2>
          <p className="mt-1 text-sm text-slate-400">
            Usa l&apos;email e la password del tuo account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <motion.div>
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
            </motion.div>
            <motion.div>
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
            </motion.div>
            {error && (
              <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
              {loading ? "Accesso..." : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/forgot-password" className="text-violet-300 hover:underline">
              Password dimenticata?
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-300 hover:underline">
              ← Torna alla home
            </Link>
          </div>
          <LegalFooterLinks
            className="mt-4"
            linkClassName="text-slate-500 hover:text-violet-300"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
