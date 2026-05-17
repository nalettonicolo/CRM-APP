import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function syncQuotePaymentStatus(quoteId: string): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { total: true, paymentStatus: true },
  });
  if (!quote) return;

  const agg = await prisma.clientPayment.aggregate({
    where: { quoteId },
    _sum: { amount: true },
  });

  const paid = Number(agg._sum.amount ?? 0);
  const total = Number(quote.total);
  let status: PaymentStatus = "UNPAID";
  if (total > 0 && paid >= total - 0.01) status = "PAID";
  else if (paid > 0.01) status = "PARTIAL";

  if (status !== quote.paymentStatus) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        paymentStatus: status,
        balanceDue: Math.max(0, total - paid),
      },
    });
  }
}
