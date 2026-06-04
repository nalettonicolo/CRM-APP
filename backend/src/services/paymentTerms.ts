export interface PaymentTermInput {
  label: string;
  note?: string | null;
  percent?: number | null;
  amount?: number | null;
  isBalance?: boolean;
  dueDate?: string | null;
}

export interface ResolvedPaymentTerm extends PaymentTermInput {
  amount: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Calcola importi per ogni rata; le righe "saldo" prendono il residuo. */
export function resolvePaymentTerms(
  total: number,
  terms: PaymentTermInput[]
): ResolvedPaymentTerm[] {
  if (!terms.length) return [];

  const ordered = [...terms];
  const nonBalance = ordered.filter((t) => !t.isBalance);
  const balanceRows = ordered.filter((t) => t.isBalance);

  let allocated = 0;
  const resolved: ResolvedPaymentTerm[] = [];

  for (const t of nonBalance) {
    let amt = 0;
    if (t.amount != null && t.amount > 0) {
      amt = t.amount;
    } else if (t.percent != null && t.percent > 0) {
      amt = total * (t.percent / 100);
    }
    amt = round2(amt);
    allocated += amt;
    resolved.push({ ...t, amount: amt });
  }

  const remainder = round2(Math.max(0, total - allocated));

  if (balanceRows.length) {
    for (const t of balanceRows) {
      resolved.push({ ...t, amount: remainder });
    }
  } else if (remainder > 0 && nonBalance.length > 0) {
    resolved.push({
      label: "Saldo",
      isBalance: true,
      amount: remainder,
    });
  }

  return resolved;
}

/**
 * Unifica righe ridondanti (stesso importo = intero preventivo, es. due "saldo" uguali).
 * Mantiene la riga con nota o il saldo residuo se non ci sono acconti distinti.
 */
export function consolidatePaymentTermsForDisplay<T extends {
  label: string;
  note?: string | null;
  amount?: unknown;
  isBalance?: boolean;
}>(
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

export function paymentTermsTotals(
  total: number,
  terms: PaymentTermInput[]
): { depositAmount: number; balanceDue: number; depositPercent: number } {
  const resolved = resolvePaymentTerms(total, terms);
  const balanceDue = round2(
    resolved.find((t) => t.isBalance)?.amount ??
      Math.max(
        0,
        total - resolved.filter((t) => !t.isBalance).reduce((s, t) => s + t.amount, 0)
      )
  );
  const depositAmount = round2(total - balanceDue);
  const depositPercent =
    total > 0 ? round2((depositAmount / total) * 100) : 0;

  return { depositAmount, balanceDue, depositPercent };
}
