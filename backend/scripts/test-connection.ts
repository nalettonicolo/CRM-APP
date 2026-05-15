/**
 * Verifica connessione al PostgreSQL sul tuo server.
 * Uso: npm run db:test --workspace=backend
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || "";
  const masked = url.replace(/:([^:@]+)@/, ":****@");
  console.log("Connessione a:", masked || "(DATABASE_URL mancante)");

  if (!url) {
    console.error("❌ Imposta DATABASE_URL in backend/.env");
    process.exit(1);
  }

  const result = await prisma.$queryRaw<
    { version: string; db: string; user: string }[]
  >`
    SELECT
      version() as version,
      current_database() as db,
      current_user as user
  `;

  const row = result[0];
  console.log("\n✅ Connessione riuscita!");
  console.log("   Database:", row.db);
  console.log("   Utente:  ", row.user);
  console.log("   PG:      ", row.version.split(",")[0]);
}

main()
  .catch((e) => {
    console.error("\n❌ Connessione fallita:\n", e.message);
    console.error("\nControlla:");
    console.error("  - IP/host e porta in DATABASE_URL");
    console.error("  - Firewall: porta 5432 aperta verso il tuo PC/VPS API");
    console.error("  - pg_hba.conf: consenti connessioni dal client");
    console.error("  - Password con caratteri speciali → codifica URL");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
