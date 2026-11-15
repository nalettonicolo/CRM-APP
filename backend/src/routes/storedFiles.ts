import { Router } from "express";
import fs from "fs";
import path from "path";
import { config } from "../config/index.js";
import { authenticate, staffOnly, type AuthRequest } from "../middleware/auth.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { hasPermission } from "../utils/permissions.js";
import { sendStoredFile } from "../utils/sendStoredFile.js";

// Cartella in /uploads -> permesso richiesto (gli stessi delle rotte che le caricano).
const folderPermission: Record<string, string> = {
  "supplier-catalogs": "products",
  "supplier-bills": "invoices",
  "client-expenses": "invoices",
};

const router = Router();
router.use(authenticate, staffOnly);

router.get("/:folder/:filename", (req: AuthRequest, res, next) => {
  try {
    const folder = String(req.params.folder);
    const resource = folderPermission[folder];
    if (!resource) throw new NotFoundError();
    if (!hasPermission(req.user!.role, resource, "READ")) {
      throw new ForbiddenError("Permesso insufficiente");
    }

    const filename = path.basename(String(req.params.filename));
    const filePath = path.resolve(config.upload.dir, folder, filename);
    if (!fs.existsSync(filePath)) throw new NotFoundError();

    sendStoredFile(res, filePath, filename);
  } catch (e) {
    next(e);
  }
});

export default router;
