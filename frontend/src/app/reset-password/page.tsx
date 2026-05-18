"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Link non valido: token mancante.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset non riuscito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl glass"
    >
      <h1 className="text-2xl font-semibold">Nuova password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Scegli una nuova password per il tuo account.
      </p>

      {!token && (
        <p className="mt-6 rounded-lg bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-300">
          Link non valido o scaduto. Richiedi un nuovo reset dalla pagina login.
        </p>
      )}

      {done ? (
        <p className="mt-6 rounded-lg bg-green-500/10 px-3 py-3 text-sm text-green-700 dark:text-green-400">
          Password aggiornata. Reindirizzamento al login...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nuova password</label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Conferma password</label>
            <Input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? "Salvataggio..." : "Imposta password"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          ← Torna al login
        </Link>
      </p>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center public-page p-6">
      <Suspense
        fallback={
          <p className="text-muted-foreground">Caricamento...</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
