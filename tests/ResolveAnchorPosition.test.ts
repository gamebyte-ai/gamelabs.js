import { describe, it, expect } from "vitest";
import { resolveAnchorPosition } from "../src/modules/onscreencontrols/src/utilities/resolveAnchorPosition.js";
import { ControlAnchor } from "../src/modules/onscreencontrols/src/constants/ControlAnchor.js";
import type { SafeAreaInsets } from "../src/core/utilities/safeAreaInsets.js";

const W = 800;
const H = 600;
const INSETS: SafeAreaInsets = { top: 47, right: 10, bottom: 34, left: 20 };

describe("resolveAnchorPosition", () => {
  describe("without insets (legacy raw edges)", () => {
    it.each([
      [ControlAnchor.TopLeft, 30, 40],
      [ControlAnchor.TopCenter, W / 2 + 30, 40],
      [ControlAnchor.TopRight, W - 30, 40],
      [ControlAnchor.CenterLeft, 30, H / 2 + 40],
      [ControlAnchor.Center, W / 2 + 30, H / 2 + 40],
      [ControlAnchor.CenterRight, W - 30, H / 2 + 40],
      [ControlAnchor.BottomLeft, 30, H - 40],
      [ControlAnchor.BottomCenter, W / 2 + 30, H - 40],
      [ControlAnchor.BottomRight, W - 30, H - 40],
    ])("%s", (anchor, x, y) => {
      expect(resolveAnchorPosition(anchor, 30, 40, W, H)).toEqual({ x, y });
    });
  });

  describe("with insets, edge axes shift inward", () => {
    it.each([
      [ControlAnchor.TopLeft, INSETS.left + 30, INSETS.top + 40],
      [ControlAnchor.TopRight, W - INSETS.right - 30, INSETS.top + 40],
      [ControlAnchor.BottomLeft, INSETS.left + 30, H - INSETS.bottom - 40],
      [ControlAnchor.BottomRight, W - INSETS.right - 30, H - INSETS.bottom - 40],
      [ControlAnchor.CenterLeft, INSETS.left + 30, H / 2 + 40],
      [ControlAnchor.CenterRight, W - INSETS.right - 30, H / 2 + 40],
      [ControlAnchor.TopCenter, W / 2 + 30, INSETS.top + 40],
      [ControlAnchor.BottomCenter, W / 2 + 30, H - INSETS.bottom - 40],
    ])("%s", (anchor, x, y) => {
      expect(resolveAnchorPosition(anchor, 30, 40, W, H, INSETS)).toEqual({ x, y });
    });

    it("leaves the true center untouched", () => {
      expect(resolveAnchorPosition(ControlAnchor.Center, 30, 40, W, H, INSETS)).toEqual({
        x: W / 2 + 30,
        y: H / 2 + 40,
      });
    });

    it("matches the legacy result for all-zero insets", () => {
      const zero: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
      for (const anchor of Object.values(ControlAnchor)) {
        expect(resolveAnchorPosition(anchor, 30, 40, W, H, zero)).toEqual(resolveAnchorPosition(anchor, 30, 40, W, H));
      }
    });
  });
});
