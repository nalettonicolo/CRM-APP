"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { eventGalleryApi } from "@/lib/api";
import { publicAssetUrl } from "@/lib/branding";

export function EventGallerySection() {
  const { data: items = [] } = useQuery({
    queryKey: ["event-gallery", "public"],
    queryFn: eventGalleryApi.public,
    staleTime: 120_000,
  });

  if (items.length === 0) {
    return (
      <section id="eventi" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold">I nostri eventi</h2>
        <p className="mx-auto max-w-xl text-center text-muted-foreground">
          Presto pubblicheremo foto e momenti dai concerti, matrimoni e
          manifestazioni che seguiamo — uno storico visivo per i nostri clienti.
        </p>
      </section>
    );
  }

  return (
    <section id="eventi" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="mb-2 text-center text-2xl font-bold">I nostri eventi</h2>
      <p className="mb-10 text-center text-muted-foreground">
        Alcuni momenti dai live che abbiamo seguito in sala.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.figure
            key={item.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicAssetUrl(item.imagePath)}
              alt={item.title || "Evento"}
              className="aspect-[4/3] w-full object-cover"
            />
            {(item.title || item.caption) && (
              <figcaption className="p-4 text-sm">
                {item.title && (
                  <p className="font-medium">{item.title}</p>
                )}
                {item.caption && (
                  <p className="mt-1 text-muted-foreground">{item.caption}</p>
                )}
              </figcaption>
            )}
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
