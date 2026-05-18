"use client";

import { useReducedMotion } from "framer-motion";

/** Animazioni visibili anche su mobile / con "Riduci movimento" attivo. */
export function useFadeUp(delay = 0, y = 16) {
  const reduced = useReducedMotion();
  if (reduced) {
    return { initial: false as const };
  }
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.45, ease: "easeOut" as const },
  };
}
