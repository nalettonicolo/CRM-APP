import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { authenticate, adminOnly, type AuthRequest } from "../middleware/auth.js";
import { PERMISSION_SECTIONS } from "../constants/permissionCatalog.js";
import {
  getPermissionMatrix,
  updateRolePermissions,
} from "../services/permissionStore.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();
router.use(authenticate, adminOnly);

router.get("/matrix", async (_req, res, next) => {
  try {
    const matrix = await getPermissionMatrix();
    res.json({
      sections: PERMISSION_SECTIONS,
      ...matrix,
    });
  } catch (e) {
    next(e);
  }
});

router.put("/roles/:slug", async (req: AuthRequest, res, next) => {
  try {
    const slug = z.nativeEnum(UserRole).parse(req.params.slug);
    const { permissionIds } = z
      .object({ permissionIds: z.array(z.string()) })
      .parse(req.body);

    await updateRolePermissions(slug, permissionIds);

    await logActivity({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "role_permissions",
      entityId: slug,
      details: { permissionCount: permissionIds.length },
    });

    const matrix = await getPermissionMatrix();
    res.json(matrix);
  } catch (e) {
    next(e);
  }
});

export default router;
