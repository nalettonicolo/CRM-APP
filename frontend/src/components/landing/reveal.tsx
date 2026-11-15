"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { REVEAL_EASE, useReveal } from "@/lib/motion-presets";

/** Entrata (opacity + transform) quando il blocco entra nello schermo. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={
        shown
          ? { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: REVEAL_EASE } }
          : { opacity: 0, y, transition: { duration: 0 } }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}
