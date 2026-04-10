import { describe, it, expect } from "vitest";
import { InjectionToken } from "../src/core/di/InjectionToken.js";

describe("InjectionToken", () => {
  it("should store the description", () => {
    const token = new InjectionToken<string>("MyService");
    expect(token.description).toBe("MyService");
  });

  it("should create unique tokens even with same description", () => {
    const tokenA = new InjectionToken<string>("Same");
    const tokenB = new InjectionToken<string>("Same");
    expect(tokenA).not.toBe(tokenB);
  });
});
