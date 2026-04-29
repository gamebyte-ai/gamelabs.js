import { describe, it, expect } from "vitest";
import { StyleManager } from "../src/core/styles/StyleManager.js";

interface ButtonStyle {
  size: number;
  up: { color: number; alpha: number };
  down: { color: number; alpha: number };
}

describe("StyleManager", () => {
  it("registers and resolves a default", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { size: 88, up: { color: 0x44cc66, alpha: 0.85 } });
    expect(sm.resolve<ButtonStyle>("default")).toEqual({ size: 88, up: { color: 0x44cc66, alpha: 0.85 } });
  });

  it("composes multiple sources, later wins", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { size: 88, up: { color: 0x44cc66, alpha: 0.85 } });
    const out = sm.resolve<ButtonStyle>("default", { size: 100 });
    expect(out.size).toBe(100);
    expect(out.up).toEqual({ color: 0x44cc66, alpha: 0.85 });
  });

  it("deep-merges nested objects", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { up: { color: 0x44cc66, alpha: 0.85 } });
    const out = sm.resolve<ButtonStyle>("default", { up: { color: 0xff0000 } });
    expect(out.up).toEqual({ color: 0xff0000, alpha: 0.85 });
  });

  it("replaces arrays rather than concatenating", () => {
    const sm = new StyleManager();
    sm.add("a", { tags: [1, 2, 3] });
    const out = sm.resolve<{ tags: number[] }>("a", { tags: [9] });
    expect(out.tags).toEqual([9]);
  });

  it("modify deep-merges into the registered default", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { size: 88, up: { color: 0x44cc66, alpha: 0.85 } });
    sm.modify<ButtonStyle>("default", { up: { color: 0xff0000 } });
    expect(sm.resolve<ButtonStyle>("default")).toEqual({ size: 88, up: { color: 0xff0000, alpha: 0.85 } });
  });

  it("modify is visible to subsequent resolves", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { size: 88 });
    sm.modify<ButtonStyle>("default", { size: 100 });
    expect(sm.resolve<ButtonStyle>("default").size).toBe(100);
  });

  it("composes nested arrays of sources", () => {
    const sm = new StyleManager();
    sm.add("a", { x: 1 });
    sm.add("b", { y: 2 });
    const out = sm.resolve<{ x?: number; y?: number; z?: number }>(["a", "b", { z: 3 }]);
    expect(out).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("returns a fresh object — mutating the result does not leak back", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { up: { color: 0x44cc66, alpha: 0.85 } });
    const out = sm.resolve<ButtonStyle>("default");
    out.up.color = 0x000000;
    expect(sm.resolve<ButtonStyle>("default").up.color).toBe(0x44cc66);
  });

  it("clones input on add — later mutation of the input does not leak in", () => {
    const sm = new StyleManager();
    const input = { up: { color: 0x44cc66 } };
    sm.add("default", input);
    input.up.color = 0x000000;
    expect(sm.resolve<{ up: { color: number } }>("default").up.color).toBe(0x44cc66);
  });

  it("undefined values in source are skipped", () => {
    const sm = new StyleManager();
    sm.add<ButtonStyle>("default", { size: 88 });
    const out = sm.resolve<ButtonStyle>("default", { size: undefined as unknown as number });
    expect(out.size).toBe(88);
  });

  it("throws on duplicate add", () => {
    const sm = new StyleManager();
    sm.add("a", {});
    expect(() => sm.add("a", {})).toThrow();
  });

  it("throws on modify of unknown id", () => {
    const sm = new StyleManager();
    expect(() => sm.modify("missing", {})).toThrow();
  });

  it("throws on resolve of unknown id", () => {
    const sm = new StyleManager();
    expect(() => sm.resolve("missing")).toThrow();
  });
});
