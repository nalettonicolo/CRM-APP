"use client";

import { useEffect, useState } from "react";

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
