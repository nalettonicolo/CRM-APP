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
