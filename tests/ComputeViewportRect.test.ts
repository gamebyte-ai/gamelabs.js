import { describe, it, expect } from "vitest";
import { computeViewportRect } from "../src/core/utilities/computeViewportRect.js";

describe("computeViewportRect", () => {
  describe("fill (default / no config)", () => {
    it("returns the full area at origin when config is omitted", () => {
      expect(computeViewportRect(1920, 1080)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    });

    it("returns the full area for fit:'fill'", () => {
      expect(computeViewportRect(800, 600, { fit: "fill" })).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });

    it("treats fit:'cover' as full area (deferred crop semantics)", () => {
      expect(computeViewportRect(800, 600, { fit: "cover", aspectRatio: 9 / 16 })).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });

    it("clamps available size to a minimum of 1x1", () => {
      expect(computeViewportRect(0, -5)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    });

    it("floors fractional available sizes", () => {
      expect(computeViewportRect(1920.9, 1080.2)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    });
  });

  describe("contain with a single fixed aspect (portrait 9:16)", () => {
    const portrait = { fit: "contain" as const, aspectRatio: 9 / 16 };

    it("pillarboxes a wide window (bars left/right)", () => {
      const r = computeViewportRect(1600, 900, portrait);
      // height-bound: h=900, w=round(900*9/16)=506, centered horizontally
      expect(r).toEqual({ x: Math.floor((1600 - 506) / 2), y: 0, width: 506, height: 900 });
      expect(r.width / r.height).toBeCloseTo(9 / 16, 2);
    });

    it("letterboxes a window taller than the target (bars top/bottom)", () => {
      const r = computeViewportRect(360, 800, portrait); // 0.45 aspect < 0.5625 target
      // width-bound: w=360, h=round(360/(9/16))=640, centered vertically
      expect(r).toEqual({ x: 0, y: Math.floor((800 - 640) / 2), width: 360, height: 640 });
      expect(r.width / r.height).toBeCloseTo(9 / 16, 2);
    });

    it("fills exactly when the window already matches the aspect", () => {
      const r = computeViewportRect(900, 1600, portrait); // exactly 9:16
      expect(r).toEqual({ x: 0, y: 0, width: 900, height: 1600 });
    });

    it("never exceeds the available area", () => {
      const r = computeViewportRect(1000, 1000, portrait);
      expect(r.width).toBeLessThanOrEqual(1000);
      expect(r.height).toBeLessThanOrEqual(1000);
    });
  });

  describe("contain with an aspect band [minAspect, maxAspect]", () => {
    // Allow portrait between 9:19.5 (tall) and 9:16 (standard).
    const band = { fit: "contain" as const, minAspect: 9 / 19.5, maxAspect: 9 / 16 };

    it("fills full-bleed when the device aspect is inside the band", () => {
      // 9:18 ≈ 0.5 is between 9/19.5 (0.4615) and 9/16 (0.5625)
      const r = computeViewportRect(900, 1800, band);
      expect(r).toEqual({ x: 0, y: 0, width: 900, height: 1800 });
    });

    it("letterboxes (top/bottom) a device taller than the band's tall edge", () => {
      // 9:21 ≈ 0.4286 is below minAspect (0.4615) → clamp to minAspect, width-bound
      const r = computeViewportRect(450, 1050, band);
      const target = 9 / 19.5;
      expect(r.x).toBe(0);
      expect(r.width).toBe(450);
      expect(r.height).toBe(Math.round(450 / target));
      expect(r.y).toBeGreaterThan(0);
      expect(r.width / r.height).toBeCloseTo(target, 2);
    });

    it("pillarboxes (left/right) a window wider than the band's wide edge", () => {
      // Desktop 16:9 ≈ 1.778 is above maxAspect (0.5625) → clamp to maxAspect, height-bound
      const r = computeViewportRect(1920, 1080, band);
      const target = 9 / 16;
      expect(r.y).toBe(0);
      expect(r.height).toBe(1080);
      expect(r.width).toBe(Math.round(1080 * target));
      expect(r.x).toBeGreaterThan(0);
      expect(r.width / r.height).toBeCloseTo(target, 2);
    });

    it("treats aspectRatio shorthand as min === max", () => {
      const fixed = computeViewportRect(1920, 1080, { fit: "contain", aspectRatio: 9 / 16 });
      const range = computeViewportRect(1920, 1080, { fit: "contain", minAspect: 9 / 16, maxAspect: 9 / 16 });
      expect(fixed).toEqual(range);
    });

    it("tolerates min/max passed in reversed order", () => {
      const a = computeViewportRect(1920, 1080, { fit: "contain", minAspect: 9 / 16, maxAspect: 9 / 19.5 });
      const b = computeViewportRect(1920, 1080, { fit: "contain", minAspect: 9 / 19.5, maxAspect: 9 / 16 });
      expect(a).toEqual(b);
    });
  });

  describe("contain without a declared aspect", () => {
    it("falls back to full area when neither aspectRatio nor min/max is given", () => {
      expect(computeViewportRect(800, 600, { fit: "contain" })).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });

    it("ignores non-positive aspect bounds", () => {
      expect(computeViewportRect(800, 600, { fit: "contain", aspectRatio: 0 })).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });
  });
});
