/** Parte pura (senza database) della numerazione dei documenti di trasporto. */

/** Dato l'elenco dei numeri DDT già usati, calcola il prossimo dell'anno. */
export function nextTransportDocumentNumber(
  numbers: string[],
  year: number
): string {
  const prefix = `DDT-${year}-`;
  let max = 0;
  const re = new RegExp(`^DDT-${year}-(\\d+)$`);
  for (const number of numbers) {
    const m = number.match(re);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function formatTransportDocumentNumber(number: string): string {
  const m = number.match(/^DDT-(\d{4})-(\d+)$/);
  if (!m) return number;
  return `DDT-${m[1]}-${m[2].padStart(4, "0")}`;
}
