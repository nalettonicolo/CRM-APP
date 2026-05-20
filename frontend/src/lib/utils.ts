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

/** Valore per `<input type="date">` in ora locale (evita errori con slice UTC). */
export function toDateInputValue(iso: string | Date): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Da campo data (YYYY-MM-DD) a ISO per API, ora locale. */
export function dateInputToIso(dateOnly: string, hour: number): string {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0).toISOString();
}

/** Intervallo date evento (preventivi, lead, calendario). */
export function formatEventDateRange(
  start?: string | Date | null,
  end?: string | Date | null
): string {
  if (!start && !end) return "";
  if (start && !end) return formatDate(start);
  if (!start && end) return formatDate(end);
  const a = new Date(start!);
  const b = new Date(end!);
  const sameDay =
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay) return formatDate(a);
  return `${formatDate(a)} – ${formatDate(b)}`;
}

/** True se l'evento ricade (anche in parte) sul giorno di calendario indicato. */
export function eventSpansDay(
  day: Date,
  startAt: string | Date,
  endAt?: string | Date | null
): boolean {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : start;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
    999
  );
  return start <= dayEnd && end >= dayStart;
}
