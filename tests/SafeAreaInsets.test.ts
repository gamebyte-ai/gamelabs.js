import { describe, it, expect } from "vitest";
import { resolveCanvasSafeArea, ZERO_SAFE_AREA_INSETS, type SafeAreaInsets } from "../src/core/utilities/safeAreaInsets.js";

const insets = (top: number, right: number, bottom: number, left: number): SafeAreaInsets => ({ top, right, bottom, left });
const fullRect = (width: number, height: number) => ({ x: 0, y: 0, width, height });

describe("resolveCanvasSafeArea", () => {
  it("is the identity for a full-bleed canvas (no bars, no scaling)", () => {
    const r = resolveCanvasSafeArea(insets(47, 0, 34, 0), 390, 844, fullRect(390, 844), 390, 844);
    expect(r).toEqual(insets(47, 0, 34, 0));
  });

  it("returns zeros for zero insets", () => {
    const r = resolveCanvasSafeArea(ZERO_SAFE_AREA_INSETS, 800, 600, fullRect(800, 600), 800, 600);
    expect(r).toEqual(ZERO_SAFE_AREA_INSETS);
  });

  it("returns a frozen object", () => {
    const r = resolveCanvasSafeArea(insets(10, 0, 0, 0), 100, 100, fullRect(100, 100), 100, 100);
    expect(Object.isFrozen(r)).toBe(true);
  });

  describe("letterbox bars absorb insets first (fit: 'contain')", () => {
    // Pillarbox: 506x900 canvas centered in a 1600x900 mount → 547px bars left/right.
    const rect = { x: 547, y: 0, width: 506, height: 900 };

    it("swallows an inset smaller than the bar entirely", () => {
      const r = resolveCanvasSafeArea(insets(0, 0, 0, 47), 1600, 900, rect, 506, 900);
      expect(r).toEqual(ZERO_SAFE_AREA_INSETS);
    });

    it("passes through only the overlap when the inset exceeds the bar", () => {
      const r = resolveCanvasSafeArea(insets(0, 600, 0, 0), 1600, 900, rect, 506, 900);
      // right bar = 1600 - 547 - 506 = 547 → overlap = 600 - 547 = 53
      expect(r).toEqual(insets(0, 53, 0, 0));
    });

    it("does not clamp edges without bars", () => {
      const r = resolveCanvasSafeArea(insets(20, 0, 34, 0), 1600, 900, rect, 506, 900);
      expect(r).toEqual(insets(20, 0, 34, 0));
    });

    it("clamps top/bottom insets against letterbox bars (y-offset rect)", () => {
      // Letterbox: 360x640 canvas centered in a 360x800 mount → 80px bars top/bottom.
      const r = resolveCanvasSafeArea(insets(100, 0, 60, 0), 360, 800, { x: 0, y: 80, width: 360, height: 640 }, 360, 640);
      // top bar 80 → overlap 20; bottom bar 800-80-640=80 → 60 fully absorbed
      expect(r).toEqual(insets(20, 0, 0, 0));
    });
  });

  describe("fixed-size configs scale CSS px into logical px", () => {
    it("scales per axis (logical 800x600 canvas stretched over a 400x300 mount)", () => {
      const r = resolveCanvasSafeArea(insets(30, 0, 0, 20), 400, 300, fullRect(400, 300), 800, 600);
      expect(r).toEqual(insets(60, 0, 0, 40));
    });

    it("handles fixed + contain: playRect treated as CSS px, matching _positionLayers", () => {
      // Fixed 900x1600 avail, contain 9:16 → playRect = full 900x1600 at origin;
      // mount is actually 450x800 CSS px. Canvas CSS rect per _positionLayers is
      // the playRect values as px — larger than the mount, negative bars clamp to 0.
      const rect = fullRect(900, 1600);
      const r = resolveCanvasSafeArea(insets(47, 0, 34, 0), 450, 800, rect, 900, 1600);
      // bars = max(0, 450-900)=0, max(0, 800-1600)=0 → insets pass through at scale 1
      expect(r).toEqual(insets(47, 0, 34, 0));
    });
  });

  describe("guards", () => {
    it("caps each edge at the canvas dimension", () => {
      const r = resolveCanvasSafeArea(insets(5000, 5000, 5000, 5000), 400, 300, fullRect(400, 300), 400, 300);
      expect(r).toEqual(insets(300, 400, 300, 400));
    });

    it("never returns negative insets", () => {
      const r = resolveCanvasSafeArea(insets(-10, 0, -5, 0), 400, 300, fullRect(400, 300), 400, 300);
      expect(r).toEqual(ZERO_SAFE_AREA_INSETS);
    });

    it("returns zeros for a degenerate canvas rect", () => {
      const r = resolveCanvasSafeArea(insets(10, 10, 10, 10), 400, 300, { x: 0, y: 0, width: 0, height: 0 }, 400, 300);
      expect(r).toEqual(ZERO_SAFE_AREA_INSETS);
    });
  });
});
