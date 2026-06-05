import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../utils/errors.js";

export const siteVisitInclude = {
  event: {
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      endAt: true,
      location: true,
      clientId: true,
      quoteId: true,
    },
  },
  client: { select: { id: true, companyName: true, contactName: true } },
  quote: {
    select: { id: true, number: true, title: true, eventLocation: true },
  },
  conductedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

async function generateSiteVisitNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SPL-${year}-`;
  const last = await prisma.siteVisit.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const next = last
    ? Number.parseInt(last.number.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function ensureSiteVisitForEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { siteVisit: true },
  });
  if (!event) throw new NotFoundError();

  if (event.type !== "SITE_VISIT") {
    await prisma.event.update({
      where: { id: eventId },
      data: { type: "SITE_VISIT" },
    });
  }

  if (event.siteVisit) {
    return prisma.siteVisit.findUniqueOrThrow({
      where: { id: event.siteVisit.id },
      include: siteVisitInclude,
    });
  }

  const number = await generateSiteVisitNumber();
  const location = event.location?.trim() || undefined;

  return prisma.siteVisit.create({
    data: {
      number,
      eventId: event.id,
      clientId: event.clientId,
      quoteId: event.quoteId,
      conductedById: userId,
      location,
      conductedAt: event.startAt,
      status: "DRAFT",
    },
    include: siteVisitInclude,
  });
}

/** Elenco sopralluoghi: tutti gli eventi SITE_VISIT, con scheda se già creata. */
export async function listSiteVisitEntries() {
  const events = await prisma.event.findMany({
    where: { type: "SITE_VISIT" },
    include: {
      siteVisit: { include: siteVisitInclude },
      client: { select: { id: true, companyName: true, contactName: true } },
      quote: {
        select: { id: true, number: true, title: true, eventLocation: true },
      },
    },
    orderBy: { startAt: "desc" },
  });

  return events.map((event) => {
    if (event.siteVisit) {
      return event.siteVisit;
    }

    return {
      id: `pending-${event.id}`,
      number: "Da creare",
      eventId: event.id,
      clientId: event.clientId,
      quoteId: event.quoteId,
      status: "DRAFT" as const,
      location: event.location,
      venueNotes: null,
      audioNotes: null,
      lightingNotes: null,
      accessNotes: null,
      generalNotes: null,
      conductedAt: event.startAt,
      updatedAt: event.updatedAt,
      event: {
        id: event.id,
        title: event.title,
        type: event.type,
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.location,
        clientId: event.clientId,
        quoteId: event.quoteId,
      },
      client: event.client,
      quote: event.quote,
      conductedBy: null,
      pending: true,
    };
  });
}
