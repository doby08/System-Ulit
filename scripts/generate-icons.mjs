/**
 * Generates PWA / app icons as real PNG files (no native deps — hand-rolled PNG encoder).
 * Output: public/icons/*.png
 * Usage: npm run icons
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Signed-distance coverage for a rounded rectangle. */
function roundedRectCoverage(x, y, rx, ry, rw, rh, radius, feather = 0.85) {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = Math.abs(x - cx) - (rw / 2 - radius);
  const dy = Math.abs(y - cy) - (rh / 2 - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  const dist = outside + inside - radius;
  return clamp01(0.5 - dist / feather);
}

function circleCoverage(x, y, cx, cy, r, feather = 0.9) {
  const dist = Math.hypot(x - cx, y - cy) - r;
  return clamp01(0.5 - dist / feather);
}

function renderIcon(size, { padding = 0.0, glyphScale = 1 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const bgInset = padding * size;
  const bgSize = size - bgInset * 2;
  const radius = bgSize * 0.24;

  // Bars of the analytics/survey glyph
  const barW = bgSize * 0.115 * glyphScale;
  const baseY = bgInset + bgSize * 0.735;
  const bars = [
    { x: bgInset + bgSize * 0.245, h: bgSize * 0.2 },
    { x: bgInset + bgSize * 0.4425, h: bgSize * 0.34 },
    { x: bgInset + bgSize * 0.64, h: bgSize * 0.48 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const bg = roundedRectCoverage(x + 0.5, y + 0.5, bgInset, bgInset, bgSize, bgSize, radius);
      if (bg <= 0) continue;

      // diagonal premium gradient: #3B6BF6 -> #6366F1 -> #A855F7
      const t = clamp01((x / size) * 0.55 + (y / size) * 0.45);
      let r, g, b;
      if (t < 0.5) {
        const u = t / 0.5;
        r = lerp(59, 99, u);
        g = lerp(107, 102, u);
        b = lerp(246, 241, u);
      } else {
        const u = (t - 0.5) / 0.5;
        r = lerp(99, 168, u);
        g = lerp(102, 85, u);
        b = lerp(241, 247, u);
      }
      // subtle deep-navy wash at the edges for depth
      const edge = 1 - clamp01(Math.min(x, y, size - x, size - y) / (size * 0.35));
      r = lerp(r, 12, edge * 0.18);
      g = lerp(g, 18, edge * 0.18);
      b = lerp(b, 38, edge * 0.18);

      let a = bg;
      // glyph: white rounded bars
      let glyph = 0;
      for (const bar of bars) {
        const cov = roundedRectCoverage(x + 0.5, y + 0.5, bar.x, baseY - bar.h, barW, bar.h, barW / 2);
        glyph = Math.max(glyph, cov);
      }
      // glyph: cyan accent dot
      const dot = circleCoverage(x + 0.5, y + 0.5, bgInset + bgSize * 0.7, bgInset + bgSize * 0.305, bgSize * 0.078 * glyphScale);

      let pr = 255, pg = 255, pb = 255;
      const gA = glyph * 0.94;
      const dA = dot * 0.95;
      if (dA > gA) {
        pr = 34; pg = 211; pb = 238;
      }
      const top = Math.max(gA, dA);
      if (top > 0) {
        r = lerp(r, pr, top);
        g = lerp(g, pg, top);
        b = lerp(b, pb, top);
      }

      rgba[i] = Math.round(clamp01(r / 255) * 255);
      rgba[i + 1] = Math.round(clamp01(g / 255) * 255);
      rgba[i + 2] = Math.round(clamp01(b / 255) * 255);
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return rgba;
}

mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, opts: { padding: 0.02 } },
  { file: "icon-512.png", size: 512, opts: { padding: 0.02 } },
  { file: "icon-maskable-512.png", size: 512, opts: { padding: 0.14, glyphScale: 0.85 } },
  { file: "apple-touch-icon.png", size: 180, opts: { padding: 0.0 } },
  { file: "favicon-32.png", size: 32, opts: { padding: 0.0 } },
];

for (const t of targets) {
  writeFileSync(join(outDir, t.file), encodePng(t.size, renderIcon(t.size, t.opts)));
  console.log(`[generate-icons] wrote public/icons/${t.file} (${t.size}px)`);
}