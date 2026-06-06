export const TRANSPORT_REASON_OPTIONS = [
  { value: "RENTAL", label: "Noleggio" },
  { value: "SALE", label: "Vendita" },
  { value: "DEPOSIT", label: "Conto deposito" },
  { value: "LOAN", label: "Conto visione" },
  { value: "RETURN", label: "Reso" },
  { value: "REPAIR", label: "Riparazione" },
  { value: "OTHER", label: "Altro" },
] as const;

export const TRANSPORT_CARRIER_OPTIONS = [
  { value: "SENDER", label: "Mittente" },
  { value: "RECIPIENT", label: "Destinatario" },
  { value: "CARRIER", label: "Vettore" },
] as const;

export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  ISSUED: "Emesso",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};

export const TRANSPORT_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-500/15 text-gray-600",
  ISSUED: "bg-blue-500/15 text-blue-700",
  DELIVERED: "bg-green-500/15 text-green-700",
  CANCELLED: "bg-red-500/15 text-red-600",
};

export function transportReasonLabel(value: string) {
  return TRANSPORT_REASON_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function transportCarrierLabel(value: string) {
  return TRANSPORT_CARRIER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
