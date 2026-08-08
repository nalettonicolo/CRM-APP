import type { Request, Response, NextFunction } from "express";
import { prismaCrm as prisma } from "../lib/prisma.js";
import { verifyAccessToken, type TokenPayload } from "../utils/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";
import { hasPermission } from "../utils/permissions.js";
import type { UserRole, PermissionAction } from "@prisma/client";
import {
  ensureIeActor,
  ensureIeWarehouse,
  wantsIeWorkspace,
} from "./workspaceDb.js";

export interface AuthRequest extends Request {
  user?: TokenPayload & { id: string };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;
    const token =
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : cookieToken;

    if (!token) throw new UnauthorizedError("Token mancante");

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, status: true, role: true, clientId: true },
    });

    if (!user || user.status === "SUSPENDED" || user.status === "INACTIVE") {
      throw new UnauthorizedError("Account non attivo");
    }

    req.user = { ...payload, id: user.id, clientId: user.clientId };

    if (wantsIeWorkspace(req)) {
      await ensureIeActor(user.id);
      await ensureIeWarehouse();
    }

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      res.status(401).json({ error: err.message, code: err.code });
      return;
    }
    res.status(401).json({ error: "Token non valido", code: "INVALID_TOKEN" });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError("Ruolo non autorizzato"));
      return;
    }
    next();
  };
}

export function requirePermission(
  resource: string,
  action: PermissionAction | string
) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!hasPermission(req.user.role, resource, action)) {
      next(new ForbiddenError("Permesso insufficiente"));
      return;
    }
    next();
  };
}

export const adminOnly = requireRoles("SUPER_ADMIN", "ADMIN");
export const staffOnly = requireRoles(
  "SUPER_ADMIN",
  "ADMIN",
  "COMMERCIAL",
  "TECHNICIAN",
  "OPERATOR",
  "WAREHOUSE"
);
