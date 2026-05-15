import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
const extraFrontendOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

/** Origini consentite per CORS (Netlify produzione + preview + dev locale). */
export const corsOrigins = Array.from(
  new Set([
    frontendUrl,
    ...extraFrontendOrigins,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ])
);

const isProd = process.env.NODE_ENV === "production";
/** Netlify (altro dominio) + API su VPS: cookie cross-site per refresh token. */
const crossSiteCookies =
  process.env.COOKIE_SAMESITE === "none" ||
  process.env.TRUST_CROSS_SITE_COOKIES === "true";

const cookieSameSite: "lax" | "none" = crossSiteCookies ? "none" : "lax";
/** SameSite=None richiede sempre Secure (HTTPS). */
const cookieSecure = crossSiteCookies ? true : isProd;

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  apiUrl: process.env.API_URL || "http://localhost:4000",
  frontendUrl,
  corsOrigins,
  cookieSameSite,
  cookieSecure,
  databaseUrl: process.env.DATABASE_URL || "",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production-min-32",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      "dev-refresh-secret-change-in-production-min-32",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  upload: {
    dir: path.resolve(
      process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads")
    ),
    maxSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@crm.local",
    fromName: process.env.SMTP_FROM_NAME || "CRM Gestionale",
  },
  backup: {
    dir: path.resolve(process.env.BACKUP_DIR || "../backups"),
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10),
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@crm.local",
    password: process.env.ADMIN_PASSWORD || "Admin123!",
  },
};
