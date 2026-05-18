import { prisma } from "../lib/prisma.js";

function defaultEventStart(quote: {
  eventAt: Date | null;
  acceptedAt: Date | null;
}): Date {
  if (quote.eventAt) return new Date(quote.eventAt);
  const base = quote.acceptedAt ? new Date(quote.acceptedAt) : new Date();
  base.setHours(10, 0, 0, 0);
  return base;
}

/** Crea o aggiorna un evento calendario collegato a un preventivo accettato. */
export async function syncQuoteCalendarEvent(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      clientId: true,
      total: true,
      eventAt: true,
      acceptedAt: true,
    },
  });
  if (!quote || quote.status !== "ACCEPTED") return null;

  const startAt = defaultEventStart(quote);
  const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
  const title = quote.title?.trim()
    ? `Evento: ${quote.title.trim()}`
    : `Preventivo ${quote.number}`;
  const description = `Preventivo ${quote.number} confermato · Totale ${Number(quote.total).toFixed(2)} €`;

  const existing = await prisma.event.findFirst({
    where: { quoteId: quote.id },
  });

  const data = {
    title,
    description,
    type: "MEETING" as const,
    startAt,
    endAt,
    clientId: quote.clientId,
    quoteId: quote.id,
    color: "#22c55e",
  };

  if (existing) {
    return prisma.event.update({ where: { id: existing.id }, data });
  }
  return prisma.event.create({ data });
}
