/**
 * Runs before `next start` (npm `prestart` hook).
 * On hosting (Render) the build step may have been skipped or run against
 * a different database, so re-ensure Postgres tables + admin seed here.
 * Local SQLite dev is untouched (DATABASE_URL=file:... skips this).
 */
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
if (!url.startsWith("postgres")) {
  console.log("[prestart] local sqlite detected — skipping postgres ensure.");
  process.exit(0);
}

console.log("[prestart] ensuring postgres schema + seed...");
const r = spawnSync("node", ["scripts/db-ensure-pg.mjs"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if ((r.status ?? 1) !== 0) {
  console.error("[prestart] db ensure failed — starting anyway (login may fail until tables exist).");
}
