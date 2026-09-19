/**
 * API plumbing: consistent JSON envelopes, Zod validation, auth guards,
 * in-memory rate limiting and safe error mapping (no stack traces leak out).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import type { SessionUser } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  retryable?: boolean;

  constructor(
    message: string,
    status = 400,
    options?: { code?: string; details?: unknown; retryable?: boolean },
  ) {
    super(message);
    this.status = status;
    this.code = options?.code ?? "ERROR";
    this.details = options?.details;
    this.retryable = options?.retryable;
  }
}

export const unauthorized = (message = "Authentication required.") =>
  new ApiError(message, 401, { code: "UNAUTHORIZED" });
export const forbidden = (message = "You do not have access to this resource.") =>
  new ApiError(message, 403, { code: "FORBIDDEN" });
export const notFound = (message = "Resource not found.") =>
  new ApiError(message, 404, { code: "NOT_FOUND" });
export const badRequest = (message: string, details?: unknown) =>
  new ApiError(message, 400, { code: "VALIDATION_ERROR", details });

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: unknown) {
  if (error instanceof ApiError) {
    const body: Record<string, unknown> = { ok: false, error: error.message, code: error.code };
    if (error.details !== undefined) body.details = error.details;
    if (error.retryable !== undefined) body.retryable = error.retryable;
    return NextResponse.json(body, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "The submitted data is invalid. Please review the highlighted fields.",
        code: "VALIDATION_ERROR",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  // Full detail is logged server-side; clients receive a friendly message only.
  console.error("[api] unhandled error:", message, error);
  return NextResponse.json(
    {
      ok: false,
      error: "Something went wrong on the server. Please try again.",
      code: "SERVER_ERROR",
      retryable: true,
    },
    { status: 500 },
  );
}

/** Wraps a route handler with unified error handling. */
export function route<Args extends unknown[]>(
  handler: (request: NextRequest, ...args: Args) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: Args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return fail(error);
    }
  };
}

/** Ensures an authenticated administrator, otherwise throws ApiError(401). */
export async function requireAdminApi(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized("Your session has expired. Please sign in again.");
  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    throw forbidden("Administrator privileges are required for this action.");
  }
  return user;
}

/** Parses + validates a JSON request body against a Zod schema (output-typed). */
export async function readJson<S extends import("zod").ZodTypeAny>(
  request: NextRequest,
  schema: S,
): Promise<import("zod").output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  return schema.parse(raw) as import("zod").output<S>;
}

export function getIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") ?? "unknown";
}

/* -------------------------------------------------------------------------- */
/* Lightweight in-memory rate limiting                                         */
/* -------------------------------------------------------------------------- */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limiter. Per-process memory store — adequate for a single
 * Next.js server instance; swap for Redis when horizontally scaling.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function enforceRateLimit(key: string, limit: number, windowMs: number, message: string) {
  const result = rateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new ApiError(message, 429, { code: "RATE_LIMITED", retryable: true });
  }
  return result;
}

/** Keeps the limiter from growing unbounded in long-running processes. */
export function pruneRateLimiter() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/** Standard shape for admin CRUD list responses. */
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };