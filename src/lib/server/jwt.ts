/**
 * Edge-safe JWT session primitives (no Prisma, no bcrypt) — importable from
 * middleware (edge runtime) and from Node route handlers alike.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "aiis_session";

export type SessionClaims = {
  sub: string;
  username: string;
  role: string;
  name: string;
};

export function sessionTtlSeconds() {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? 12);
  return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 3600;
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Deterministic dev fallback keeps local development frictionless.
    // Production MUST provide a strong AUTH_SECRET (see .env.example).
    return new TextEncoder().encode("aiis-development-only-secret-key-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(claims: SessionClaims) {
  const ttl = sessionTtlSeconds();
  return new SignJWT({ username: claims.username, role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("aiis")
    .setAudience("aiis-admin")
    .setExpirationTime(`${ttl}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token?: string | null): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "aiis",
      audience: "aiis-admin",
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      username: String(payload.username ?? ""),
      role: String(payload.role ?? "ADMIN"),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

/** Signed, short-lived token protecting public respondent payloads (anti-tamper). */
export async function signPayloadToken(payload: Record<string, unknown>, ttlSeconds = 3600) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("aiis")
    .setAudience("aiis-public")
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}