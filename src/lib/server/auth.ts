/**
 * Administrator authentication: bcrypt password hashing, JWT cookie sessions,
 * profile/password management and audit logging.
 */
import bcrypt from "bcryptjs";
import { prisma, isPostgres } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionTtlSeconds,
  verifySessionToken,
  type SessionClaims,
} from "@/lib/server/jwt";
import type { SessionUser } from "@/lib/types";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Password policy enforced on admin creation & password change. */
export function validatePasswordStrength(password: string) {
  const problems: string[] = [];
  if (password.length < 8) problems.push("at least 8 characters");
  if (!/[a-z]/.test(password)) problems.push("one lowercase letter");
  if (!/[A-Z]/.test(password)) problems.push("one uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("one number");
  return { valid: problems.length === 0, problems };
}

/**
 * Resolves an administrator by username OR email, matching CASE-INSENSITIVELY.
 *
 * The sign-in form pre-fills "Admin" while existing accounts may be stored with
 * any capitalisation, so an exact `equals` lookup wrongly rejected valid logins.
 * PostgreSQL gets a native insensitive `contains` filter; SQLite falls back to its
 * ASCII case-insensitive `LIKE`. In both cases the candidates are re-filtered in
 * JS for an exact case-folded match, so a partial value can never authenticate.
 */
export async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const needle = trimmed.toLowerCase();

  // Kept in an intermediate variable (matching src/lib/server/handlers.ts) so the
  // provider-specific `mode` filter is not excess-property-checked against the
  // SQLite-generated client types.
  const orFilter = isPostgres()
    ? [
        { username: { contains: trimmed, mode: "insensitive" as const } },
        { email: { contains: trimmed, mode: "insensitive" as const } },
      ]
    : [{ username: { contains: trimmed } }, { email: { contains: trimmed } }];

  const candidates = await prisma.user.findMany({ where: { OR: orFilter } });

  return (
    candidates.find(
      (user) =>
        user.username.toLowerCase() === needle ||
        (user.email ? user.email.toLowerCase() === needle : false),
    ) ?? null
  );
}

export function toSessionUser(user: {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  avatarColor: string | null;
  organization: string | null;
  lastLoginAt: Date | null;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarColor: user.avatarColor,
    organization: user.organization,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export async function issueSession(user: {
  id: string;
  username: string;
  fullName: string;
  role: string;
}) {
  const token = await createSessionToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.fullName,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds(),
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** Loads the authenticated administrator (or null when unauthenticated). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const claims = await getSessionClaims();
  if (!claims) return null;
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
  if (!user || !user.isActive) return null;
  return toSessionUser(user);
}

export type AuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  actorId?: string | null;
  actorName?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  details?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Writes an audit-trail entry. Never throws — auditing must not break requests.
 */
export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? "system",
        severity: input.severity ?? "INFO",
        details:
          input.details === undefined
            ? null
            : typeof input.details === "string"
              ? input.details
              : JSON.stringify(input.details).slice(0, 4000),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}