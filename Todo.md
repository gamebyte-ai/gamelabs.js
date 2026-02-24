# Todo (Roadmap)(This is subject to changes)

This repo is intentionally a **project skeleton + reusable modules** (not a full engine). The goal of this file is to keep future work explicit and prioritized, especially for AI-generated projects that will be reviewed by humans.

## P0 — Consistency & reviewability (AI-first)

- Define and document the **canonical project layout** (folders, naming, “where things go”).
- Add a small “project policy” doc (e.g. `AGENTS.md` or `CONTRIBUTING.md`) that states:
  - Views render; Controllers/Models own behavior/state.
  - Cross-feature communication goes through Events injected via DI.
  - Modules must not depend on app-specific globals.
  - New features should land as modules whenever reusable.
- Add formatting + linting that enforces consistency (predictable diffs, faster review).
- Add a module compatibility harness:
  - “smoke test app” that imports every module and verifies DI/view registration doesn’t collide
  - basic runtime checks in dev mode (duplicate bindings, missing registrations, etc.)

## P0 — Correctness & failure modes

- Asset loading should be **fail-fast and observable**:
  - track per-asset failures (not just counts)
  - expose a single awaitable “load all requested assets” primitive (instead of polling counters)
  - provide progress callbacks/events for loading screens
- Define lifecycle semantics:
  - what happens when `initialize()` is called twice
  - what happens when assets fail
  - what is safe/unsafe to do in `configureDI`, `configureViews`, `postInitialize`

## P1 — Screens/navigation semantics

- Make screen changes deterministic:
  - support awaiting `IScreen.onExit()` / `onEnter()` when they return promises
  - define cancellation rules when screens are replaced quickly
  - avoid destroying screens mid-transition without cleanup

## P1 — Resize/layout robustness

- Add `ResizeObserver` support so resizing works when the mount element changes size without a window resize.
- Clarify/standardize DPR behavior:
  - clamp DPR consistently (or make it configurable)
  - ensure canvas CSS sizing and drawing buffer sizing do not fight each other

## P1 — Type safety at wiring boundaries

- Reduce `any/unknown` at `IViewContainer` and `ViewFactory` attachment boundaries:
  - introduce typed parent/child contracts for common cases (Pixi containers, Three objects)
  - aim for “invalid parent types fail at compile time” for the normal path

## P2 — Module library hygiene

- Fix naming/typos that leak into the public API (e.g. module path naming); plan as a breaking change with a migration note.
- Add a lightweight versioning policy (what is breaking, what is additive).
- Add documentation per module:
  - what it provides (views/controllers/events/models/assets)
  - how it’s wired (`IModuleBinding`)
  - minimal usage snippet

## P2 — Developer experience

- Add a CLI/template to create a new game project with the canonical structure.
- Add CI:
  - `typecheck`
  - lint
  - build
  - example build smoke checks

