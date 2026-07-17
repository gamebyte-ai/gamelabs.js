import { describe, it, expect, vi, afterEach } from "vitest";
import { applyConfigOverrides, loadConfigOverrides } from "../src/core/config/ConfigOverrides.js";
import type { ILogger } from "../src/core/dev/ILogger.js";

const noopLogger: ILogger = {
  log: () => {},
  show: () => {},
};

class ConfigWithMethod {
  public rows = 4;
  public cols = 4;
  public label(): string {
    return `${this.rows}x${this.cols}`;
  }
}

describe("applyConfigOverrides", () => {
  it("overrides primitive fields", () => {
    const target = { rows: 4, cols: 4, name: "orig", enabled: false };
    applyConfigOverrides(target, { rows: 5, name: "next", enabled: true });
    expect(target).toEqual({ rows: 5, cols: 4, name: "next", enabled: true });
  });

  it("recursively merges nested plain objects, preserving untouched keys", () => {
    const target = {
      transitions: { enter: { type: "INSTANT", durationMs: 0 }, exit: { type: "FADE", durationMs: 200 } },
    };
    applyConfigOverrides(target, { transitions: { enter: { durationMs: 300 } } });
    expect(target.transitions.enter).toEqual({ type: "INSTANT", durationMs: 300 });
    expect(target.transitions.exit).toEqual({ type: "FADE", durationMs: 200 });
  });

  it("replaces arrays wholesale rather than merging by index", () => {
    const target = { colors: [1, 2, 3, 4] };
    applyConfigOverrides(target, { colors: [9, 8] });
    expect(target.colors).toEqual([9, 8]);
  });

  it("silently ignores keys not present on the target", () => {
    const target = { rows: 4 };
    applyConfigOverrides(target, { rows: 5, unknownField: "bar" });
    expect(target).toEqual({ rows: 5 });
    expect("unknownField" in target).toBe(false);
  });

  it("returns the target unchanged when overrides are null or undefined", () => {
    const target = { rows: 4 };
    expect(applyConfigOverrides(target, null)).toBe(target);
    expect(applyConfigOverrides(target, undefined)).toBe(target);
    expect(target).toEqual({ rows: 4 });
  });

  it("mutates class instance fields while preserving prototype methods", () => {
    const target = new ConfigWithMethod();
    applyConfigOverrides(target, { rows: 5, cols: 6 });
    expect(target.rows).toBe(5);
    expect(target.cols).toBe(6);
    expect(target.label()).toBe("5x6");
    expect(target).toBeInstanceOf(ConfigWithMethod);
  });

  it("returns the same reference it received (in-place mutation)", () => {
    const target = { rows: 4 };
    expect(applyConfigOverrides(target, { rows: 5 })).toBe(target);
  });
});

describe("loadConfigOverrides", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    const payload = { rows: 5, cols: 5 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    );
    const result = await loadConfigOverrides("/game-config.json", noopLogger);
    expect(result).toEqual(payload);
  });

  it("returns null on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const result = await loadConfigOverrides("/game-config.json", noopLogger);
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const result = await loadConfigOverrides("/game-config.json", noopLogger);
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{ malformed", { status: 200 })),
    );
    const result = await loadConfigOverrides("/game-config.json", noopLogger);
    expect(result).toBeNull();
  });

  it("returns null when top-level JSON is an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([1, 2, 3]), { status: 200 })),
    );
    const result = await loadConfigOverrides("/game-config.json", noopLogger);
    expect(result).toBeNull();
  });

  it("returns null when top-level JSON is a primitive", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(42), { status: 200 })),
    );
    const result = await loadConfigOverrides("/game-config.json", noopLogger);
    expect(result).toBeNull();
  });

  it("uses no-cache fetch semantics", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await loadConfigOverrides("/game-config.json", noopLogger);
    expect(fetchSpy).toHaveBeenCalledWith("/game-config.json", { cache: "no-cache" });
  });

  it("logs a warning when the logger is provided and the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const logger: ILogger = {
      log: vi.fn(),
      show: () => {},
    };
    await loadConfigOverrides("/game-config.json", logger);
    expect(logger.log).toHaveBeenCalled();
  });
});
