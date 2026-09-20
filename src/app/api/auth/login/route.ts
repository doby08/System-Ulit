import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findUserByIdentifier,
  issueSession,
  logAudit,
  toSessionUser,
  verifyPassword,
} from "@/lib/server/auth";
import { ApiError, enforceRateLimit, fail, getIp, getUserAgent, ok, readJson } from "@/lib/server/api";
import { loginSchema } from "@/lib/server/validation";

/**
 * POST /api/auth/login — administrator sign-in.
 * Rate-limited per IP and audited. Session is an httpOnly JWT cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getIp(request);
    enforceRateLimit(
      `login:${ip}`,
      10,
      60_000,
      "Too many sign-in attempts from this address. Please wait a minute and try again.",
    );

    const body = await readJson(request, loginSchema);
    const identifier = body.username.trim();
    const remember = body.remember === true;

    // Case-insensitive match on username OR email (the form pre-fills "Admin").
    const user = await findUserByIdentifier(identifier);

    if (!user || !user.isActive) {
      await logAudit({
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: null,
        actorName: identifier,
        severity: "WARNING",
        details: { reason: "unknown-user-or-inactive" },
        ip,
        userAgent: getUserAgent(request),
      });
      throw new ApiError("Invalid username or password.", 401, { code: "INVALID_CREDENTIALS" });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      await logAudit({
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user.id,
        actorName: user.username,
        severity: "WARNING",
        details: { reason: "wrong-password" },
        ip,
        userAgent: getUserAgent(request),
      });
      throw new ApiError("Invalid username or password.", 401, { code: "INVALID_CREDENTIALS" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    // Use extended session TTL when "Remember me" is checked.
    await issueSession(user, remember);
    await logAudit({
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      actorId: user.id,
      actorName: user.username,
      details: null,
      ip,
      userAgent: getUserAgent(request),
    });

    return ok({
      user: toSessionUser({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarColor: user.avatarColor,
        organization: user.organization,
        lastLoginAt: new Date(),
      }),
    });
  } catch (error) {
    return fail(error);
  }
}