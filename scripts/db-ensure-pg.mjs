/**
 * Ensures the PostgreSQL database schema + admin seed exist.
 * Safe to run on every deploy: `db push` is idempotent and the seed
 * only creates rows when tables are empty.
 * Usage: npm run db:ensure-pg
 */
import { spawnSync } from "node:child_process";

function run(cmd, args, label) {
  console.log(`[db:ensure-pg] ${label}...`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if ((r.status ?? 1) !== 0) {
    console.error(`[db:ensure-pg] FAILED: ${label} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgres")) {
  console.error("[db:ensure-pg] DATABASE_URL is missing or not postgres — skipping would leave an empty DB.");
  process.exit(1);
}

run("npx", ["prisma", "generate", "--schema", "prisma/schema.prisma"], "prisma generate (postgres)");
run(
  "npx",
  ["prisma", "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate", "--accept-data-loss"],
  "prisma db push (postgres)",
);
run("npm", ["run", "seed"], "prisma seed (admin)");
console.log("[db:ensure-pg] done.");
