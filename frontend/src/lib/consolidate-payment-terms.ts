/** Allineato a backend/src/services/paymentTerms.ts — display UI/PDF coerente. */

export type PaymentTermLike = {
  id?: string;
  label: string;
  note?: string | null;
  amount?: unknown;
  isBalance?: boolean;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function consolidatePaymentTermsForDisplay<T extends PaymentTermLike>(
  terms: T[],
  quoteTotal: number
): T[] {
  if (terms.length < 2) return terms;

  const total = round2(quoteTotal);
  const withAmount = terms
    .map((term) => ({ term, amount: round2(Number(term.amount ?? 0)) }))
    .filter(({ amount }) => amount > 0.009);

  const pool = withAmount.length >= 2 ? withAmount.map((x) => x.term) : terms;
  if (pool.length < 2) return pool;

  const amounts = pool.map((t) => round2(Number(t.amount ?? 0)));
  const first = amounts[0]!;
  if (!amounts.every((a) => Math.abs(a - first) < 0.01)) return terms;

  const hasDistinctDeposit = pool.some(
    (t) => !t.isBalance && round2(Number(t.amount ?? 0)) < total - 0.01
  );
  if (hasDistinctDeposit) return terms;

  const withNote = pool.filter((t) => t.note?.trim());
  let pick: T;
  if (withNote.length === 1) {
    pick = withNote[0]!;
  } else if (withNote.length > 1) {
    pick = withNote.reduce((best, t) => {
      const score =
        (t.label?.length ?? 0) + (t.note?.trim()?.length ?? 0);
      const bestScore =
        (best.label?.length ?? 0) + (best.note?.trim()?.length ?? 0);
      return score > bestScore ? t : best;
    });
  } else {
    pick = pool.find((t) => t.isBalance) ?? pool[pool.length - 1]!;
  }

  return [pick];
}
