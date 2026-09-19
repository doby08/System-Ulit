import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class merge used across every component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h12}:${mm} ${ampm}`;
}

export function formatTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm} ${ampm}`;
}

export function formatRelativeTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "never";
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

export function formatNumber(value?: number | null, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value?: number | null, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0%";
  return `${Number(value).toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sum(values: number[]) {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

export function average(values: number[]) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return 0;
  return sum(clean) / clean.length;
}

export function round(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function percent(part: number, total: number, digits = 1) {
  if (!total) return 0;
  return round((part / total) * 100, digits);
}

export function initials(name?: string | null) {
  if (!name) return "AI";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-indigo-500 to-purple-500",
  "from-purple-500 to-pink-500",
  "from-cyan-500 to-teal-400",
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-400",
];

export function avatarGradient(seed?: string | null) {
  if (!seed) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function truncate(text?: string | null, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseTags(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function stringifyTags(tags: string[] | undefined | null): string | null {
  if (!tags || !tags.length) return null;
  const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  return clean.length ? clean.join(",") : null;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

/** Client-safe unique id (used for idempotent offline submission keys). */
export function uid(prefix = "id"): string {
  const g = globalThis as unknown as { crypto?: Crypto };
  if (g.crypto?.randomUUID) return `${prefix}_${g.crypto.randomUUID()}`;
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function progressPercent(answered: number, total: number, digits = 0) {
  if (!total) return 0;
  return round(clamp((answered / total) * 100, 0, 100), digits);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Groups items by a derived key, preserving insertion order. */
export function groupBy<T, K extends string>(items: T[], key: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Deterministic shuffle (seeded) — keeps Random interview mode stable per session. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function titleCase(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Detects a coarse device label for session tracking. */
export function detectDevice(userAgent?: string | null) {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown device";
}