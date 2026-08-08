import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError, ConflictError } from "../utils/errors.js";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.message,
      code: err.code,
    };
    if (err instanceof ConflictError) {
      body.conflicts = err.conflicts;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validazione fallita",
      code: "VALIDATION_ERROR",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      res.status(409).json({
        error:
          "Impossibile eliminare: il record è ancora collegato ad altri dati. Riprova o contatta l'amministratore.",
        code: "FOREIGN_KEY",
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        error: "Risorsa non trovata",
        code: "NOT_FOUND",
      });
      return;
    }
  }

  console.error("[Error]", err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Errore interno del server"
        : err.message,
    code: "INTERNAL_ERROR",
  });
}
