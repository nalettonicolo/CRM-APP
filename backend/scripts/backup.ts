import dotenv from "dotenv";
import { runDatabaseBackup } from "../src/services/backup.js";

dotenv.config();

runDatabaseBackup()
  .then(({ file, removed }) => {
    console.log(`✅ Backup salvato: ${file}`);
    if (removed > 0) console.log(`🗑️  Rimossi ${removed} backup scaduti`);
  })
  .catch((e: Error) => {
    console.error("Backup fallito:", e.message);
    process.exit(1);
  });
