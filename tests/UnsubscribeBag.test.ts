import { describe, it, expect, vi } from "vitest";
import { UnsubscribeBag } from "../src/core/events/subscriptions.js";

describe("UnsubscribeBag", () => {
  // ─── Basic flush behavior ──────────────────────────────────

  it("should call all unsubscribe callbacks on flush", () => {
    const bag = new UnsubscribeBag();
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    const unsub3 = vi.fn();

    bag.add(unsub1);
    bag.add(unsub2);
    bag.add(unsub3);
    bag.flush();

    expect(unsub1).toHaveBeenCalledOnce();
    expect(unsub2).toHaveBeenCalledOnce();
    expect(unsub3).toHaveBeenCalledOnce();
  });

  it("should flush in LIFO order", () => {
    const bag = new UnsubscribeBag();
    const order: number[] = [];

    bag.add(() => order.push(1));
    bag.add(() => order.push(2));
    bag.add(() => order.push(3));
    bag.flush();

    expect(order).toEqual([3, 2, 1]);
  });

  it("should return the unsubscribe function from add()", () => {
    const bag = new UnsubscribeBag();
    const unsub = vi.fn();
    const returned = bag.add(unsub);
    expect(returned).toBe(unsub);
  });

  // ─── Idempotent flush ──────────────────────────────────────

  it("should be safe to flush multiple times — callbacks only called once", () => {
    const bag = new UnsubscribeBag();
    const unsub = vi.fn();

    bag.add(unsub);
    bag.flush();
    bag.flush();
    bag.flush();

    expect(unsub).toHaveBeenCalledOnce();
  });

  it("should flush an empty bag without error", () => {
    const bag = new UnsubscribeBag();
    expect(() => bag.flush()).not.toThrow();
  });

  // ─── Null / undefined handling ─────────────────────────────

  it("should ignore null and undefined — no crash on flush", () => {
    const bag = new UnsubscribeBag();
    bag.add(null);
    bag.add(undefined);
    bag.flush();
  });

  it("should return a noop function when adding null", () => {
    const bag = new UnsubscribeBag();
    const returned = bag.add(null);
    expect(typeof returned).toBe("function");
    expect(() => returned()).not.toThrow();
  });

  it("should return a noop function when adding undefined", () => {
    const bag = new UnsubscribeBag();
    const returned = bag.add(undefined);
    expect(typeof returned).toBe("function");
    expect(() => returned()).not.toThrow();
  });

  it("should not include null/undefined noops in flush — only real callbacks run", () => {
    const bag = new UnsubscribeBag();
    const real = vi.fn();

    bag.add(null);
    bag.add(real);
    bag.add(undefined);
    bag.flush();

    expect(real).toHaveBeenCalledOnce();
  });

  // ─── Add after flush ───────────────────────────────────────

  it("should accept and flush new callbacks added after a previous flush", () => {
    const bag = new UnsubscribeBag();
    const first = vi.fn();
    const second = vi.fn();

    bag.add(first);
    bag.flush();

    bag.add(second);
    bag.flush();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  // ─── Error resilience ──────────────────────────────────────

  it("should continue flushing when a callback throws", () => {
    const bag = new UnsubscribeBag();
    const unsub1 = vi.fn();
    const unsub2 = vi.fn(() => {
      throw new Error("boom");
    });
    const unsub3 = vi.fn();

    bag.add(unsub1);
    bag.add(unsub2);
    bag.add(unsub3);
    bag.flush();

    // LIFO: 3, 2 (throws), 1 — all must still run
    expect(unsub3).toHaveBeenCalledOnce();
    expect(unsub2).toHaveBeenCalledOnce();
    expect(unsub1).toHaveBeenCalledOnce();
  });

  it("should survive ALL callbacks throwing", () => {
    const bag = new UnsubscribeBag();
    const thrower1 = vi.fn(() => {
      throw new Error("one");
    });
    const thrower2 = vi.fn(() => {
      throw new Error("two");
    });
    const thrower3 = vi.fn(() => {
      throw new Error("three");
    });

    bag.add(thrower1);
    bag.add(thrower2);
    bag.add(thrower3);

    // flush must not throw, even if every callback does
    expect(() => bag.flush()).not.toThrow();

    expect(thrower1).toHaveBeenCalledOnce();
    expect(thrower2).toHaveBeenCalledOnce();
    expect(thrower3).toHaveBeenCalledOnce();
  });

  // ─── Re-entrant flush ──────────────────────────────────────

  it("should handle callback that adds to the bag during flush — new items not flushed in same pass", () => {
    const bag = new UnsubscribeBag();
    const laterCb = vi.fn();

    bag.add(() => {
      // Re-entrant: add during flush
      bag.add(laterCb);
    });

    bag.flush();

    // laterCb was added during flush, so it goes into the NEW internal array
    // It should NOT have been called in this flush pass
    expect(laterCb).not.toHaveBeenCalled();

    // But it should be called on the next flush
    bag.flush();
    expect(laterCb).toHaveBeenCalledOnce();
  });

  it("should handle callback that calls flush() recursively", () => {
    const bag = new UnsubscribeBag();
    const innerCb = vi.fn();
    let recursiveFlushed = false;

    bag.add(innerCb);
    bag.add(() => {
      if (!recursiveFlushed) {
        recursiveFlushed = true;
        // Recursive flush — the list was already snapshot and cleared,
        // so this inner flush is a no-op
        bag.flush();
      }
    });

    bag.flush();

    // innerCb should be called exactly once (the recursive flush sees an empty list)
    expect(innerCb).toHaveBeenCalledOnce();
  });

  // ─── Scale ─────────────────────────────────────────────────

  it("should handle a large number of callbacks", () => {
    const bag = new UnsubscribeBag();
    const callbacks = Array.from({ length: 10_000 }, () => vi.fn());

    for (const cb of callbacks) bag.add(cb);
    bag.flush();

    for (const cb of callbacks) {
      expect(cb).toHaveBeenCalledOnce();
    }
  });
});
