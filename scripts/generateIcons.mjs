/**
 * Draws the app icon, at every size the web asks for, from one definition.
 *
 * The icon is needed as an SVG (the modern favicon), an ICO (older browsers
 * and the Windows taskbar), a 180px apple-touch-icon, and 192/512px PNGs for
 * the web app manifest — including a maskable one, which Android crops to
 * whatever shape the launcher uses. Hand-cutting seven files means seven
 * chances for them to drift apart, so the geometry lives here once, in unit
 * coordinates, and both the SVG and the pixels are generated from it.
 *
 * There's no image library in this project (and no need for one for a few
 * circles and capsules): shapes are defined as inside-tests, sampled 4×4 per
 * pixel for antialiasing, and written out as PNG with Node's own zlib.
 *
 *   node scripts/generateIcons.mjs      # or: npm run icons:generate
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

/* ---------------------------------------------------------------- palette */

// The app's own colours (see app/app.css): warm gold on a cookbook cream.
const GOLD = [0xb6, 0x82, 0x35];
const CREAM = [0xf5, 0xf0, 0xe8];
const INK = [0x5a, 0x3b, 0x0a];

/* --------------------------------------------------------------- geometry */

/**
 * A plate with a fork and a knife, in unit coordinates (0–1 across the icon).
 *
 * Cutlery either side of a plate is the one food mark that still reads at
 * 16px, once the details have blurred, as "something to do with dinner" —
 * which is all a favicon has to achieve.
 */
const PLATE = { cx: 0.5, cy: 0.5, r: 0.33 };
const RIM = { cx: 0.5, cy: 0.5, outer: 0.285, inner: 0.272 };

const FORK_X = 0.395;
const KNIFE_X = 0.605;
const TINE_TOP = 0.35;
const NECK_Y = 0.5;
const HANDLE_BOTTOM = 0.66;

const CUTLERY = [
  // Fork: three tines into a neck, then the handle.
  { kind: "capsule", from: [FORK_X - 0.042, TINE_TOP], to: [FORK_X - 0.042, NECK_Y], r: 0.0165 },
  { kind: "capsule", from: [FORK_X, TINE_TOP], to: [FORK_X, NECK_Y], r: 0.0165 },
  { kind: "capsule", from: [FORK_X + 0.042, TINE_TOP], to: [FORK_X + 0.042, NECK_Y], r: 0.0165 },
  { kind: "capsule", from: [FORK_X, NECK_Y - 0.02], to: [FORK_X, HANDLE_BOTTOM], r: 0.026 },
  // Knife: a broad blade over a narrower handle.
  { kind: "capsule", from: [KNIFE_X, TINE_TOP + 0.012], to: [KNIFE_X, NECK_Y + 0.01], r: 0.031 },
  { kind: "capsule", from: [KNIFE_X, NECK_Y], to: [KNIFE_X, HANDLE_BOTTOM], r: 0.02 },
];

/* -------------------------------------------------------------- rasterizer */

function insideRoundedRect(x, y, radius) {
  if (radius <= 0) return x >= 0 && x <= 1 && y >= 0 && y <= 1;
  const dx = Math.max(radius - x, 0, x - (1 - radius));
  const dy = Math.max(radius - y, 0, y - (1 - radius));
  if (dx === 0 || dy === 0) return x >= 0 && x <= 1 && y >= 0 && y <= 1;
  return dx * dx + dy * dy <= radius * radius;
}

function insideCircle(x, y, { cx, cy, r }) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideAnnulus(x, y, { cx, cy, outer, inner }) {
  const d2 = (x - cx) ** 2 + (y - cy) ** 2;
  return d2 <= outer * outer && d2 >= inner * inner;
}

function insideCapsule(x, y, { from, to, r }) {
  const [ax, ay] = from;
  const [bx, by] = to;
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  const tRaw = lengthSquared === 0 ? 0 : ((x - ax) * abx + (y - ay) * aby) / lengthSquared;
  const t = Math.min(1, Math.max(0, tRaw));
  const dx = x - (ax + t * abx);
  const dy = y - (ay + t * aby);
  return dx * dx + dy * dy <= r * r;
}

/** Straight-alpha source-over composite of one colour at `coverage`. */
function blend(pixel, colour, coverage) {
  if (coverage <= 0) return;
  const alpha = coverage;
  const outAlpha = alpha + pixel[3] * (1 - alpha);
  for (let i = 0; i < 3; i++) {
    pixel[i] = outAlpha === 0 ? 0 : (colour[i] * alpha + pixel[i] * pixel[3] * (1 - alpha)) / outAlpha;
  }
  pixel[3] = outAlpha;
}

const SAMPLES = 4;

/**
 * Renders the icon to an RGBA buffer.
 *
 * `variant` decides how the mark meets the edge of the canvas:
 *   * `rounded`  — rounded corners, for a PNG that stands on its own
 *   * `square`   — full bleed, for iOS (which applies its own mask, and shows
 *                  transparent corners as black if you round them yourself)
 *   * `maskable` — full bleed with the mark shrunk into the safe zone, so an
 *                  Android launcher cropping to a circle doesn't cut cutlery
 */
function render(size, variant) {
  const cornerRadius = variant === "rounded" ? 0.22 : 0;
  // Android's maskable safe zone is the middle 80%; anything outside can be cropped.
  const contentScale = variant === "maskable" ? 0.78 : 1;
  const pixels = new Float64Array(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const pixel = [0, 0, 0, 0];
      let background = 0;
      let plate = 0;
      let rim = 0;
      let cutlery = 0;

      // Supersample: each shape's coverage is the share of sub-samples inside it.
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) / size;
          const y = (py + (sy + 0.5) / SAMPLES) / size;
          if (insideRoundedRect(x, y, cornerRadius)) background++;

          // Content coordinates: the same drawing, scaled about the centre.
          const cx = 0.5 + (x - 0.5) / contentScale;
          const cy = 0.5 + (y - 0.5) / contentScale;
          if (insideCircle(cx, cy, PLATE)) plate++;
          if (insideAnnulus(cx, cy, RIM)) rim++;
          if (CUTLERY.some((shape) => insideCapsule(cx, cy, shape))) cutlery++;
        }
      }

      const total = SAMPLES * SAMPLES;
      blend(pixel, GOLD, background / total);
      blend(pixel, CREAM, plate / total);
      blend(pixel, GOLD, (rim / total) * 0.5);
      blend(pixel, INK, cutlery / total);

      const offset = (py * size + px) * 4;
      for (let i = 0; i < 4; i++) {
        pixels[offset + i] = Math.round(pixel[i] * (i === 3 ? 255 : 1));
      }
    }
  }

  return Buffer.from(pixels.map((value) => Math.max(0, Math.min(255, Math.round(value)))));
}

/* ------------------------------------------------------------ PNG encoding */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(rgba, size) {
  // One filter byte (0 = none) per scanline; the image is tiny and zlib
  // handles flat colour well enough that a filter search would buy nothing.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO holding PNG-compressed entries — understood by every browser still shipping. */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const directory = [];
  for (const { size, png } of entries) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // palette size
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    directory.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...directory, ...entries.map((entry) => entry.png)]);
}

/* ------------------------------------------------------------ SVG encoding */

const svgNumber = (value) => Number((value * 100).toFixed(2));

function encodeSvg() {
  const rgb = (colour) => `#${colour.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  const capsules = CUTLERY.map(
    (shape) =>
      `<line x1="${svgNumber(shape.from[0])}" y1="${svgNumber(shape.from[1])}" x2="${svgNumber(shape.to[0])}" y2="${svgNumber(shape.to[1])}" stroke="${rgb(INK)}" stroke-width="${svgNumber(shape.r * 2)}" stroke-linecap="round"/>`,
  ).join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Family Meals">
  <!-- Generated by scripts/generateIcons.mjs — edit the geometry there, not here. -->
  <rect width="100" height="100" rx="22" fill="${rgb(GOLD)}"/>
  <circle cx="${svgNumber(PLATE.cx)}" cy="${svgNumber(PLATE.cy)}" r="${svgNumber(PLATE.r)}" fill="${rgb(CREAM)}"/>
  <circle cx="${svgNumber(RIM.cx)}" cy="${svgNumber(RIM.cy)}" r="${svgNumber((RIM.outer + RIM.inner) / 2)}" fill="none" stroke="${rgb(GOLD)}" stroke-opacity="0.5" stroke-width="${svgNumber(RIM.outer - RIM.inner)}"/>
  ${capsules}
</svg>
`;
}

/* -------------------------------------------------------------------- main */

function write(relativePath, contents) {
  const target = join(PUBLIC_DIR, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  console.log(`  ${relativePath} (${contents.length.toLocaleString("en-US")} bytes)`);
}

const png = (size, variant) => encodePng(render(size, variant), size);

console.log("Generating app icons into public/…");
write("favicon.svg", encodeSvg());
write(
  "favicon.ico",
  encodeIco([16, 32, 48].map((size) => ({ size, png: png(size, "rounded") }))),
);
write("icons/apple-touch-icon.png", png(180, "square"));
write("icons/icon-192.png", png(192, "rounded"));
write("icons/icon-512.png", png(512, "rounded"));
write("icons/icon-maskable-512.png", png(512, "maskable"));
console.log("Done.");
