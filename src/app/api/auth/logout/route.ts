import { NextRequest } from "next/server";
import { destroySession, getCurrentUser, logAudit } from "@/lib/server/auth";
import { fail, getIp, getUserAgent, ok } from "@/lib/server/api";

/** POST /api/auth/logout — clears the session cookie. */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    await destroySession();
    if (user) {
      await logAudit({
        action: "LOGOUT",
        entity: "User",
        entityId: user.id,
        actorId: user.id,
        actorName: user.username,
        details: null,
        ip: getIp(request),
        userAgent: getUserAgent(request),
      });
    }
    return ok({ loggedOut: true });
  } catch (error) {
    return fail(error);
  }
}