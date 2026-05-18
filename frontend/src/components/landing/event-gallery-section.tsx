"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { eventGalleryApi } from "@/lib/api";
import { publicAssetUrl } from "@/lib/branding";
import { useFadeUp } from "@/lib/motion-presets";

type GalleryItemData = {
  id: string;
  imagePath: string;
  title?: string | null;
  caption?: string | null;
};

function GalleryItem({ item, index }: { item: GalleryItemData; index: number }) {
  const fadeUp = useFadeUp(index * 0.05);
  return (
    <motion.figure {...fadeUp} className="public-card overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={publicAssetUrl(item.imagePath)}
        alt={item.title || "Evento"}
        className="aspect-[4/3] w-full object-cover"
        loading="lazy"
      />
      {(item.title || item.caption) && (
        <figcaption className="p-4 text-sm">
          {item.title && <p className="font-medium text-white">{item.title}</p>}
          {item.caption && <p className="mt-1 text-slate-400">{item.caption}</p>}
        </figcaption>
      )}
    </motion.figure>
  );
}

export function EventGallerySection() {
  const { data: items = [] } = useQuery({
    queryKey: ["event-gallery", "public"],
    queryFn: eventGalleryApi.public,
    staleTime: 120_000,
    retry: 1,
    throwOnError: false,
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
      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <GalleryItem key={item.id} item={item} index={i} />
        ))}
      </motion.div>
    </section>
  );
}
