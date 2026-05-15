import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
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

  console.error("[Error]", err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Errore interno del server"
        : err.message,
    code: "INTERNAL_ERROR",
  });
}
