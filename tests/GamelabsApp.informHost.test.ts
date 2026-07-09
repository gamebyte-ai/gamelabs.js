import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { HostEvent } from "../src/core/app/HostEvent.js";

vi.mock("../src/core/app/isDev.js", () => ({
  computeIsDev: vi.fn(() => true),
}));

// Import AFTER vi.mock so GamelabsApp's transitive import resolves to the mocked module.
const { GamelabsApp } = await import("../src/core/GamelabsApp.js");
const { computeIsDev } = await import("../src/core/app/isDev.js");
const mockComputeIsDev = computeIsDev as unknown as ReturnType<typeof vi.fn>;

function makeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: {},
    clientWidth: 0,
    clientHeight: 0,
    getBoundingClientRect: () => ({ width: 0, height: 0, x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    remove: () => {},
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
}

function makeApp(): InstanceType<typeof GamelabsApp> {
  return new GamelabsApp({ canvas: makeCanvas() });
}

function makeFakeWindow(extra?: Record<string, unknown>): Window {
  return {
    __gamelabsHostListeners: undefined,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: () => ({ position: "relative" }),
    ...extra,
  } as unknown as Window;
}

beforeEach(() => {
  mockComputeIsDev.mockReturnValue(true);
});

describe("GamelabsApp.informHost — DEV/PROD warn", () => {
  it("DEV mode: informHost with 0 listeners → console.warn fires", () => {
    mockComputeIsDev.mockReturnValue(true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = makeApp();

    app.informHost({ type: "ready" });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]![0]).toContain("no host listener is registered");

    warnSpy.mockRestore();
  });

  it("PROD mode: informHost with 0 listeners → NO console.warn", () => {
    mockComputeIsDev.mockReturnValue(false);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = makeApp();

    app.informHost({ type: "ready" });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("DEV mode with listener present → NO warn (only fires when size === 0)", () => {
    mockComputeIsDev.mockReturnValue(true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = makeApp();
    app.registerHostListener(vi.fn());

    app.informHost({ type: "ready" });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("informHost with 0 listeners → no throw regardless of dev/prod", () => {
    mockComputeIsDev.mockReturnValue(false);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = makeApp();
    expect(() => app.informHost({ type: "ready" })).not.toThrow();
    warnSpy.mockRestore();
  });
});

describe("GamelabsApp.informHost — registerHostListener", () => {
  it("registerHostListener — listener receives event with correct payload", () => {
    const app = makeApp();
    const listener = vi.fn();
    app.registerHostListener(listener);
    const event: HostEvent = { type: "end", outcome: "win", score: 42, durationMs: 1500, level: 3 };
    app.informHost(event);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("registerHostListener — Unsubscribe stops delivery", () => {
    const app = makeApp();
    const listener = vi.fn();
    const unsub = app.registerHostListener(listener);
    unsub();
    app.informHost({ type: "ready" });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("GamelabsApp — window.__gamelabsHostListeners bridge", () => {
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("constructor picks up pre-existing window.__gamelabsHostListeners = [fn]", () => {
    const fn = vi.fn();
    (globalThis as unknown as { window: Window }).window = makeFakeWindow({ __gamelabsHostListeners: [fn] });

    const app = makeApp();
    app.informHost({ type: "ready" });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith({ type: "ready" });
  });

  it("late-register: push(fn) after construction → informHost triggers fn (dirty-scan)", () => {
    const arr: Array<(e: HostEvent) => void> = [];
    (globalThis as unknown as { window: Window }).window = makeFakeWindow({ __gamelabsHostListeners: arr });

    const app = makeApp();

    const fn = vi.fn();
    arr.push(fn);

    app.informHost({ type: "interaction" });
    expect(fn).toHaveBeenCalledOnce();
  });

  it("multi-listener: 3 fns pushed → informHost calls all 3", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const fn3 = vi.fn();
    (globalThis as unknown as { window: Window }).window = makeFakeWindow({
      __gamelabsHostListeners: [fn1, fn2, fn3],
    });

    const app = makeApp();
    const event: HostEvent = { type: "roundStart" };
    app.informHost(event);
    expect(fn1).toHaveBeenCalledWith(event);
    expect(fn2).toHaveBeenCalledWith(event);
    expect(fn3).toHaveBeenCalledWith(event);
  });

  it("idempotent cursor: 2× informHost after 1 push → fn fires 2× (not 4×, cursor doesn't re-register)", () => {
    const arr: Array<(e: HostEvent) => void> = [];
    (globalThis as unknown as { window: Window }).window = makeFakeWindow({ __gamelabsHostListeners: arr });

    const app = makeApp();

    const fn = vi.fn();
    arr.push(fn);

    app.informHost({ type: "ready" });
    app.informHost({ type: "ready" });

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("GamelabsApp — SSR guard", () => {
  it("with window undefined: constructor + informHost don't throw", () => {
    // Force window to be undefined regardless of test env
    const savedWindow = (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { window?: unknown }).window;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(() => {
        const app = makeApp();
        app.informHost({ type: "ready" });
      }).not.toThrow();
    } finally {
      warnSpy.mockRestore();
      if (savedWindow !== undefined) {
        (globalThis as unknown as { window: unknown }).window = savedWindow;
      }
    }
  });
});

describe("GamelabsApp — malformed payload", () => {
  it("openStore without url — TS compile error caught by @ts-expect-error", () => {
    const app = makeApp();
    const listener = vi.fn();
    app.registerHostListener(listener);

    // @ts-expect-error — url is required on openStore variant; TS enforces at compile time
    app.informHost({ type: "openStore" });

    // Runtime: event reaches listener (shim guards handle missing url downstream)
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("GamelabsApp — interaction auto-hook", () => {
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { document?: unknown }).document;
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
  });

  it("pointerdown on canvas fires exactly one interaction event; second pointerdown → no second event", () => {
    const listeners: Record<string, Array<() => void>> = {};
    const canvas = {
      width: 0,
      height: 0,
      style: {},
      clientWidth: 0,
      clientHeight: 0,
      getBoundingClientRect: () => ({ width: 0, height: 0, x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0 }),
      addEventListener: (type: string, handler: () => void) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type]!.push(handler);
      },
      removeEventListener: (type: string, handler: () => void) => {
        if (listeners[type]) {
          listeners[type] = listeners[type]!.filter((h) => h !== handler);
        }
      },
      remove: () => {},
      getContext: () => null,
    } as unknown as HTMLCanvasElement;

    (globalThis as unknown as { window: Window }).window = makeFakeWindow();

    const app = new GamelabsApp({ canvas });

    const received: HostEvent[] = [];
    app.registerHostListener((e) => received.push(e));

    // Auto-hook is called from initialize() in real usage; here we invoke it
    // directly because initialize() requires the full world/hud/asset pipeline.
    (app as unknown as { _attachInteractionAutoHook(): void })._attachInteractionAutoHook();

    const pdListeners = listeners["pointerdown"] ?? [];
    expect(pdListeners.length).toBeGreaterThan(0);
    pdListeners[0]!();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "interaction" });

    // Second pointerdown after once-fired hook — handlers removed by fire closure
    const pdListeners2 = listeners["pointerdown"] ?? [];
    if (pdListeners2.length > 0) pdListeners2[0]!();
    expect(received).toHaveLength(1);
  });
});
