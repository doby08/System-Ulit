import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hashPassword,
  logAudit,
  validatePasswordStrength,
  verifyPassword,
} from "@/lib/server/auth";
import { ApiError, fail, getIp, getUserAgent, ok, readJson } from "@/lib/server/api";
import { changePasswordSchema } from "@/lib/server/validation";

/** POST /api/auth/change-password — admin rotates their own password. */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("Authentication required.", 401, { code: "UNAUTHORIZED" });

    const body = await readJson(request, changePasswordSchema);
    if (body.newPassword !== body.confirmPassword) {
      throw new ApiError("The new passwords do not match.", 400, { code: "PASSWORD_MISMATCH" });
    }
    const strength = validatePasswordStrength(body.newPassword);
    if (!strength.valid) {
      throw new ApiError(`Password must include ${strength.problems.join(", ")}.`, 400, {
        code: "WEAK_PASSWORD",
        details: strength.problems,
      });
    }

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) throw new ApiError("Account not found.", 404, { code: "NOT_FOUND" });

    const matches = await verifyPassword(body.currentPassword, record.passwordHash);
    if (!matches) {
      throw new ApiError("Your current password is incorrect.", 400, {
        code: "WRONG_PASSWORD",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });

    await logAudit({
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user.id,
      actorId: user.id,
      actorName: user.username,
      severity: "WARNING",
      details: null,
      ip: getIp(request),
      userAgent: getUserAgent(request),
    });

    return ok({ changed: true });
  } catch (error) {
    return fail(error);
  }
}