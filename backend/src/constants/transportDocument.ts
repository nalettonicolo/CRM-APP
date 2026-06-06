export const TRANSPORT_REASON_LABELS: Record<string, string> = {
  SALE: "Vendita",
  RENTAL: "Noleggio",
  DEPOSIT: "Conto deposito",
  LOAN: "Conto visione",
  RETURN: "Reso",
  REPAIR: "Riparazione",
  OTHER: "Altro",
};

export const TRANSPORT_CARRIER_LABELS: Record<string, string> = {
  SENDER: "Mittente",
  RECIPIENT: "Destinatario",
  CARRIER: "Vettore",
};

export const TRANSPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  ISSUED: "Emesso",
  DELIVERED: "Consegnato",
  CANCELLED: "Annullato",
};
