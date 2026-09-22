/**
 * Cross-platform production start launcher used by `npm start`.
 *
 * Why this exists instead of `next start -p ${PORT:-3000}` in package.json:
 *   - `${PORT:-3000}` is POSIX-shell syntax. Shell-based hosts (Render runs scripts
 *     through `sh`) expand it, but cmd.exe on Windows passes the literal string to
 *     Next.js, which then aborts with an invalid-port error.
 *   - Render scans for a listening socket as soon as the start command runs and logs
 *     "No open ports detected, continuing to scan..." until it finds one, so the
 *     server must bind as early as possible on 0.0.0.0.
 *
 * Usage: npm start            (PORT defaults to 3000; Render sets PORT=10000)
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function resolvePort() {
  const raw = (process.env.PORT ?? "").trim();
  if (!raw) return 3000;
  const port = Number(raw);
  if (Number.isInteger(port) && port > 0 && port < 65536) return port;
  console.warn(`[start] ignoring invalid PORT="${raw}" — falling back to 3000.`);
  return 3000;
}

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error("[start] Next.js is not installed (node_modules/next is missing). Run `npm ci` first.");
  process.exit(1);
}

const port = resolvePort();
const hostname = (process.env.BIND_HOST ?? "").trim() || "0.0.0.0";

console.log(`[start] binding http://${hostname}:${port} (PORT=${process.env.PORT ?? "unset"})`);

const child = spawn(process.execPath, [nextBin, "start", "-H", hostname, "-p", String(port)], {
  stdio: "inherit",
  env: process.env,
});

// Render sends SIGTERM before a redeploy/spin-down: forward it so Next.js shuts down
// gracefully (in-flight requests finish, the port is released, no zero-downtime hiccup).
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on("error", (error) => {
  console.error("[start] failed to launch `next start`:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) console.warn(`[start] next start terminated by ${signal}.`);
  process.exit(code ?? (signal ? 1 : 0));
});
