import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.resolve(__dirname, "../../backups");

function parseDatabaseUrl(url: string) {
  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/
  );
  if (!match) throw new Error("DATABASE_URL non valido");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  };
}

async function backup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL mancante");

  fs.mkdirSync(backupDir, { recursive: true });
  const { user, password, host, port, database } = parseDatabaseUrl(dbUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `backup-${database}-${timestamp}.sql`);

  const env = { ...process.env, PGPASSWORD: password };
  execSync(
    `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${file}"`,
    { env, stdio: "inherit" }
  );

  console.log(`✅ Backup salvato: ${file}`);
}

backup().catch((e) => {
  console.error("Backup fallito:", e.message);
  process.exit(1);
});
