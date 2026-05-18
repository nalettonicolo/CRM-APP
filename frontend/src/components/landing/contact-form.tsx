"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
        className="public-card rounded-2xl border border-green-500/40 bg-green-500/10 p-8 text-center"
      >
        <p className="font-medium text-green-300">Richiesta inviata con successo!</p>
        {emailWarning && (
          <p className="mt-3 text-sm text-amber-300">{emailWarning}</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="public-card space-y-5 rounded-2xl p-5 sm:p-6"
    >
      <motion.div className="space-y-5">
        <motion.div>
          <label htmlFor="contact-name" className="public-label">
            Nome *
          </label>
          <input
            id="contact-name"
            name="name"
            required
            placeholder="Mario Rossi"
            className="public-input"
            autoComplete="name"
          />
        </motion.div>
        <motion.div>
          <label htmlFor="contact-email" className="public-label">
            Email *
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            placeholder="mario@azienda.it"
            className="public-input"
            autoComplete="email"
          />
        </motion.div>
      </motion.div>

      <motion.div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
        <motion.div>
          <label htmlFor="contact-phone" className="public-label">
            Telefono
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            placeholder="+39 333 0000000"
            className="public-input"
            autoComplete="tel"
          />
        </motion.div>
        <motion.div>
          <label htmlFor="contact-company" className="public-label">
            Azienda / venue
          </label>
          <input
            id="contact-company"
            name="company"
            placeholder="Organizzazione evento"
            className="public-input"
            autoComplete="organization"
          />
        </motion.div>
      </motion.div>

      <motion.div>
        <span className="public-label">Servizi di interesse</span>
        <motion.div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {CONTACT_SERVICE_OPTIONS.map((label) => {
            const selected = services.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleService(label)}
                className={cn(
                  "public-chip rounded-xl border text-left font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary/25 text-violet-100"
                    : "border-white/20 bg-slate-900/60 text-slate-300 hover:border-primary/50"
                )}
              >
                {label}
              </button>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div>
        <label htmlFor="contact-message" className="public-label">
          Messaggio *
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="public-input min-h-[8rem] resize-y py-3"
          placeholder="Data, luogo, tipo di evento, esigenze audio/luci, orari montaggio..."
        />
      </motion.div>

      {error && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
        {loading ? "Invio..." : "Invia richiesta preventivo"}
      </Button>
    </motion.form>
  );
}
