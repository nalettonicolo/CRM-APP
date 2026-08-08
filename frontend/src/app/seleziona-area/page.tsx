"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/store/auth";
import { usePermissions } from "@/hooks/use-permissions";
import { DEFAULT_APP_NAME } from "@/lib/branding";
import { IE_APP_NAME, IE_TAGLINE } from "@/lib/ie-branding";

function WorkspaceSelectContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isAdmin } = usePermissions();

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      router.replace(user.role === "CLIENT" ? "/portal" : "/dashboard");
    }
  }, [user, isAdmin, router]);

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Caricamento…
      </div>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="public-page relative flex min-h-screen flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(2,132,199,0.18), transparent 55%), radial-gradient(ellipse 70% 45% at 85% 75%, rgba(15,23,42,0.9), transparent 50%)",
        }}
      />

      <header className="relative z-10 px-6 pt-10 text-center sm:pt-14">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-slate-400"
        >
          Ciao{name ? `, ${name}` : ""}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          Dove vuoi lavorare?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mx-auto mt-3 max-w-md text-sm text-slate-400"
        >
          Scegli l&apos;area operativa. Potrai passare dall&apos;una all&apos;altra
          in qualsiasi momento.
        </motion.p>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-10 sm:flex-row sm:gap-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex-1"
        >
          <Link
            href="/dashboard"
            className="group flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur transition hover:border-amber-500/40 hover:bg-slate-900/90 sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-lg font-bold text-amber-300 ring-1 ring-amber-500/30">
              N
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">
              {DEFAULT_APP_NAME}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              CRM eventi, preventivi, magazzino noleggio e documenti di cortesia.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-300 transition group-hover:gap-3">
              Entra
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="flex-1"
        >
          <Link
            href="/impianti-elettrici"
            className="group flex h-full flex-col rounded-2xl border border-sky-500/20 bg-[#0c1929]/90 p-6 shadow-xl backdrop-blur transition hover:border-sky-400/50 hover:bg-[#0c1929] sm:p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white ring-1 ring-sky-400/40">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">
              {IE_APP_NAME}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              {IE_TAGLINE}. Commesse, report giornalieri e anagrafica dedicata.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sky-300 transition group-hover:gap-3">
              Entra
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </motion.div>
      </main>

      <footer className="relative z-10 pb-8 text-center text-xs text-slate-500">
        <button
          type="button"
          className="hover:text-slate-300 hover:underline"
          onClick={() => {
            localStorage.removeItem("accessToken");
            useAuthStore.getState().logout();
            router.replace("/login");
          }}
        >
          Esci
        </button>
      </footer>
    </div>
  );
}

export default function WorkspaceSelectPage() {
  return (
    <AuthGuard>
      <WorkspaceSelectContent />
    </AuthGuard>
  );
}
