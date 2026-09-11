import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    organizationId: string;
    membershipId: string;
    roleId: string;
  };
}

/**
 * Verifica il JWT e carica il contesto multi-tenant (organizzazione + ruolo)
 * dell'utente sulla request, per i middleware/route successivi.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    const membership = await prisma.membership.findUnique({
      where: { id: payload.membershipId },
      select: { id: true, roleId: true, organizationId: true, userId: true },
    });
    if (!membership) {
      return res.status(401).json({ error: "Sessione non valida" });
    }

    req.auth = {
      userId: membership.userId,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      roleId: membership.roleId,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Token non valido o scaduto" });
  }
}

/**
 * Permessi granulari enterprise: modulo + azione (es. "projects" + "WRITE").
 * Il ruolo "isSystem" con nome "Owner" bypassa sempre il controllo.
 */
export function requirePermission(moduleName: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Autenticazione richiesta" });
    }
    const role = await prisma.role.findUnique({
      where: { id: req.auth.roleId },
      include: { permissions: true },
    });
    if (!role) {
      return res.status(403).json({ error: "Ruolo non trovato" });
    }
    if (role.name === "Owner" && role.isSystem) {
      return next();
    }
    const allowed = role.permissions.some(
      (p) => p.module === moduleName && (p.action === action || p.action === "MANAGE"),
    );
    if (!allowed) {
      return res.status(403).json({ error: `Permesso mancante: ${moduleName}.${action}` });
    }
    next();
  };
}
