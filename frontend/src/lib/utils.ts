import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Prezzo con due decimali e punto (es. 1250.00) */
export function formatPrice(value: number | string): string {
  const n =
    typeof value === "string"
      ? parseFloat(String(value).trim().replace(",", "."))
      : value;
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function parsePrice(value: string): number {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatCurrency(value: number | string) {
  return `${formatPrice(value)} €`;
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
