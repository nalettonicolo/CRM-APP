import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import quoteRoutes from "./routes/quotes.js";
import userRoutes from "./routes/users.js";
import inventoryRoutes from "./routes/inventory.js";
import interventionRoutes from "./routes/interventions.js";
import eventRoutes from "./routes/events.js";
import settingsRoutes from "./routes/settings.js";
import publicRoutes from "./routes/public.js";
import portalRoutes from "./routes/portal.js";
import dashboardRoutes from "./routes/dashboard.js";
import notificationRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/uploads.js";
import attachmentRoutes from "./routes/attachments.js";
import activityLogRoutes from "./routes/activityLogs.js";
import leadRoutes from "./routes/leads.js";
import invoiceRoutes from "./routes/invoices.js";
import automationRoutes from "./routes/automation.js";
import searchRoutes from "./routes/search.js";
import backupRoutes from "./routes/backup.js";
import paymentTermTemplatesRoutes from "./routes/paymentTermTemplates.js";

const app = express();

// Cloudflare tunnel / reverse proxy: rate limit e IP client corretti
app.set("trust proxy", 1);

const netlifyOrigin =
  /^https:\/\/[a-z0-9][a-z0-9-]*\.netlify\.app$/i;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (
        process.env.ALLOW_NETLIFY_PREVIEWS === "true" &&
        netlifyOrigin.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Troppe richieste" },
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Troppi tentativi di login" },
});
app.use("/api/auth/login", authLimiter);

app.use("/uploads", express.static(path.resolve(config.upload.dir)));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/uploads", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/interventions", interventionRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/payment-term-templates", paymentTermTemplatesRoutes);

app.use(errorHandler);

export default app;
