import fs from "fs";
import app from "./app.js";
import { config } from "./config/index.js";

fs.mkdirSync(config.upload.dir, { recursive: true });
fs.mkdirSync(config.backup.dir, { recursive: true });

app.listen(config.port, () => {
  console.log(`🚀 API CRM in ascolto su http://localhost:${config.port}`);
  console.log(`   Ambiente: ${config.env}`);
});
