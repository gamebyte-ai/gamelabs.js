import { describe, it, expect } from "vitest";
import { FixedStepAccumulator } from "../src/core/utilities/FixedStepAccumulator.js";

describe("FixedStepAccumulator", () => {
  it("exposes fixedDt from hz", () => {
    expect(new FixedStepAccumulator({ hz: 60 }).fixedDt).toBeCloseTo(1 / 60, 10);
    expect(new FixedStepAccumulator({ hz: 50 }).fixedDt).toBeCloseTo(1 / 50, 10);
  });

  it("throws on non-positive hz", () => {
    expect(() => new FixedStepAccumulator({ hz: 0 })).toThrow();
    expect(() => new FixedStepAccumulator({ hz: -1 })).toThrow();
  });

  it("runs one step for exactly one fixed dt", () => {
    const acc = new FixedStepAccumulator({ hz: 60 });
    expect(acc.consume(1 / 60)).toBe(1);
    expect(acc.alpha).toBeCloseTo(0, 6);
  });

  it("runs zero steps when below a fixed dt and carries the remainder as alpha", () => {
    const acc = new FixedStepAccumulator({ hz: 60 });
    expect(acc.consume(1 / 120)).toBe(0); // half a step
    expect(acc.alpha).toBeCloseTo(0.5, 5);
  });

  it("accumulates fractional dt across calls into whole steps", () => {
    const acc = new FixedStepAccumulator({ hz: 60 });
    expect(acc.consume(1 / 90)).toBe(0); // 0.666 of a step
    expect(acc.consume(1 / 90)).toBe(1); // 1.333 total → 1 step, 0.333 left
    expect(acc.alpha).toBeCloseTo(1 / 3, 4);
  });

  it("clamps the backlog to maxSubSteps (spiral-of-death guard)", () => {
    const acc = new FixedStepAccumulator({ hz: 60, maxSubSteps: 5 });
    // A 10-second hitch would be 600 steps; must clamp to 5.
    expect(acc.consume(10)).toBe(5);
    expect(acc.alpha).toBeCloseTo(0, 6);
  });

  it("ignores non-finite or negative dt", () => {
    const acc = new FixedStepAccumulator({ hz: 60 });
    expect(acc.consume(Number.NaN)).toBe(0);
    expect(acc.consume(-5)).toBe(0);
    expect(acc.alpha).toBe(0);
  });

  it("reset discards the remainder", () => {
    const acc = new FixedStepAccumulator({ hz: 60 });
    acc.consume(1 / 120);
    expect(acc.alpha).toBeGreaterThan(0);
    acc.reset();
    expect(acc.alpha).toBe(0);
  });
});
