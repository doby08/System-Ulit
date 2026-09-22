import { NextResponse } from "next/server";

/**
 * GET /api/health — lightweight readiness probe used as the hosting health check path
 * (render.yaml → healthCheckPath). It answers in a few bytes and deliberately does NOT
 * touch the database: a healthy deploy must never be cancelled because Postgres was
 * briefly busy, and it gives Render an open port to detect as soon as `next start` binds
 * (the DB bootstrap runs in parallel — see scripts/prestart.mjs).
 */
export const dynamic = "force-dynamic";

const VERSION = process.env.npm_package_version ?? "2026.1.0";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "healthy",
      app: "ai-interview-survey-system",
      version: VERSION,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
