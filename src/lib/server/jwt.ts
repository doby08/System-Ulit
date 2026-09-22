/**
 * Edge-safe JWT session primitives (no Prisma, no bcrypt) — importable from
 * middleware (edge runtime) and from Node route handlers alike.
 */
import { SignJWT, jwtVerify } from "jose";
import { configuredAppUrl } from "@/lib/server/base-url";

export const SESSION_COOKIE = "aiis_session";

export type SessionClaims = {
  sub: string;
  username: string;
  role: string;
  name: string;
};

/**
 * True when the session cookie may carry the `Secure` flag.
 *
 * Browsers SILENTLY DROP `Secure` cookies served over plain HTTP on any host other
 * than localhost. Sign-in then looked successful (HTTP 200) while the middleware sent
 * the administrator straight back to the login page. The flag is therefore derived
 * from the real origin instead of NODE_ENV, and can be forced with AUTH_COOKIE_SECURE.
 */
export function useSecureCookie() {
  const explicit = (process.env.AUTH_COOKIE_SECURE ?? "").trim().toLowerCase();
  if (explicit === "true" || explicit === "1") return true;
  if (explicit === "false" || explicit === "0") return false;
  const appUrl = configuredAppUrl().toLowerCase();
  if (appUrl) return appUrl.startsWith("https://");
  return process.env.NODE_ENV === "production";
}

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

export async function createSessionToken(claims: SessionClaims, ttlSeconds?: number) {
  const ttl = ttlSeconds ?? sessionTtlSeconds();
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