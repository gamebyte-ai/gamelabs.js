import type { Layout, LayoutOptions } from "@pixi/layout";
import type * as PIXI from "pixi.js";
import { Button } from "@pixi/ui";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ButtonComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / content options for a {@link ButtonComponent}. Visual
 * styling lives on the {@link ButtonComponentStyle} passed alongside
 * the asset manager and is owned by the framework's `StyleManager`.
 */
export type ButtonComponentOpts = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. Ignored when the parent layout controls sizing. */
  width?: number;
  /** Fixed height. Ignored when the parent layout controls sizing. */
  height?: number;
  /** Label text. Omit for an icon-only button. */
  label?: string;
};

type ButtonState = "idle" | "hover" | "pressed" | "disabled";

/**
 * Reusable Pixi button component, themed via the framework's style
 * system.
 *
 * Construction takes an `AssetManager`, a
 * {@link ButtonComponentStyle}, and geometry / label options. The
 * idiomatic call site looks like:
 *
 * ```ts
 * const style = this.styleManager.resolve<ButtonComponentStyle>(
 *   UIComponentsStyleIds.Button,
 *   // optional per-button override
 * );
 * const button = new ButtonComponent(this.assetLoader, style, {
 *   width: 120, height: 40, label: "Close",
 * });
 * ```
 *
 * Renders a single background sprite whose texture / tint / alpha are
 * swapped based on pointer state (idle / hover / pressed / disabled).
 * When the resolved idle-state style has `border > 0` the bg renders
 * via `PIXI.NineSliceSprite` so the four corners stay crisp at any
 * size; otherwise it's a plain `PIXI.Sprite`. The bg type is fixed at
 * construction (driven by the idle state) so all four states share the
 * same NineSliceSprite / Sprite instance.
 *
 * Pointer / keyboard interaction is delegated to `@pixi/ui` `Button`;
 * `onPress(cb)` returns an `Unsubscribe`. Disabling stops `onPress`
 * from firing and swaps to the `disabled` state.
 *
 * Per-button colour identity (e.g. tower-defence shop cards, "Next
 * Level" CTAs) flows through `Container.tint` on the component itself,
 * which propagates to the bg sprite — no per-state override required.
 */
export class ButtonComponent extends StyledHudObject<ButtonComponentStyle> {
  private readonly _bg: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _label: PIXI.Text | null;
  private readonly _button: Button;
  private readonly _stateStyles: Record<ButtonState, SpriteStyle | undefined>;

  private _state: ButtonState = "idle";
  private _enabled = true;
  private _pointerOver = false;

  private _layoutWidth = 1;
  private _layoutHeight = 1;

  public constructor(assetManager: AssetManager, style: ButtonComponentStyle, opts: ButtonComponentOpts = {}) {
    super(assetManager, style);

    // Cache the per-state slots from the supplied style. Partial-apply
    // semantics: any field a slot omits stays at the sprite's current
    // value (Pixi defaults at construction; preserved across state
    // swaps in `_applyState`). Apps that want fully-themed buttons
    // register a complete style entry via UIComponentsBinding.
    this._stateStyles = {
      idle: style.idle,
      hover: style.hover,
      pressed: style.pressed,
      disabled: style.disabled,
    };

    // Build the bg sprite from the idle slot — its `border` decides
    // whether we end up with a Sprite or NineSliceSprite. Slot dim 1
    // is a placeholder; the real width/height come from the layout
    // event below via `_applyState`. Helper centers the sprite at
    // (0.5, 0.5) — override to (0, 0) so it fills the layout box from
    // the top-left.
    this._bg = this._buildStyledSprite(this._stateStyles.idle, 1, 1);
    this._bg.anchor.set(0, 0);
    this._bg.position.set(0, 0);
    this.addChild(this._bg);

    // Label: built only when opts.label is supplied. The label slot
    // applies as a partial — apps register the desired font defaults
    // via UIComponentsBinding so the resolved label style is complete.
    if (opts.label !== undefined) {
      this._label = this._buildStyledText(opts.label, style.label);
      this._label.anchor.set(0.5, 0.5);
      this._label.layout = {};
      this.addChild(this._label);
    } else {
      this._label = null;
    }

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    const layout: Omit<LayoutOptions, "target"> = { justifyContent: "center", alignItems: "center" };
    if (opts.width !== undefined) layout.width = opts.width;
    if (opts.height !== undefined) layout.height = opts.height;
    this.layout = layout;

    this.on("layout", (l: Layout) => this.handleLayout(l));

    this._button = new Button(this);
    this._button.onDown.connect(() => this.onPointerDown());
    this._button.onUp.connect(() => this.onPointerUp());
    this._button.onUpOut.connect(() => this.onPointerUpOut());
    this._button.onHover.connect(() => this.onPointerHover());
    this._button.onOut.connect(() => this.onPointerOut());
  }

  /** Update the label text. No-op if the button was created without a label. */
  public setLabel(text: string): void {
    if (this._label) this._label.text = text;
  }

  /**
   * Enable or disable interaction. Disabling swaps to the `disabled`
   * texture and prevents `onPress` from firing; re-enabling resets to
   * `idle` (or `hover` if the pointer is currently over the button).
   */
  public setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    this._button.enabled = enabled;
    if (!enabled) {
      this._setState("disabled");
    } else {
      this._setState(this._pointerOver ? "hover" : "idle");
    }
  }

  /** Subscribe to press events. Returns an unsubscribe function. */
  public onPress(cb: () => void): Unsubscribe {
    const guarded = (): void => {
      if (this._enabled) cb();
    };
    this._button.onPress.connect(guarded);
    return () => this._button.onPress.disconnect(guarded);
  }

  // ── Internal: state machine ────────────────────────────────────────

  private onPointerDown(): void {
    if (!this._enabled) return;
    this._setState("pressed");
  }

  private onPointerUp(): void {
    if (!this._enabled) return;
    this._setState(this._pointerOver ? "hover" : "idle");
  }

  private onPointerUpOut(): void {
    if (!this._enabled) return;
    this._setState("idle");
  }

  private onPointerHover(): void {
    this._pointerOver = true;
    if (!this._enabled) return;
    if (this._state !== "pressed") this._setState("hover");
  }

  private onPointerOut(): void {
    this._pointerOver = false;
    if (!this._enabled) return;
    if (this._state !== "pressed") this._setState("idle");
  }

  private _setState(state: ButtonState): void {
    if (this._state === state) return;
    this._state = state;
    this._applyState();
  }

  private _applyState(): void {
    if (this._layoutWidth <= 0 || this._layoutHeight <= 0) return;
    this._applyPartialSpriteStyle(this._bg, this._stateStyles[this._state], this._layoutWidth, this._layoutHeight);
  }

  // ── Internal: layout ──────────────────────────────────────────────

  private handleLayout(l: Layout): void {
    const w = Math.max(1, Math.floor(l.computedLayout.width));
    const h = Math.max(1, Math.floor(l.computedLayout.height));
    this._layoutWidth = w;
    this._layoutHeight = h;
    this._applyState();
  }
}
