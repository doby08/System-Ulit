/**
 * Picks the correct Prisma schema for `prisma generate` based on DATABASE_URL:
 * postgres:// → canonical PostgreSQL schema; file: → SQLite mirror.
 * Usage: node scripts/prisma-generate.mjs [extra args…]
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readEnvUrl() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return process.env.DATABASE_URL ?? "";
  const match = readFileSync(envPath, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\r\n#]+)"?/m);
  return process.env.DATABASE_URL ?? (match ? match[1].trim() : "");
}

const url = readEnvUrl();
const isPostgres = url.startsWith("postgres");
const schema = isPostgres ? "prisma/schema.prisma" : "prisma/schema.sqlite.prisma";

if (!isPostgres && !existsSync(schema)) {
  console.error("[prisma-generate] SQLite mirror schema missing — run: node scripts/make-sqlite-schema.mjs");
  process.exit(1);
}

console.log(`[prisma-generate] provider = ${isPostgres ? "postgresql" : "sqlite"} (schema: ${schema})`);

const extra = process.argv.slice(2);
const result = spawnSync("npx", ["prisma", "generate", "--schema", schema, ...extra], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);