import { prisma } from "@/lib/prisma";
import { getSessionClaims } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/api";
import { toSessionUser } from "@/lib/server/auth";

/** GET /api/auth/session — returns the current admin session (or null). */
export async function GET() {
  try {
    const claims = await getSessionClaims();
    if (!claims) return ok({ user: null });
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        avatarColor: true,
        organization: true,
        lastLoginAt: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) return ok({ user: null });
    return ok({ user: toSessionUser(user) });
  } catch (error) {
    return fail(error);
  }
}