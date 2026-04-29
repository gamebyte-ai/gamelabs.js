// Generates the default texture set that ships with the onscreencontrols
// module: joystick base, joystick handle, button background circle,
// and the circular progress ring drawn around buttons.
// Output goes to `src/modules/onscreencontrols/assets/`; the binding
// registers asset requests for all three so apps get textured controls
// out of the box. Apps that want different art override the requests
// via `OnScreenControlsBinding.assetRequestList.overrideRequest(...)`.
//
// Pure JS encoder — only depends on Node's zlib + Buffer; no
// third-party imaging deps. All textures are rendered white-with-alpha
// so the runtime tint (`baseColor` / `knobColor` for joysticks,
// `upColor` / `downColor` for buttons) controls the final color.
//
// Run from the repo root: `node scripts/generateOnscreenControlsTextures.mjs`.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { Buffer } from "node:buffer";

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(here, "..", "src", "modules", "onscreencontrols", "assets");
mkdirSync(assetsDir, { recursive: true });

const SIZE = 256;

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

// ── Texture rasterizers ─────────────────────────────────────────────────

/**
 * Joystick base: a soft-edged ring. Outer / inner radii in normalized
 * units; `aaWidth` softens both edges over ~1px to avoid aliasing.
 */
function makeJoystickBase(size = SIZE) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.48;
  const innerR = size * 0.38;
  const aa = 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      let alpha = 0;
      if (d > outerR + aa || d < innerR - aa) alpha = 0;
      else if (d > outerR) alpha = (outerR + aa - d) / aa;
      else if (d < innerR) alpha = (d - (innerR - aa)) / aa;
      else alpha = 1;

      const i = (y * size + x) * 4;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return { width: size, height: size, pixels: px };
}

/**
 * Joystick knob: a solid disk with a gentle radial dim toward the edge
 * for a slight "dome" feel. Renders white so the runtime tint controls
 * the final color.
 */
function makeJoystickKnob(size = SIZE) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;
  const aa = 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      let alpha = 0;
      if (d > r + aa) alpha = 0;
      else if (d > r) alpha = (r + aa - d) / aa;
      else alpha = 1;

      // Dome shading: brightest at center, ~70% near the edge.
      const t = Math.max(0, 1 - d / r);
      const v = Math.round(178 + t * 77); // 178..255

      const i = (y * size + x) * 4;
      px[i] = v;
      px[i + 1] = v;
      px[i + 2] = v;
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return { width: size, height: size, pixels: px };
}

/**
 * Flat solid disk: white pixels inside the radius, AA on the edge,
 * fully transparent outside. Used as the button background — the
 * runtime tints it via `upColor` / `downColor` and the press state is
 * communicated by alpha shifts, so the texture itself stays uniformly
 * bright.
 */
function makeButtonBg(size = SIZE) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.48;
  const aa = 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      let alpha = 0;
      if (d > r + aa) alpha = 0;
      else if (d > r) alpha = (r + aa - d) / aa;
      else alpha = 1;

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

/**
 * Circular progress ring drawn around a button. Slightly thicker than
 * the joystick base so it reads at button scale, and positioned at the
 * very outer edge of the texture so the wedge mask cleanly clips it
 * against the background.
 */
function makeButtonProgress(size = SIZE) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.495;
  const innerR = size * 0.4;
  const aa = 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      let alpha = 0;
      if (d > outerR + aa || d < innerR - aa) alpha = 0;
      else if (d > outerR) alpha = (outerR + aa - d) / aa;
      else if (d < innerR) alpha = (d - (innerR - aa)) / aa;
      else alpha = 1;

      const i = (y * size + x) * 4;
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return { width: size, height: size, pixels: px };
}

write("joystick-base.png", makeJoystickBase());
write("joystick-handle.png", makeJoystickKnob());
write("button-bg.png", makeButtonBg());
write("button-progress.png", makeButtonProgress());
