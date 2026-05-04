// Generates the default texture set that ships with the settings
// module: a single 9-slice rounded-rect panel background used by
// `SettingsPopupView`. Output goes to `src/modules/settings/assets/`;
// the binding registers an asset request for it so apps get a
// textured popup out of the box. Apps that want different art override
// the request via `SettingsBinding.assetRequestList.overrideRequest(...)`.
//
// Pure JS encoder — only depends on Node's zlib + Buffer; no
// third-party imaging deps. The PNG ships pure white (RGB 255) with
// alpha shaped by a rounded-rect mask, so the runtime tint
// (`SpriteStyle.color`) controls the final colour.
//
// Run from the repo root: `node scripts/generateSettingsTextures.mjs`.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { Buffer } from "node:buffer";

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(here, "..", "src", "modules", "settings", "assets");
mkdirSync(assetsDir, { recursive: true });

// 64×64 source with a 16px corner radius leaves a 32×32 stretchable
// centre when used with NineSliceSprite border 16 — enough to keep
// the rounded corners crisp on any panel size.
const SIZE = 64;
const RADIUS = 16;

// ── PNG encoder ─────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // remaining bytes default 0 (compression, filter, interlace)

  // PNG filter byte 0 (none) per row
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    filtered.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const idat = deflateSync(filtered);

  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ── Texture rasterizer ──────────────────────────────────────────────────

/**
 * Rounded-rect panel: pure white pixels with alpha shaped by the
 * rounded rectangle. `aa` softens the corner edge over ~1px to avoid
 * aliasing. Renders white-with-alpha so the runtime tint controls the
 * final colour.
 */
function makePanelBg(size = SIZE, radius = RADIUS) {
  const px = new Uint8Array(size * size * 4);
  const aa = 1;

  // Distance from the nearest rounded-rect edge — positive inside,
  // negative outside, ramped over `aa` pixels for AA.
  const distance = (x, y) => {
    const dxLeft = x;
    const dxRight = size - 1 - x;
    const dyTop = y;
    const dyBottom = size - 1 - y;
    // Inside rectangular core (no corner curve).
    if (dxLeft >= radius && dxRight >= radius) return Math.min(dyTop, dyBottom);
    if (dyTop >= radius && dyBottom >= radius) return Math.min(dxLeft, dxRight);
    // Corner: signed distance from the rounded corner's centre.
    const cx = dxLeft < radius ? radius : size - 1 - radius;
    const cy = dyTop < radius ? radius : size - 1 - radius;
    const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    return radius - d;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = distance(x + 0.5, y + 0.5);
      let alpha;
      if (d >= aa) alpha = 1;
      else if (d <= -aa) alpha = 0;
      else alpha = (d + aa) / (2 * aa);

      const i = (y * size + x) * 4;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return { width: size, height: size, pixels: px };
}

// ── Run ─────────────────────────────────────────────────────────────────

function write(name, img) {
  const out = resolve(assetsDir, name);
  writeFileSync(out, encodePng(img.width, img.height, img.pixels));
  console.log(`wrote ${out} (${img.width}×${img.height})`);
}

write("panel-bg.png", makePanelBg());
