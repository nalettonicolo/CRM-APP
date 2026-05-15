/**
 * Diagnostica: verifica nomi database sul server con il driver `pg`
 * (non usa Prisma). Uso: npx tsx scripts/debug-databases.ts
 */
import dotenv from "dotenv";
import pg from "pg";
import { parse } from "pg-connection-string";

dotenv.config();

const names = ["postgres", "Nicolò Service", "crm_gestionale"];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL mancante");
    process.exit(1);
  }

  const base = typeof parse === "function" ? parse(url) : {};
  console.log("Config parsata (senza password):", {
    ...base,
    password: base.password ? "[nascosta]" : undefined,
  });

  for (const db of names) {
    const client = new pg.Client({
      ...base,
      database: db,
    });
    try {
      await client.connect();
      const r = await client.query(
        "SELECT current_database(), current_user"
      );
      console.log(`✅ OK database "${db}" →`, r.rows[0]);
      await client.end();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`❌ FAIL database "${db}" →`, msg);
    }
  }
}

main();
