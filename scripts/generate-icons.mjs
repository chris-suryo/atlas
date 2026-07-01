// Dependency-free PWA icon generator.
// Draws the Atlas mark (a bold "A") in an accent color on a dark square and
// encodes PNGs by hand using only Node's zlib. Run: `node scripts/generate-icons.mjs`.
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// ---- palette ----
const BG = [10, 14, 26]; // #0A0E1A deep slate
const FG = [52, 211, 153]; // #34D399 emerald

// ---- PNG encoding (RGBA, 8-bit) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- geometry ----
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const apex = [size * 0.5, size * 0.24];
  const bl = [size * 0.3, size * 0.76];
  const br = [size * 0.7, size * 0.76];
  const crossY = size * 0.6;
  // crossbar endpoints where legs cross crossY
  const tl = (crossY - apex[1]) / (bl[1] - apex[1]);
  const cbL = [apex[0] + tl * (bl[0] - apex[0]), crossY];
  const cbR = [apex[0] + tl * (br[0] - apex[0]), crossY];
  const half = size * 0.0375; // stroke half-width
  const aa = Math.max(1, size / 256); // anti-alias band
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = Math.min(
        distSeg(px, py, apex[0], apex[1], bl[0], bl[1]),
        distSeg(px, py, apex[0], apex[1], br[0], br[1]),
        distSeg(px, py, cbL[0], cbL[1], cbR[0], cbR[1])
      );
      let a = (half + aa - d) / aa; // 1 inside stroke, 0 outside, ramp between
      a = Math.max(0, Math.min(1, a));
      const i = (y * size + x) * 4;
      buf[i] = Math.round(BG[0] + (FG[0] - BG[0]) * a);
      buf[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * a);
      buf[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * a);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

for (const size of [512, 192, 180]) {
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  writeFileSync(join(OUT, name), encodePng(size, drawIcon(size)));
  console.log("wrote", name);
}
