/**
 * Runtime resolution of the app's public base URL — used for QR/respondent links and
 * for deciding whether the session cookie may carry the `Secure` flag.
 *
 * WHY THIS IS NOT JUST `process.env.NEXT_PUBLIC_APP_URL`: Next.js INLINES every
 * `NEXT_PUBLIC_*` value into the bundle at BUILD time. A value that is only added in the
 * hosting dashboard after the build (or never added at all) stays `undefined` at runtime,
 * which made QR codes fall back to "http://localhost:3000" — useless for respondents
 * scanning them with a phone. The hosting-provided, runtime-only variables are therefore
 * checked first, so a deployment is correct with zero extra configuration.
 *
 * Edge-safe (no Node APIs): importable from middleware as well as from Node handlers.
 */

/** Trims whitespace and removes trailing slashes; "" when nothing is configured. */
function normalize(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

/** Adds `https://` to bare hosts such as VERCEL_URL ("my-app.vercel.app"). */
function withScheme(value: string | undefined): string {
  const url = normalize(value);
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export const LOCAL_APP_URL = "http://localhost:3000";

/** Configured base URL, or "" when the environment does not define one. */
export function configuredAppUrl(): string {
  return (
    withScheme(process.env.APP_URL) ||
    withScheme(process.env.RENDER_EXTERNAL_URL) ||
    withScheme(process.env.NEXT_PUBLIC_APP_URL) ||
    withScheme(process.env.VERCEL_URL)
  );
}

/** Base URL for links shown to users — falls back to localhost for local development. */
export function resolveAppUrl(): string {
  return configuredAppUrl() || LOCAL_APP_URL;
}
