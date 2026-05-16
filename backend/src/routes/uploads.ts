import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { z } from "zod";
import { config } from "../config/index.js";
import { authenticate, adminOnly } from "../middleware/auth.js";
import { ValidationError } from "../utils/errors.js";

const brandingDir = path.join(config.upload.dir, "branding");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(brandingDir, { recursive: true });
    cb(null, brandingDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico"].includes(
      ext
    );
    const okMime =
      /^image\//.test(file.mimetype) ||
      file.mimetype === "image/x-icon" ||
      file.mimetype === "image/vnd.microsoft.icon";
    cb(null, okExt || okMime);
  },
});

const router = Router();

router.post(
  "/branding",
  authenticate,
  adminOnly,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const kindParam =
        typeof req.query.kind === "string"
          ? req.query.kind
          : Array.isArray(req.query.kind)
            ? req.query.kind[0]
            : "";
      z.enum(["logo", "favicon"]).parse(kindParam);
      if (!req.file) throw new ValidationError("File mancante");

      const relative = `/uploads/branding/${req.file.filename}`;
      res.json({
        relativeUrl: relative,
        url: `${config.apiUrl.replace(/\/$/, "")}${relative}`,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
