import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";

import authRouter from "./routes/auth.js";
import organizationsRouter from "./routes/organizations.js";
import usersRouter from "./routes/users.js";
import rolesRouter from "./routes/roles.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import timeEntriesRouter from "./routes/timeEntries.js";
import chatRouter from "./routes/chat.js";
import docsRouter from "./routes/docs.js";
import whiteboardsRouter from "./routes/whiteboards.js";
import automationsRouter from "./routes/automations.js";
import reportsRouter from "./routes/reports.js";
import auditLogsRouter from "./routes/auditLogs.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:3100",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "gestionale-enterprise-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/organizations", organizationsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/roles", rolesRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/time-entries", timeEntriesRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/docs", docsRouter);
  app.use("/api/whiteboards", whiteboardsRouter);
  app.use("/api/automations", automationsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/audit-logs", auditLogsRouter);

  app.use((_req, res) => res.status(404).json({ error: "Non trovato" }));
  app.use(errorHandler);

  return app;
}
