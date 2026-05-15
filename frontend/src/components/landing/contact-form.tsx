"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApi } from "@/lib/api";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await publicApi.contact({
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        phone: (fd.get("phone") as string) || undefined,
        company: (fd.get("company") as string) || undefined,
        message: fd.get("message") as string,
      });
      setDone(true);
      e.currentTarget.reset();
    } catch {
      setError("Errore invio. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center"
      >
        <p className="font-medium text-green-700 dark:text-green-400">
          Richiesta inviata con successo!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome *</label>
          <Input name="name" required placeholder="Mario Rossi" />
        </div>
        <motion.div>
          <label className="mb-1 block text-sm font-medium">Email *</label>
          <Input name="email" type="email" required placeholder="mario@azienda.it" />
        </motion.div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Telefono</label>
          <Input name="phone" placeholder="+39 333 0000000" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Azienda</label>
          <Input name="company" placeholder="La tua azienda" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Messaggio *</label>
        <textarea
          name="message"
          required
          rows={4}
          className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          placeholder="Descrivi la tua richiesta..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Invio..." : "Invia richiesta"}
      </Button>
    </motion.form>
  );
}
