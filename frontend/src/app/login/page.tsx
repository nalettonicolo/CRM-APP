"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await authApi.login(
        fd.get("email") as string,
        fd.get("password") as string
      );
      localStorage.setItem("accessToken", res.accessToken);
      setUser(res.user);
      if (res.user.role === "CLIENT") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenziali non valide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen gradient-mesh">
      <div className="hidden flex-1 flex-col justify-center p-12 lg:flex">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            N
          </div>
          <h1 className="text-3xl font-bold">NexusCRM</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Accedi al gestionale enterprise. Area riservata — nessuna
            registrazione pubblica.
          </p>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl glass"
        >
          <h2 className="text-2xl font-semibold">Accedi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inserisci le credenziali fornite dall&apos;amministratore
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                required
                placeholder="admin@crm.local"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <Input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso..." : "Accedi"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-primary hover:underline"
            >
              Password dimenticata?
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              ← Torna alla home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
