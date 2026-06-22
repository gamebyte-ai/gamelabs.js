import type { FederatedPointerEvent } from "pixi.js";
import { Container, Graphics } from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { OscJoystickStyle } from "../OnScreenControlTypes.js";

export type OscJoystickOptions = {
  baseSize: number;
  knobSize: number;
  /** When true, the joystick spawns at the touch point inside its dynamic area; when false, it stays anchored. */
  dynamic: boolean;
};

/**
 * Self-rendering on-screen joystick. Owns its base + knob sprites,
 * the optional dynamic touch area, and the pointer-driven knob state
 * machine. Emits normalized direction `[-1, 1]` events through
 * {@link onDirectionChanged}.
 *
 * Hosts (typically `OnScreenControlsView`) instantiate one per
 * virtual joystick, position it via `joystick.position.set(...)`, and
 * — for dynamic joysticks — drive the touch area dimensions through
 * {@link setDynamicArea} on every layout pass.
 *
 * Sprite textures are looked up against the `AssetManager` passed to
 * the constructor. Missing textures throw during construction, so
 * register asset requests for every referenced id at app boot.
 */
export class OscJoystick extends StyledHudObject<OscJoystickStyle> {
  private readonly _baseSize: number;
  private readonly _knobSize: number;
  private readonly _dynamic: boolean;

  private readonly _base: Container;
  private readonly _knob: Container;
  private readonly _dynamicArea: Graphics | null;
  private readonly _hitTarget: Container;

  private _activePointerId: number | null = null;
  private _originX = 0;
  private _originY = 0;
  private _enabled = true;

  private readonly _dirListeners = new Set<(nx: number, ny: number) => void>();

  public constructor(assetManager: AssetManager, style: OscJoystickStyle, options: OscJoystickOptions) {
    super(assetManager, style);
    this._baseSize = options.baseSize;
    this._knobSize = options.knobSize;
    this._dynamic = options.dynamic;

    if (this._dynamic) {
      this._dynamicArea = new Graphics();
      this._dynamicArea.eventMode = "static";
      this.addChild(this._dynamicArea);
    } else {
      this._dynamicArea = null;
    }

    this._base = this._buildBase();
    this.addChild(this._base);

    this._knob = this._buildKnob();
    this._knob.eventMode = "none";
    this._knob.position.set(this._baseSize, this._baseSize);
    this.addChild(this._knob);

    if (!this._dynamic) {
      this._base.eventMode = "static";
      // Static: origin is the local base centre; doesn't change with anchor.
      this._originX = this._baseSize;
      this._originY = this._baseSize;
    }

    this._hitTarget = this._dynamic ? this._dynamicArea! : this._base;

    if (this._dynamic) {
      this._base.visible = false;
      this._knob.visible = false;
    }

    this._hitTarget.on("pointerdown", (e: FederatedPointerEvent) => this._onDown(e));
    this._hitTarget.on("globalpointermove", (e: FederatedPointerEvent) => this._onMove(e));
    this._hitTarget.on("pointerup", (e: FederatedPointerEvent) => this._onUp(e));
    this._hitTarget.on("pointerupoutside", (e: FederatedPointerEvent) => this._onUp(e));
  }

  /**
   * Dynamic joysticks only: redraws the invisible touch rect at
   * `width × height` (in local coords) and re-centres the origin. The
   * host calls this on every layout pass — the rect adapts to screen
   * size when the host derives dimensions from screen halves.
   *
   * No-op for static joysticks.
   */
  public setDynamicArea(width: number, height: number): void {
    if (!this._dynamic || !this._dynamicArea) return;
    this._dynamicArea.clear();
    this._dynamicArea.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.001 });
    this._originX = width / 2;
    this._originY = height / 2;
  }

  /**
   * Cancels any in-flight press, resets the knob to centre, and (for
   * dynamic joysticks) hides the base + knob. Does not emit a `(0, 0)`
   * direction — callers needing flushed downstream state drive that
   * separately (e.g. `OnScreenControlManager.resetJoystick`).
   */
  public release(): void {
    this._activePointerId = null;
    this._knob.position.set(this._originX, this._originY);
    if (this._dynamic) {
      this._base.visible = false;
      this._knob.visible = false;
    }
  }

  /**
   * Toggles the joystick's interactive + visual disabled state. While
   * disabled the base + knob render at half their alpha and pointer
   * drag is ignored. Disabling cancels any in-flight press.
   */
  public setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    // Dim the wrapping containers — multiplies on top of the per-slot
    // alpha set on the underlying sprite.
    this._base.alpha = enabled ? 1 : 0.5;
    this._knob.alpha = enabled ? 1 : 0.5;
    this._hitTarget.eventMode = enabled ? "static" : "auto";
    if (!enabled) this.release();
  }

  public onDirectionChanged(cb: (nx: number, ny: number) => void): Unsubscribe {
    this._dirListeners.add(cb);
    return () => this._dirListeners.delete(cb);
  }

  // ── INTERNAL ──

  private _buildBase(): Container {
    const wrap = new Container();
    const sprite = this._buildStyledSprite(this._style.base, this._baseSize * 2);
    sprite.position.set(this._baseSize, this._baseSize);
    wrap.addChild(sprite);
    return wrap;
  }

  private _buildKnob(): Container {
    const wrap = new Container();
    const sprite = this._buildStyledSprite(this._style.knob, this._knobSize * 2);
    wrap.addChild(sprite);
    return wrap;
  }

  private _onDown(e: FederatedPointerEvent): void {
    e.stopPropagation();
    this._activePointerId = e.pointerId;

    if (this._dynamic) {
      // Dynamic: spawn the joystick centered on the touch — direction
      // stays (0, 0) until the user drags.
      const local = this.toLocal(e.global);
      this._originX = local.x;
      this._originY = local.y;
      this._base.position.set(local.x - this._baseSize, local.y - this._baseSize);
      this._knob.position.set(local.x, local.y);
      this._base.visible = true;
      this._knob.visible = true;
    } else {
      // Static: origin was set to the local base centre at construction
      // (the base never moves for static joysticks). Register the press
      // as a direction input immediately so it doesn't wait for the
      // first pointermove.
      this._applyPointer(e);
    }
  }

  private _onMove(e: FederatedPointerEvent): void {
    if (this._activePointerId !== e.pointerId) return;
    this._applyPointer(e);
  }

  /** Reads the pointer's local position, clamps it to the base radius, repositions the knob, and emits the direction. */
  private _applyPointer(e: FederatedPointerEvent): void {
    const local = this.toLocal(e.global);
    const dx = local.x - this._originX;
    const dy = local.y - this._originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this._baseSize;

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxDist) {
      clampedX = (dx / dist) * maxDist;
      clampedY = (dy / dist) * maxDist;
    }

    this._knob.position.set(this._originX + clampedX, this._originY + clampedY);

    const nx = clampedX / maxDist;
    const ny = clampedY / maxDist;
    for (const cb of this._dirListeners) cb(nx, ny);
  }

  private _onUp(e: FederatedPointerEvent): void {
    if (this._activePointerId !== e.pointerId) return;
    this._activePointerId = null;
    this._knob.position.set(this._originX, this._originY);
    for (const cb of this._dirListeners) cb(0, 0);
    if (this._dynamic) {
      this._base.visible = false;
      this._knob.visible = false;
    }
  }
}
