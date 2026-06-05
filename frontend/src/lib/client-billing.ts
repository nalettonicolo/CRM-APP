import type { Client } from "@/lib/api";

export type BillingFieldKey =
  | "name"
  | "address"
  | "city"
  | "postalCode"
  | "province"
  | "vatOrFiscal"
  | "sdiOrPec";

export type BillingFieldStatus = {
  key: BillingFieldKey;
  label: string;
  ok: boolean;
  hint?: string;
};

function hasName(client: Pick<
  Client,
  "companyName" | "firstName" | "lastName" | "contactName"
>): boolean {
  return !!(
    client.companyName?.trim() ||
    client.contactName?.trim() ||
    [client.firstName, client.lastName].filter(Boolean).join(" ").trim()
  );
}

/** Verifica i dati utili per documenti di cortesia e futura fatturazione elettronica. */
export function getClientBillingStatus(
  client: Pick<
    Client,
    | "companyName"
    | "firstName"
    | "lastName"
    | "contactName"
    | "address"
    | "city"
    | "postalCode"
    | "province"
    | "vatNumber"
    | "fiscalCode"
    | "pec"
    | "sdiCode"
  >
): BillingFieldStatus[] {
  const isCompany = !!client.companyName?.trim();

  return [
    {
      key: "name",
      label: isCompany ? "Ragione sociale" : "Nome e cognome / referente",
      ok: hasName(client),
      hint: isCompany
        ? "Indica la ragione sociale del cliente."
        : "Indica nome e cognome o un referente.",
    },
    {
      key: "address",
      label: "Indirizzo",
      ok: !!client.address?.trim(),
    },
    {
      key: "city",
      label: "Città",
      ok: !!client.city?.trim(),
    },
    {
      key: "postalCode",
      label: "CAP",
      ok: !!client.postalCode?.trim(),
    },
    {
      key: "province",
      label: "Provincia",
      ok: !!client.province?.trim(),
    },
    {
      key: "vatOrFiscal",
      label: isCompany ? "Partita IVA" : "Codice fiscale",
      ok: isCompany
        ? !!client.vatNumber?.trim()
        : !!client.fiscalCode?.trim(),
      hint: isCompany
        ? "Per le aziende è richiesta la P. IVA."
        : "Per i privati è richiesto il codice fiscale.",
    },
    {
      key: "sdiOrPec",
      label: "PEC o codice destinatario SDI",
      ok: !!(client.pec?.trim() || client.sdiCode?.trim()),
      hint: "Necessario per l'invio della fattura elettronica (almeno uno dei due).",
    },
  ];
}

export function isClientBillingComplete(client: Parameters<typeof getClientBillingStatus>[0]) {
  return getClientBillingStatus(client).every((f) => f.ok);
}

export function missingBillingLabels(client: Parameters<typeof getClientBillingStatus>[0]) {
  return getClientBillingStatus(client)
    .filter((f) => !f.ok)
    .map((f) => f.label);
}
