import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  parseExpiresIn,
} from "../utils/jwt.js";
import { config } from "../config/index.js";
import { authenticate, type AuthRequest } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { sendEmail, emailTemplate } from "../services/email.js";
import { v4 as uuidv4 } from "uuid";
import { UnauthorizedError, ValidationError } from "../utils/errors.js";

const router = Router();

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().email()),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = parsed.email;
    const password = parsed.password.trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status === "SUSPENDED") {
      throw new UnauthorizedError("Credenziali non valide");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Credenziali non valide");

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: parseExpiresIn(config.jwt.refreshExpiresIn),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await logActivity({
      userId: user.id,
      action: "LOGIN",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh",
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        clientId: user.clientId,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token =
      req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) throw new UnauthorizedError("Refresh token mancante");

    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findFirst({
      where: { token, userId: payload.userId, revoked: false },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token scaduto");
    }

    const user = stored.user;
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: 15 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    }

    await logActivity({
      userId: req.user!.userId,
      action: "LOGOUT",
    });

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        clientId: true,
        dashboardLayout: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: "Se l'email esiste, riceverai un link" });
      return;
    }

    const token = uuidv4();
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Recupero password",
      html: emailTemplate(
        "Recupero password",
        `<p>Clicca per reimpostare la password:</p><a href="${resetUrl}">${resetUrl}</a><p>Valido 1 ora.</p>`
      ),
    });

    res.json({ message: "Se l'email esiste, riceverai un link" });
  } catch (e) {
    next(e);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(8) })
      .parse(req.body);

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new ValidationError("Token non valido o scaduto");
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: hash },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ]);

    res.json({ message: "Password aggiornata" });
  } catch (e) {
    next(e);
  }
});

export default router;
