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
      <section id="eventi" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
          I nostri eventi
        </h2>
        <p className="mx-auto max-w-xl text-center text-slate-400">
          Presto pubblicheremo foto e momenti dai concerti, matrimoni e manifestazioni che
          seguiamo.
        </p>
      </section>
    );
  }

  return (
    <section id="eventi" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <h2 className="mb-2 text-center text-2xl font-bold text-white sm:text-3xl">
        I nostri eventi
      </h2>
      <p className="mb-10 text-center text-slate-400">
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
            className="public-card overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicAssetUrl(item.imagePath)}
              alt={item.title || "Evento"}
              className="aspect-[4/3] w-full object-cover"
            />
            {(item.title || item.caption) && (
              <figcaption className="p-4 text-sm">
                {item.title && <p className="font-medium text-white">{item.title}</p>}
                {item.caption && (
                  <p className="mt-1 text-slate-400">{item.caption}</p>
                )}
              </figcaption>
            )}
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
