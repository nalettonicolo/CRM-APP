"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, type UseInViewOptions } from "framer-motion";

/**
 * Entrata alla comparsa nello schermo, sicura per l'idratazione:
 * server e primo paint client mostrano tutto (`shown = true`), poi, solo se
 * l'utente non ha chiesto "riduci movimento", gli elementi non ancora visibili
 * si nascondono e compaiono quando entrano nello schermo.
 */
export function useReveal<T extends Element>(
  margin: UseInViewOptions["margin"] = "0px 0px -10% 0px"
) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin });
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setArmed(true);
  }, []);

  return { ref, shown: !armed || !!reduced || inView, reduced: !!reduced };
}

/** Curva usata da tutte le entrate delle pagine pubbliche. */
export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

type FadeUpProps =
  | { initial: false }
  | {
      initial: { opacity: number; y: number };
      animate: { opacity: number; y: number };
      transition: { delay: number; duration: number; ease: "easeOut" };
    };

/** Stesso markup su server e primo paint client (evita crash idratazione su iOS). */
export function useFadeUp(delay = 0, y = 16): FadeUpProps {
  const [props, setProps] = useState<FadeUpProps>({ initial: false });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    setProps({
      initial: { opacity: 0, y },
      animate: { opacity: 1, y: 0 },
      transition: { delay, duration: 0.45, ease: "easeOut" },
    });
  }, [delay, y]);

  return props;
}
