"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApi } from "@/lib/api";
import { CONTACT_SERVICE_OPTIONS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [emailWarning, setEmailWarning] = useState("");
  const [services, setServices] = useState<string[]>([]);

  function toggleService(label: string) {
    setServices((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEmailWarning("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await publicApi.contact({
        name: fd.get("name") as string,
        email: fd.get("email") as string,
        phone: (fd.get("phone") as string) || undefined,
        company: (fd.get("company") as string) || undefined,
        message: fd.get("message") as string,
        services: services.length > 0 ? services : undefined,
      });
      setDone(true);
      if (res.emailWarning) setEmailWarning(res.emailWarning);
      setServices([]);
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
        {emailWarning && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            {emailWarning}
          </p>
        )}
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
        <div>
          <label className="mb-1 block text-sm font-medium">Email *</label>
          <Input name="email" type="email" required placeholder="mario@azienda.it" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Telefono</label>
          <Input name="phone" placeholder="+39 333 0000000" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Azienda</label>
          <Input name="company" placeholder="Venue / artista / organizzazione" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Servizi di interesse
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTACT_SERVICE_OPTIONS.map((label) => {
            const selected = services.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleService(label)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Messaggio *</label>
        <textarea
          name="message"
          required
          rows={4}
          className="flex w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          placeholder="Data, luogo, tipo di evento, esigenze audio/luci, orari montaggio..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Invio..." : "Invia richiesta preventivo"}
      </Button>
    </motion.form>
  );
}
