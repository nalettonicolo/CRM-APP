import { Big_Shoulders_Display, IBM_Plex_Sans } from "next/font/google";

/**
 * Coppia di caratteri delle pagine pubbliche (home e accesso).
 * Caricati da next/font (file serviti dal sito, nessuna richiesta a Google a runtime)
 * e importati solo da queste pagine: il gestionale continua a usare Inter.
 */
export const publicDisplay = Big_Shoulders_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-display",
});

export const publicText = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-public-text",
});

export const publicFontClasses = `${publicDisplay.variable} ${publicText.variable}`;
