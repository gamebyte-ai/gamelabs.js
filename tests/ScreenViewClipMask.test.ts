import { describe, expect, it } from "vitest";
import { Container, Graphics, updateRenderGroupTransforms } from "pixi.js";
import { ScreenView } from "../src/core/ui/ScreenView.pixi.js";

// Pixi draws a mask Graphics on one of two paths. The batched path ignores the
// mask's alpha. The unbatched path (`batchMode: "no-batch"`, a custom shader, or
// a large shape) runs `GraphicsPipe.execute`, which skips any Graphics whose
// `isRenderable` is false - and `isRenderable` requires `groupAlpha > 0`. A mask
// skipped there writes nothing to the stencil, so the whole screen is clipped
// away: a blank screen. The clip mask must therefore stay renderable, and is
// hidden through a zero-alpha fill instead, which still writes the stencil.
function mountScreen(): { screen: ScreenView; mask: Graphics; stage: Container } {
  const stage = new Container({ isRenderGroup: true });
  const screen = new ScreenView();
  stage.addChild(screen);
  screen.onResize(390, 844, 1);
  const mask = screen.mask as Graphics;
  updateRenderGroupTransforms(stage.renderGroup!, true);
  return { screen, mask, stage };
}

describe("ScreenView clip mask", () => {
  it("clips the screen to the viewport rectangle", () => {
    const { screen, mask } = mountScreen();
    expect(mask).toBeInstanceOf(Graphics);
    expect(mask.parent).toBe(screen);
    const b = mask.getLocalBounds();
    expect([b.x, b.y, b.width, b.height]).toEqual([0, 0, 390, 844]);
  });

  it("stays renderable, so the unbatched mask path still writes the stencil", () => {
    const { mask } = mountScreen();
    mask.context.batchMode = "no-batch";
    expect(mask.groupAlpha).toBeGreaterThan(0);
    expect(mask.isRenderable).toBe(true);
  });

  it("draws nothing visible, even when a game detaches the mask", () => {
    const { screen, mask } = mountScreen();
    expect(mask.includeInBuild).toBe(false);
    const fills = mask.context.instructions.filter((i) => i.action === "fill");
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) expect((f.data as { style: { alpha: number } }).style.alpha).toBe(0);

    // Detaching puts the Graphics back into the drawn content; the zero-alpha
    // fill is what keeps a white rectangle from covering the screen then.
    screen.mask = null;
    expect(mask.includeInBuild).toBe(true);
    expect(mask.isRenderable).toBe(true);
  });
});
