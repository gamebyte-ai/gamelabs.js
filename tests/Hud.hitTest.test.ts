// Regression: Hud.hitTest() must work when the HUD canvas is a transparent
// `pointer-events: none` overlay (the default for a make-game HUD bridging input
// from the host). Pixi only sets `rootBoundary.rootTarget` from inside its native
// pointer handlers, which never fire on such a canvas — so `rootTarget` stays
// undefined and `hitTest` used to walk from it and throw
// "Cannot read properties of undefined (reading 'eventMode')" on every pointerdown.
import "pixi.js/browser"; // side-effect: applies the FederatedContainer mixin, as the real browser runtime does
import { describe, it, expect } from "vitest";
import { EventBoundary, Container } from "pixi.js";
import { Hud } from "../src/core/hud/Hud.js";

// `hitTest` only reads `this._app.{renderer.events.rootBoundary, stage}`, so we can
// exercise the real method against a minimal stub without booting a WebGL Application.
function makeHudStub() {
  const stage = new Container();
  const rootBoundary = new EventBoundary(); // rootTarget unset — as on a pointer-events:none HUD
  const app = { renderer: { events: { rootBoundary } }, stage };
  const hud = Object.create(Hud.prototype) as Hud;
  (hud as unknown as { _app: unknown })._app = app;
  return { hud, rootBoundary, stage };
}

describe("Hud.hitTest — pointer-events:none HUD (unseeded rootTarget)", () => {
  it("baseline: a raw EventBoundary with an unset rootTarget throws on hitTest", () => {
    const rootBoundary = new EventBoundary();
    // Proves the guard is load-bearing: without it, hitTest crashes.
    expect(() => rootBoundary.hitTest(10, 10)).toThrow();
  });

  it("does not throw and returns null for empty space", () => {
    const { hud } = makeHudStub();
    let result: Container | null | undefined;
    expect(() => {
      result = hud.hitTest(10, 10);
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it("seeds the boundary rootTarget with the stage", () => {
    const { hud, rootBoundary, stage } = makeHudStub();
    hud.hitTest(10, 10);
    expect(rootBoundary.rootTarget).toBe(stage);
  });
});
