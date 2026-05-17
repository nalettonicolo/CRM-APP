import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultBackupDir = path.resolve(__dirname, "../../backups");

function backupDir(): string {
  return path.resolve(process.env.BACKUP_DIR || config.backup.dir || defaultBackupDir);
}

function parseDatabaseUrl(url: string) {
  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/
  );
  if (!match) throw new Error("DATABASE_URL non valido");
  return {
    user: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: match[4],
    database: match[5],
  };
}

export function pruneOldBackups(retentionDays?: number): number {
  const dir = backupDir();
  if (!fs.existsSync(dir)) return 0;

  const days =
    retentionDays ??
    parseInt(process.env.BACKUP_RETENTION_DAYS || String(config.backup.retentionDays), 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let removed = 0;

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".sql") && !name.endsWith(".sql.gz")) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(full);
      removed++;
    }
  }
  return removed;
}

export type DriveUploadResult = {
  uploaded: boolean;
  message: string;
};

export async function runDatabaseBackup(): Promise<{
  file: string;
  removed: number;
  drive: DriveUploadResult;
}> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL mancante");

  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });

  const { user, password, host, port, database } = parseDatabaseUrl(dbUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `backup-${database}-${timestamp}.sql`);

  const env = { ...process.env, PGPASSWORD: password };
  execSync(
    `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${file}"`,
    { env, stdio: "pipe" }
  );

  const removed = pruneOldBackups();
  const drive = uploadBackupToGoogleDrive(dir);
  return { file, removed, drive };
}

/** Copia i file backup-*.sql su Google Drive se rclone è configurato sul server. */
function uploadBackupToGoogleDrive(dir: string): DriveUploadResult {
  const remote = process.env.RCLONE_REMOTE || "gdrive";
  const remotePath = process.env.RCLONE_PATH || "CRM-Backups";

  try {
    execSync("rclone version", { stdio: "pipe" });
  } catch {
    return {
      uploaded: false,
      message:
        "rclone non installato sul Mint. Vedi docs/gmail-e-backup-automatico.md",
    };
  }

  let remotes: string;
  try {
    remotes = execSync("rclone listremotes", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    return { uploaded: false, message: "rclone listremotes fallito" };
  }

  if (!remotes.split("\n").some((line) => line.trim() === `${remote}:`)) {
    return {
      uploaded: false,
      message: `remote "${remote}" non configurato — sul Mint: rclone config (nome: gdrive)`,
    };
  }

  try {
    execSync(`rclone mkdir "${remote}:${remotePath}"`, { stdio: "pipe" });
    execSync(
      `rclone copy "${dir}" "${remote}:${remotePath}" --include "backup-*.sql" --transfers 2`,
      { stdio: "pipe" }
    );
    return {
      uploaded: true,
      message: `Caricato su Google Drive (${remote}:${remotePath})`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { uploaded: false, message: `Upload Drive fallito: ${msg}` };
  }
}
