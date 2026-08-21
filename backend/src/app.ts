import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { workspaceDbMiddleware } from "./middleware/workspaceDb.js";

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
import paymentsRoutes from "./routes/payments.js";
import eventGalleryRoutes from "./routes/eventGallery.js";
import privacyRoutes from "./routes/privacy.js";
import permissionsRoutes from "./routes/permissions.js";
import siteVisitsRoutes from "./routes/siteVisits.js";
import transportDocumentsRoutes from "./routes/transportDocuments.js";
import jobOrdersRoutes from "./routes/jobOrders.js";
import dailyReportsRoutes from "./routes/dailyReports.js";
import supplierCatalogsRoutes from "./routes/supplierCatalogs.js";
import supplierBillsRoutes from "./routes/supplierBills.js";
import clientExpensesRoutes from "./routes/clientExpenses.js";

const app = express();

// Cloudflare tunnel / reverse proxy: rate limit e IP client corretti
app.set("trust proxy", 1);

const netlifyOrigin =
  /^https:\/\/([a-z0-9][a-z0-9-]*\.)?netlify\.app$/i;

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
      // Produzione Netlify + preview deploy
      if (netlifyOrigin.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Workspace"],
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
app.use("/api", workspaceDbMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Troppi tentativi di login" },
});
app.use("/api/auth/login", authLimiter);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Troppe richieste dal form contatti. Riprova più tardi." },
});
app.use("/api/public/contact", contactLimiter);

// PDF/immagini da /uploads possono essere aperti in iframe dal frontend
// (origine diversa: es. :3000 vs :4100). Helmet di default impone
// X-Frame-Options: SAMEORIGIN e frame-ancestors 'self', che spezzano l'anteprima.
app.use("/uploads", (req, res, next) => {
  const ancestors = [
    "'self'",
    ...config.corsOrigins,
    "https://*.netlify.app",
  ].join(" ");
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", `frame-ancestors ${ancestors}`);
  next();
});
app.use("/uploads", express.static(path.resolve(config.upload.dir)));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    features: {
      serviceDelete: true,
      serviceDeletePost: true,
      serviceDeleteRemove: true,
    },
  });
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
app.use("/api/payments", paymentsRoutes);
app.use("/api/event-gallery", eventGalleryRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/site-visits", siteVisitsRoutes);
app.use("/api/transport-documents", transportDocumentsRoutes);
app.use("/api/job-orders", jobOrdersRoutes);
app.use("/api/daily-reports", dailyReportsRoutes);
app.use("/api/supplier-catalogs", supplierCatalogsRoutes);
app.use("/api/supplier-bills", supplierBillsRoutes);
app.use("/api/client-expenses", clientExpensesRoutes);

app.use(errorHandler);

export default app;
