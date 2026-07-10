import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HostEvents } from "../src/core/app/HostEvents.js";
import type { HostEvent } from "../src/core/app/HostEvent.js";

const readyEvent: HostEvent = { type: "ready" };

describe("HostEvents", () => {
  // ─── register + emit ─────────────────────────────────────────

  it("register — fires listener on emit", () => {
    const events = new HostEvents();
    const listener = vi.fn();
    events.register(listener);
    events.emit(readyEvent, false);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(readyEvent);
  });

  // ─── Unsubscribe ──────────────────────────────────────────────

  it("Unsubscribe — removes listener, no call on subsequent emit", () => {
    const events = new HostEvents();
    const listener = vi.fn();
    const unsub = events.register(listener);
    unsub();
    events.emit(readyEvent, false);
    expect(listener).not.toHaveBeenCalled();
  });

  // ─── size() ───────────────────────────────────────────────────

  it("size() — correct after add and remove", () => {
    const events = new HostEvents();
    expect(events.size()).toBe(0);
    const unsub = events.register(vi.fn());
    expect(events.size()).toBe(1);
    events.register(vi.fn());
    expect(events.size()).toBe(2);
    unsub();
    expect(events.size()).toBe(1);
  });

  // ─── emit throw isolation ─────────────────────────────────────

  it("emit — listener1 throws, listener2 still fires", () => {
    const events = new HostEvents();
    const listener2 = vi.fn();
    events.register(() => {
      throw new Error("boom");
    });
    events.register(listener2);
    expect(() => events.emit(readyEvent, false)).not.toThrow();
    expect(listener2).toHaveBeenCalledOnce();
  });

  // ─── emit dev=true → console.warn on throw ───────────────────

  it("emit dev=true — console.warn called when listener throws", () => {
    const events = new HostEvents();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    events.register(() => {
      throw new Error("listener error");
    });
    events.emit(readyEvent, true);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]![0]).toContain("[gamelabs]");
    warnSpy.mockRestore();
  });

  // ─── emit dev=false → no warn on throw ───────────────────────

  it("emit dev=false — no console.warn when listener throws", () => {
    const events = new HostEvents();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    events.register(() => {
      throw new Error("listener error");
    });
    events.emit(readyEvent, false);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ─── multiple listeners all receive event ─────────────────────

  it("emit — all listeners receive the event", () => {
    const events = new HostEvents();
    const l1 = vi.fn();
    const l2 = vi.fn();
    const l3 = vi.fn();
    events.register(l1);
    events.register(l2);
    events.register(l3);
    const endEvent: HostEvent = { type: "end", outcome: "win", score: 100 };
    events.emit(endEvent, false);
    expect(l1).toHaveBeenCalledWith(endEvent);
    expect(l2).toHaveBeenCalledWith(endEvent);
    expect(l3).toHaveBeenCalledWith(endEvent);
  });

  // ─── Set deduplication ───────────────────────────────────────

  it("register same function reference twice — only fires once (Set dedup)", () => {
    const events = new HostEvents();
    const listener = vi.fn();
    events.register(listener);
    events.register(listener);
    expect(events.size()).toBe(1);
    events.emit(readyEvent, false);
    expect(listener).toHaveBeenCalledOnce();
  });

  // ─── Unsubscribe idempotent ───────────────────────────────────

  it("calling Unsubscribe twice — no throw, size still 0", () => {
    const events = new HostEvents();
    const unsub = events.register(vi.fn());
    unsub();
    expect(() => unsub()).not.toThrow();
    expect(events.size()).toBe(0);
  });
});
