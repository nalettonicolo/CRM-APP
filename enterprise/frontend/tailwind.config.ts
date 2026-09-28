import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0F1024",
          raised: "#171833",
          card: "#1D1E42",
          border: "#2C2E5C",
        },
        // Unico colore di accento per elementi interattivi/brand (bottoni,
        // link, focus, logo): brand-500. La palette "accent" sotto NON è un
        // secondo colore di accento — è la palette SEMANTICA di stato
        // (successo/attenzione/urgente/informativo), usata solo su badge di
        // priorità/stato e grafici, mai su bottoni o elementi decorativi.
        brand: {
          50: "#F2EEFF",
          100: "#E4DBFF",
          300: "#B7A3FF",
          500: "#7C5CFC",
          600: "#6842F0",
          700: "#5230C9",
        },
        accent: {
          cyan: "#3ED9D9", // stato "informativo/medio" (badge, grafici)
          green: "#22C55E", // stato "fatto/successo"
          amber: "#F5A524", // stato "attenzione"
          rose: "#FB4E75", // stato "urgente/errore"
        },
      },
      fontFamily: {
        sans: ["-apple-system", "Segoe UI", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
