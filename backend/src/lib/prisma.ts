import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";

function createClient(url: string | undefined, label: string): PrismaClient {
  if (!url?.trim()) {
    throw new Error(`${label} mancante (configura nel .env)`);
  }
  return new PrismaClient({
    datasources: { db: { url } },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prismaCrm?: PrismaClient;
  prismaIe?: PrismaClient | null;
};

export const prismaCrm =
  globalForPrisma.prismaCrm ??
  createClient(process.env.DATABASE_URL, "DATABASE_URL");

export const prismaIe: PrismaClient | null = (() => {
  const url = process.env.DATABASE_URL_IE?.trim();
  if (!url) return null;
  if (globalForPrisma.prismaIe !== undefined) return globalForPrisma.prismaIe;
  return createClient(url, "DATABASE_URL_IE");
})();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaCrm = prismaCrm;
  globalForPrisma.prismaIe = prismaIe;
}

const dbStore = new AsyncLocalStorage<PrismaClient>();

/** Database attivo per la richiesta corrente (CRM o Impianti Elettrici). */
export function getDb(): PrismaClient {
  return dbStore.getStore() ?? prismaCrm;
}

export function runWithDb<T>(db: PrismaClient, fn: () => T): T {
  return dbStore.run(db, fn);
}

export function isIeDatabaseConfigured(): boolean {
  return prismaIe != null;
}

/** Client Prisma del workspace corrente (CRM o IE). */
function createDbProxy(getClient: () => PrismaClient): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = getClient();
      const value = Reflect.get(client, prop, client);
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  });
}

/** Usare nei route handler / servizi dati (rispetta X-Workspace). */
export const prisma = createDbProxy(getDb);
