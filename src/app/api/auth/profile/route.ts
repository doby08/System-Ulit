import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, toSessionUser } from "@/lib/server/auth";
import { ApiError, fail, getIp, getUserAgent, ok, readJson } from "@/lib/server/api";
import { profileUpdateSchema } from "@/lib/server/validation";

/** GET /api/auth/profile — current admin profile. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("Authentication required.", 401, { code: "UNAUTHORIZED" });
    return ok({ user });
  } catch (error) {
    return fail(error);
  }
}

/** PATCH /api/auth/profile — update name, email, phone, organisation, avatar colour. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("Authentication required.", 401, { code: "UNAUTHORIZED" });

    const body = await readJson(request, profileUpdateSchema);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName.trim() } : {}),
        ...(body.email !== undefined
          ? { email: body.email === "" || body.email === null ? null : body.email.trim() }
          : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.organization !== undefined ? { organization: body.organization } : {}),
        ...(body.avatarColor !== undefined ? { avatarColor: body.avatarColor } : {}),
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        avatarColor: true,
        organization: true,
        lastLoginAt: true,
      },
    });

    await logAudit({
      action: "PROFILE_UPDATED",
      entity: "User",
      entityId: user.id,
      actorId: user.id,
      actorName: user.username,
      details: body,
      ip: getIp(request),
      userAgent: getUserAgent(request),
    });

    return ok({ user: toSessionUser(updated) });
  } catch (error) {
    return fail(error);
  }
}