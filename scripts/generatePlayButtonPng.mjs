import fs from "node:fs";
import zlib from "node:zlib";

// Procedurally generates hyper-casual shiny button PNGs
// with true transparency and a soft drop shadow.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePngRgba({ width, height, rgba }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const stride = width * 4;
  const scan = Buffer.alloc(height * (1 + stride));
  let o = 0;
  for (let y = 0; y < height; y++) {
    scan[o++] = 0;
    rgba.copy(scan, o, y * stride, y * stride + stride);
    o += stride;
  }

  const compressed = zlib.deflateSync(scan, { level: 9 });
  return Buffer.concat([
    PNG_SIGNATURE,
    writeChunk("IHDR", ihdr),
    writeChunk("IDAT", compressed),
    writeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sdfRoundedRect(px, py, halfW, halfH, r) {
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  const outside = Math.hypot(ax, ay);
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - r;
}

function distPointSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const denom = abx * abx + aby * aby;
  const t = denom === 0 ? 0 : clamp01((apx * abx + apy * aby) / denom);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function pointInTri(px, py, ax, ay, bx, by, cx, cy) {
  // Barycentric sign method
  const v0x = cx - ax;
  const v0y = cy - ay;
  const v1x = bx - ax;
  const v1y = by - ay;
  const v2x = px - ax;
  const v2y = py - ay;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDen = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDen;
  const v = (dot00 * dot12 - dot01 * dot02) * invDen;
  return u >= 0 && v >= 0 && u + v <= 1;
}

function triangleMask(px, py, a, b, c) {
  const inside = pointInTri(px, py, a.x, a.y, b.x, b.y, c.x, c.y);
  const d0 = distPointSegment(px, py, a.x, a.y, b.x, b.y);
  const d1 = distPointSegment(px, py, b.x, b.y, c.x, c.y);
  const d2 = distPointSegment(px, py, c.x, c.y, a.x, a.y);
  const d = Math.min(d0, d1, d2);
  const sd = inside ? -d : d;
  // 1px AA
  return 1 - smoothstep(0.0, 1.0, sd);
}

function over(dst, src) {
  // premultiplied RGBA in 0..1
  const invA = 1 - src.a;
  return {
    r: src.r + dst.r * invA,
    g: src.g + dst.g * invA,
    b: src.b + dst.b * invA,
    a: src.a + dst.a * invA,
  };
}

function parseArgs(argv) {
  // node scripts/generatePlayButtonPng.mjs <output.png> [--w 400] [--h 200] [--theme green|blue] [--no-icon]
  const args = { outPath: "", w: 400, h: 200, theme: "green", icon: true };
  const rest = argv.slice(2);
  args.outPath = rest[0] || "";
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--w") args.w = Number(rest[++i] || "400");
    else if (a === "--h") args.h = Number(rest[++i] || "200");
    else if (a === "--theme") args.theme = String(rest[++i] || "green");
    else if (a === "--no-icon") args.icon = false;
  }
  return args;
}

function main() {
  const { outPath, w: W, h: H, theme, icon } = parseArgs(process.argv);
  if (!outPath) {
    console.error(
      "Usage: node scripts/generatePlayButtonPng.mjs <output.png> [--w 400] [--h 200] [--theme green|blue] [--no-icon]",
    );
    process.exit(2);
  }

  const rgba = Buffer.alloc(W * H * 4);

  const cx = W / 2;
  const btnW = Math.round(W * 0.8);
  const btnH = Math.round(H * 0.6);
  const r = Math.round(btnH * 0.48);

  const halfW = btnW / 2;
  const halfH = btnH / 2;

  const shadowOffsetX = 0;
  // Scale shadow params with button height so smaller buttons don't clip.
  const shadowOffsetY = Math.max(4, Math.round(btnH * 0.1));
  const shadowBlur = Math.max(8, Math.round(btnH * 0.14)); // <= 50 total with offset
  const shadowStrength = 0.35;

  // Keep the shadow fully inside the canvas (avoid bottom clipping).
  // Shadow falloff is gaussian-ish: exp(-(d/blur)^2). At ~1.9*blur it's visually negligible.
  const shadowTail = shadowBlur * 1.9;
  const cyMin = halfH + 2;
  const cyMax = H - halfH - shadowOffsetY - shadowTail - 2;
  const cy = clamp(H / 2, cyMin, cyMax);

  // Optional play icon (sized relative to height)
  const triH = btnH * 0.5;
  const triW = triH * 0.7;
  const tri = {
    a: { x: cx - triW * 0.25, y: cy - triH * 0.5 },
    b: { x: cx - triW * 0.25, y: cy + triH * 0.5 },
    c: { x: cx + triW * 0.75, y: cy },
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const lx = px - cx;
      const ly = py - cy;

      let dst = { r: 0, g: 0, b: 0, a: 0 };

      // Shadow (behind)
      {
        const ds = sdfRoundedRect(lx - shadowOffsetX, ly - shadowOffsetY, halfW, halfH, r);
        const d = Math.max(ds, 0);
        const a = Math.exp(-((d / shadowBlur) ** 2)) * shadowStrength;
        if (a > 0.001) {
          dst = over(dst, { r: 0, g: 0, b: 0, a });
        }
      }

      // Button body
      const sdf = sdfRoundedRect(lx, ly, halfW, halfH, r);
      const aBtn = 1 - smoothstep(0.0, 1.25, sdf); // soft edge AA
      if (aBtn > 0.001) {
        // Base gradient
        const tY = clamp01((ly + halfH) / (btnH));
        const tX = clamp01((lx + halfW) / (btnW));
        const top =
          theme === "blue"
            ? { r: 155 / 255, g: 220 / 255, b: 1 }
            : { r: 170 / 255, g: 1, b: 150 / 255 };
        const bot =
          theme === "blue"
            ? { r: 35 / 255, g: 135 / 255, b: 245 / 255 }
            : { r: 10 / 255, g: 190 / 255, b: 105 / 255 };
        let r0 = lerp(top.r, bot.r, tY);
        let g0 = lerp(top.g, bot.g, tY);
        let b0 = lerp(top.b, bot.b, tY);

        // Slight horizontal depth
        r0 *= 0.96 + 0.08 * (1 - Math.abs(tX - 0.5) * 2);
        g0 *= 0.96 + 0.10 * (1 - Math.abs(tX - 0.5) * 2);
        b0 *= 0.96 + 0.06 * (1 - Math.abs(tX - 0.5) * 2);

        // Border darkening near edges
        const edge = clamp01((sdf + 10) / 10); // 0 inside, 1 near/outside
        const border = 1 - edge; // stronger near edge
        const borderAmt = border * 0.18;
        r0 *= 1 - borderAmt;
        g0 *= 1 - borderAmt * 0.9;
        b0 *= 1 - borderAmt;

        // Glossy top highlight band
        const topBand = clamp01(1 - (ly + halfH) / (btnH * 0.75));
        const bandA = topBand * 0.28;
        r0 = lerp(r0, 1, bandA);
        g0 = lerp(g0, 1, bandA);
        b0 = lerp(b0, 1, bandA);

        // Specular spot (top-left), scaled for size
        const hx = (lx + btnW * 0.30) / (btnW * 0.25);
        const hy = (ly + btnH * 0.30) / (btnH * 0.33);
        const spot = Math.exp(-(hx * hx + hy * hy)) * 0.35;
        r0 = lerp(r0, 1, spot);
        g0 = lerp(g0, 1, spot);
        b0 = lerp(b0, 1, spot);

        // Bottom rim shine
        const rim = clamp01((ly - (halfH - 14)) / 10);
        const rimA = (1 - rim) * 0.12;
        r0 = lerp(r0, 0.0, rimA * 0.25);
        g0 = lerp(g0, 0.0, rimA * 0.18);
        b0 = lerp(b0, 0.0, rimA * 0.25);

        // Premultiply
        dst = over(dst, { r: r0 * aBtn, g: g0 * aBtn, b: b0 * aBtn, a: aBtn });

        // Inner outline (subtle)
        const inner = 1 - smoothstep(-7, -5.5, sdf);
        const innerA = inner * 0.10;
        dst = over(dst, { r: 1 * innerA, g: 1 * innerA, b: 1 * innerA, a: innerA });
      }

      if (icon) {
        // Play icon shadow (on top of button)
        {
          const m = triangleMask(px - 1.8, py - 2.6, tri.a, tri.b, tri.c);
          const a = m * 0.28;
          if (a > 0.001) dst = over(dst, { r: 0, g: 0, b: 0, a });
        }

        // Play icon
        {
          const m = triangleMask(px, py, tri.a, tri.b, tri.c);
          const a = m * 0.98;
          if (a > 0.001) dst = over(dst, { r: 1 * a, g: 1 * a, b: 1 * a, a });
        }
      }

      // Unpremultiply for PNG storage (straight alpha)
      const o = (y * W + x) * 4;
      if (dst.a <= 0.00001) {
        rgba[o] = 0;
        rgba[o + 1] = 0;
        rgba[o + 2] = 0;
        rgba[o + 3] = 0;
      } else {
        const inv = 1 / dst.a;
        rgba[o] = Math.round(clamp01(dst.r * inv) * 255);
        rgba[o + 1] = Math.round(clamp01(dst.g * inv) * 255);
        rgba[o + 2] = Math.round(clamp01(dst.b * inv) * 255);
        rgba[o + 3] = Math.round(clamp01(dst.a) * 255);
      }
    }
  }

  fs.writeFileSync(outPath, encodePngRgba({ width: W, height: H, rgba }));
}

main();

