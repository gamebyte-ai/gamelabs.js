import { describe, it, expect, vi } from "vitest";
import { DIContainer } from "../src/core/di/DIContainer.js";
import { InjectionToken } from "../src/core/di/InjectionToken.js";
import type { ILogger } from "../src/core/dev/ILogger.js";

const noopLogger: ILogger = {
  log: () => {},
  show: () => {},
};

describe("DIContainer", () => {
  // ─── Basic resolution ───────────────────────────────────────

  it("should bind and resolve an instance", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("TestToken");
    container.bindInstance(token, "hello");
    expect(container.getInstance(token)).toBe("hello");
  });

  it("should bind and resolve a singleton factory", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<{ value: number }>("Counter");
    let callCount = 0;

    container.bindSingleton(token, () => {
      callCount++;
      return { value: 42 };
    });

    const first = container.getInstance(token);
    const second = container.getInstance(token);

    expect(first.value).toBe(42);
    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("should resolve constructor token (class as token)", () => {
    const container = new DIContainer(noopLogger);

    class MyService {
      readonly tag = "real";
    }

    container.bindInstance(MyService, new MyService());
    const instance = container.getInstance(MyService);
    expect(instance.tag).toBe("real");
  });

  // ─── Aliases ────────────────────────────────────────────────

  it("should resolve aliases to primary token", () => {
    const container = new DIContainer(noopLogger);
    const primary = new InjectionToken<string>("Primary");
    const alias = new InjectionToken<string>("Alias");
    container.bindInstance(primary, "value", [alias]);
    expect(container.getInstance(alias)).toBe("value");
    expect(container.getInstance(primary)).toBe("value");
  });

  it("should support multiple aliases for one primary", () => {
    const container = new DIContainer(noopLogger);
    const primary = new InjectionToken<string>("Primary");
    const alias1 = new InjectionToken<string>("Alias1");
    const alias2 = new InjectionToken<string>("Alias2");

    container.bindInstance(primary, "shared", [alias1, alias2]);

    expect(container.getInstance(alias1)).toBe("shared");
    expect(container.getInstance(alias2)).toBe("shared");
    expect(container.getInstance(primary)).toBe("shared");
  });

  it("should resolve singleton via alias — factory called once, same instance", () => {
    const container = new DIContainer(noopLogger);
    const primary = new InjectionToken<{ count: number }>("Primary");
    const alias = new InjectionToken<{ count: number }>("Alias");
    let created = 0;

    container.bindSingleton(
      primary,
      () => {
        created++;
        return { count: created };
      },
      [alias],
    );

    const fromAlias = container.getInstance(alias);
    const fromPrimary = container.getInstance(primary);

    expect(fromAlias).toBe(fromPrimary);
    expect(created).toBe(1);
  });

  it("should allow re-mapping same alias to same primary (idempotent)", () => {
    const container = new DIContainer(noopLogger);
    const primary = new InjectionToken<string>("P");
    const alias = new InjectionToken<string>("A");

    container.bindInstance(primary, "value", [alias, alias]);
    expect(container.getInstance(alias)).toBe("value");
  });

  it("should throw when alias is mapped to a different primary", () => {
    const container = new DIContainer(noopLogger);
    const primary1 = new InjectionToken<string>("P1");
    const primary2 = new InjectionToken<string>("P2");
    const alias = new InjectionToken<string>("SharedAlias");

    container.bindInstance(primary1, "one", [alias]);
    expect(() => container.bindInstance(primary2, "two", [alias])).toThrow("already mapped");
  });

  // ─── Duplicate bindings ─────────────────────────────────────

  it("should throw on duplicate bindInstance", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("Dup");
    container.bindInstance(token, "first");
    expect(() => container.bindInstance(token, "second")).toThrow("already bound");
  });

  it("should throw on duplicate bindSingleton", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("Dup");
    container.bindSingleton(token, () => "first");
    expect(() => container.bindSingleton(token, () => "second")).toThrow("already bound");
  });

  it("should throw on mixed duplicate (instance then singleton)", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("Mixed");
    container.bindInstance(token, "inst");
    expect(() => container.bindSingleton(token, () => "factory")).toThrow("already bound");
  });

  // ─── Missing bindings ──────────────────────────────────────

  it("should throw on missing binding", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("Missing");
    expect(() => container.getInstance(token)).toThrow("No binding found");
  });

  // ─── Circular dependency detection ─────────────────────────

  it("should detect direct circular dependency (A → A)", () => {
    const container = new DIContainer(noopLogger);
    const tokenA = new InjectionToken<string>("A");

    container.bindSingleton(tokenA, (resolver) => {
      return resolver.getInstance(tokenA);
    });

    expect(() => container.getInstance(tokenA)).toThrow("Circular dependency");
  });

  it("should detect indirect circular dependency (A → B → A)", () => {
    const container = new DIContainer(noopLogger);
    const tokenA = new InjectionToken<string>("A");
    const tokenB = new InjectionToken<string>("B");

    container.bindSingleton(tokenA, (resolver) => {
      resolver.getInstance(tokenB);
      return "a";
    });
    container.bindSingleton(tokenB, (resolver) => {
      resolver.getInstance(tokenA);
      return "b";
    });

    expect(() => container.getInstance(tokenA)).toThrow("Circular dependency");
  });

  it("should detect deep circular dependency (A → B → C → A)", () => {
    const container = new DIContainer(noopLogger);
    const tokenA = new InjectionToken<string>("A");
    const tokenB = new InjectionToken<string>("B");
    const tokenC = new InjectionToken<string>("C");

    container.bindSingleton(tokenA, (r) => {
      r.getInstance(tokenB);
      return "a";
    });
    container.bindSingleton(tokenB, (r) => {
      r.getInstance(tokenC);
      return "b";
    });
    container.bindSingleton(tokenC, (r) => {
      r.getInstance(tokenA);
      return "c";
    });

    expect(() => container.getInstance(tokenA)).toThrow("Circular dependency");
  });

  // ─── Cross-dependency (non-circular) ───────────────────────

  it("should resolve cross-dependencies between singletons", () => {
    const container = new DIContainer(noopLogger);
    const tokenA = new InjectionToken<{ name: string }>("A");
    const tokenB = new InjectionToken<{ ref: { name: string } }>("B");

    container.bindSingleton(tokenA, () => ({ name: "ServiceA" }));
    container.bindSingleton(tokenB, (resolver) => ({
      ref: resolver.getInstance(tokenA),
    }));

    const b = container.getInstance(tokenB);
    expect(b.ref.name).toBe("ServiceA");
    expect(b.ref).toBe(container.getInstance(tokenA));
  });

  // ─── IInjectionTarget ──────────────────────────────────────

  it("should call inject() on IInjectionTarget instances", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<{ inject: (r: unknown) => void }>("Target");
    const injectSpy = vi.fn();

    container.bindSingleton(token, () => ({
      inject: injectSpy,
    }));

    container.getInstance(token);
    expect(injectSpy).toHaveBeenCalledOnce();
    expect(injectSpy).toHaveBeenCalledWith(container);
  });

  it("should NOT call inject() on plain objects without inject method", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<{ value: number }>("Plain");

    container.bindSingleton(token, () => ({ value: 1 }));

    const result = container.getInstance(token);
    expect(result.value).toBe(1);
  });

  it("should NOT treat non-function inject property as IInjectionTarget", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<{ inject: string }>("FakeInject");

    container.bindSingleton(token, () => ({ inject: "not-a-function" }));

    // Should not throw — inject is a string, not a function
    const result = container.getInstance(token);
    expect(result.inject).toBe("not-a-function");
  });

  it("should NOT call inject() on null returned by factory", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<null>("Null");

    container.bindSingleton(token, () => null);

    // _isInjectionTarget checks value !== null, so no crash
    expect(container.getInstance(token)).toBeNull();
  });

  it("should NOT call inject() on primitive returned by factory", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<number>("Num");

    container.bindSingleton(token, () => 42);

    // typeof 42 !== "object", so _isInjectionTarget returns false
    expect(container.getInstance(token)).toBe(42);
  });

  // ─── inject() throws — state corruption ────────────────────

  it("should cache instance even if inject() throws — caller gets broken instance on retry", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<{ inject: () => void; ready: boolean }>("BrokenInject");

    container.bindSingleton(token, () => ({
      ready: false,
      inject: () => {
        throw new Error("inject failed");
      },
    }));

    // First call: inject() throws, but instance is already cached (hasInstance=true)
    expect(() => container.getInstance(token)).toThrow("inject failed");

    // Second call: returns the cached (partially initialized) instance
    // This is the ACTUAL behavior — the instance IS cached despite inject() failing
    const result = container.getInstance(token);
    expect(result.ready).toBe(false);
  });

  // ─── Factory failure and recovery ──────────────────────────

  it("should reset creating flag when factory throws — no false circular dependency", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("Failing");
    let callCount = 0;

    container.bindSingleton(token, () => {
      callCount++;
      if (callCount === 1) throw new Error("factory failed");
      return "recovered";
    });

    expect(() => container.getInstance(token)).toThrow("factory failed");

    // Must NOT throw "Circular dependency" — creating flag was reset by finally
    const result = container.getInstance(token);
    expect(result).toBe("recovered");
  });

  it("should remain usable after a factory error for other tokens", () => {
    const container = new DIContainer(noopLogger);
    const broken = new InjectionToken<string>("Broken");
    const healthy = new InjectionToken<string>("Healthy");

    container.bindSingleton(broken, () => {
      throw new Error("kaboom");
    });
    container.bindInstance(healthy, "fine");

    expect(() => container.getInstance(broken)).toThrow("kaboom");
    expect(container.getInstance(healthy)).toBe("fine");
  });

  // ─── Falsy values as instances ─────────────────────────────

  it("should bind and resolve falsy instance: 0", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<number>("Zero");
    container.bindInstance(token, 0);
    expect(container.getInstance(token)).toBe(0);
  });

  it("should bind and resolve falsy instance: false", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<boolean>("False");
    container.bindInstance(token, false);
    expect(container.getInstance(token)).toBe(false);
  });

  it("should bind and resolve falsy instance: empty string", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<string>("Empty");
    container.bindInstance(token, "");
    expect(container.getInstance(token)).toBe("");
  });

  it("should bind and resolve null instance", () => {
    const container = new DIContainer(noopLogger);
    const token = new InjectionToken<null>("Null");
    container.bindInstance(token, null);
    expect(container.getInstance(token)).toBeNull();
  });

  // ─── Logger interaction ────────────────────────────────────

  it("should log errors on duplicate binding", () => {
    const logSpy = vi.fn();
    const spyLogger: ILogger = { log: logSpy, show: () => {} };
    const container = new DIContainer(spyLogger);
    const token = new InjectionToken<string>("Dup");

    container.bindInstance(token, "first");
    expect(() => container.bindInstance(token, "second")).toThrow();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("already bound"), expect.anything());
  });

  it("should log errors on missing binding", () => {
    const logSpy = vi.fn();
    const spyLogger: ILogger = { log: logSpy, show: () => {} };
    const container = new DIContainer(spyLogger);
    const token = new InjectionToken<string>("Ghost");

    expect(() => container.getInstance(token)).toThrow();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No binding found"), expect.anything());
  });

  it("should log errors on circular dependency", () => {
    const logSpy = vi.fn();
    const spyLogger: ILogger = { log: logSpy, show: () => {} };
    const container = new DIContainer(spyLogger);
    const token = new InjectionToken<string>("Circ");

    container.bindSingleton(token, (r) => r.getInstance(token));
    expect(() => container.getInstance(token)).toThrow();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Circular dependency"), expect.anything());
  });

  // ─── Binding after resolution ──────────────────────────────

  it("should allow binding new tokens after resolving existing ones", () => {
    const container = new DIContainer(noopLogger);
    const first = new InjectionToken<string>("First");
    const second = new InjectionToken<string>("Second");

    container.bindInstance(first, "1");
    expect(container.getInstance(first)).toBe("1");

    container.bindInstance(second, "2");
    expect(container.getInstance(second)).toBe("2");
  });
});
