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
        brand: {
          50: "#F2EEFF",
          100: "#E4DBFF",
          300: "#B7A3FF",
          500: "#7C5CFC",
          600: "#6842F0",
          700: "#5230C9",
        },
        accent: {
          cyan: "#3ED9D9",
          green: "#22C55E",
          amber: "#F5A524",
          rose: "#FB4E75",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "Segoe UI", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(124,92,252,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
