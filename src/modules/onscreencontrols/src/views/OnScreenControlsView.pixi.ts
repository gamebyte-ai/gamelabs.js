import * as PIXI from "pixi.js";
import { HudViewBase } from "../../../../core/hud/HudViewBase.js";
import type { IOnScreenControlsView } from "./IOnScreenControlsView.js";
import { ControlType, resolveAnchorPosition } from "../OnScreenControlTypes.js";
import type { ControlConfig, OscVisual, VirtualButtonConfig, VirtualJoystickConfig } from "../OnScreenControlTypes.js";
import { OnScreenControlsAssetIds } from "../OnScreenControlsAssetIds.js";

type ResolvedVisual = {
  textureId: string;
  color: number;
  alpha: number;
  scale: number;
};

type ButtonProgressRefs = {
  sprite: PIXI.Sprite;
  mask: PIXI.Graphics;
  visual: ResolvedVisual;
  /** Last drawn t value, so we skip redraw when nothing changed. */
  lastT: number;
};

type ButtonRefs = {
  config: VirtualButtonConfig;
  container: PIXI.Container;
  bg: PIXI.Sprite;
  icon: PIXI.Sprite | null;
  /** Resolved icon visual; alpha is multiplied by 0.5 when disabled. */
  iconVisual: ResolvedVisual | null;
  /** Progress ring is built lazily on first `showButtonProgress`. */
  progress: ButtonProgressRefs | null;
  /** Pending progress value applied when the ring is built. */
  pendingProgress: number;
  enabled: boolean;
  isDown: boolean;
};

type JoystickRefs = {
  config: VirtualJoystickConfig;
  container: PIXI.Container;
  /** Wraps the textured sprite for the joystick base. */
  base: PIXI.Container;
  /** Wraps the textured sprite for the joystick knob. */
  knob: PIXI.Container;
  /** Pointer events are bound to this child — `dynamicArea` for dynamic joysticks, `base` for static. */
  hitTarget: PIXI.Container;
  dynamicArea: PIXI.Graphics | null;
  activePointerId: number | null;
  originX: number;
  originY: number;
  enabled: boolean;
};

const BUTTON_STATE_DEFAULTS = {
  up: { color: 0x222222, alpha: 0.5 },
  down: { color: 0x444444, alpha: 0.8 },
  disabled: { color: 0x4a5a4a, alpha: 0.55 },
} as const;

/**
 * Pixi rendering layer for on-screen controls.
 *
 * Adds buttons + joysticks as Pixi sprites under this `HudViewBase`.
 * Hit testing uses Pixi's pointer events on the per-control containers
 * (buttons) and on a dedicated `dynamicArea` for dynamic joysticks.
 *
 * The view never reads or writes manager state directly — all wiring
 * goes through `OnScreenControlsViewController`. Apps add controls via
 * `OnScreenControlManager.addControl` and the view picks them up
 * through the `controlAdded` event.
 *
 * Texture loading is mandatory for every visible slot (no `Graphics`
 * fallback). The framework's default textures are loaded automatically
 * by `OnScreenControlsBinding`; missing textures throw with a clear
 * error message at sprite-build time.
 */
export class OnScreenControlsView extends HudViewBase implements IOnScreenControlsView {
  private _screenWidth = 0;
  private _screenHeight = 0;

  private readonly _buttons: ButtonRefs[] = [];
  private readonly _joysticks: JoystickRefs[] = [];
  private readonly _buttonStateListeners = new Set<(id: string, isDown: boolean) => void>();
  private readonly _joystickDirListeners = new Set<(id: string, nx: number, ny: number) => void>();

  public override postInitialize(): void {
    super.postInitialize();
    this.eventMode = "auto";
    this.interactiveChildren = true;
  }

  /** Repositions every control against the new screen size. Call from your screen view's `onResize`. */
  public resize(width: number, height: number): void {
    this._screenWidth = width;
    this._screenHeight = height;
    this._repositionAll();
  }

  /** Builds the Pixi tree for a control. Called by the controller; apps don't call this directly. */
  public createControl(config: ControlConfig): void {
    if (config.type === ControlType.Button) this._createButton(config as VirtualButtonConfig);
    else if (config.type === ControlType.Joystick) this._createJoystick(config as VirtualJoystickConfig);
  }

  /** Tears down the Pixi tree for the given control id. No-op for unknown ids. */
  public removeControl(id: string): void {
    const btnIdx = this._buttons.findIndex((b) => b.config.id === id);
    if (btnIdx >= 0) {
      this._buttons[btnIdx]!.container.destroy({ children: true });
      this._buttons.splice(btnIdx, 1);
      return;
    }

    const joyIdx = this._joysticks.findIndex((j) => j.config.id === id);
    if (joyIdx >= 0) {
      this._joysticks[joyIdx]!.container.destroy({ children: true });
      this._joysticks.splice(joyIdx, 1);
    }
  }

  public onButtonStateChanged(cb: (id: string, isDown: boolean) => void): () => void {
    this._buttonStateListeners.add(cb);
    return () => this._buttonStateListeners.delete(cb);
  }

  public onJoystickDirectionChanged(cb: (id: string, nx: number, ny: number) => void): () => void {
    this._joystickDirListeners.add(cb);
    return () => this._joystickDirListeners.delete(cb);
  }

  // ── BUTTONS ──

  private _createButton(config: VirtualButtonConfig): void {
    const container = new PIXI.Container();
    container.eventMode = "static";
    container.cursor = "pointer";

    const upVisual = this._resolveButtonVisual(config, "up");
    const bg = this._buildSprite(upVisual, config.size);
    bg.position.set(config.size / 2, config.size / 2);
    container.addChild(bg);

    const iconVisual = this._resolveButtonIcon(config);
    let icon: PIXI.Sprite | null = null;
    if (iconVisual) {
      icon = this._buildSprite(iconVisual, config.size);
      icon.position.set(config.size / 2, config.size / 2);
      container.addChild(icon);
    }

    const refs: ButtonRefs = {
      config,
      container,
      bg,
      icon,
      iconVisual,
      progress: null,
      pendingProgress: 0,
      enabled: true,
      isDown: false,
    };
    this._buttons.push(refs);

    container.on("pointerdown", (e: PIXI.FederatedPointerEvent) => this._onButtonDown(refs, e));
    container.on("pointerup", () => this._onButtonUp(refs));
    container.on("pointerupoutside", () => this._onButtonUp(refs));

    this.addChild(container);
    this._repositionAll();
  }

  public setButtonProgressVisible(id: string, visible: boolean): void {
    const refs = this._buttons.find((b) => b.config.id === id);
    if (!refs) return;
    if (visible) {
      const progress = this._ensureButtonProgress(refs);
      progress.sprite.visible = true;
      progress.mask.visible = true;
      this._drawProgressMask(refs, refs.pendingProgress);
    } else if (refs.progress) {
      refs.progress.sprite.visible = false;
      refs.progress.mask.visible = false;
    }
  }

  public setButtonProgressValue(id: string, t: number): void {
    const refs = this._buttons.find((b) => b.config.id === id);
    if (!refs) return;
    refs.pendingProgress = t;
    if (refs.progress) this._drawProgressMask(refs, t);
  }

  /**
   * Lazy-builds the progress sprite + Graphics mask the first time the
   * ring is shown for this button. Subsequent show/hide cycles reuse
   * the same sprite, so updates are just visibility + mask redraws.
   */
  private _ensureButtonProgress(refs: ButtonRefs): ButtonProgressRefs {
    if (refs.progress) return refs.progress;
    const visual = this._resolveButtonProgress(refs.config);
    const sprite = this._buildSprite(visual, refs.config.size);
    sprite.position.set(refs.config.size / 2, refs.config.size / 2);
    sprite.visible = false;

    const mask = new PIXI.Graphics();
    mask.visible = false;
    sprite.mask = mask;

    // Insert behind the bg so the ring's outer halo isn't clipped by
    // the bg sprite's edges.
    refs.container.addChildAt(sprite, 0);
    refs.container.addChildAt(mask, 0);

    const progress: ButtonProgressRefs = { sprite, mask, visual, lastT: -1 };
    refs.progress = progress;
    return progress;
  }

  private _drawProgressMask(refs: ButtonRefs, t: number): void {
    const progress = refs.progress;
    if (!progress) return;
    const clamped = Math.max(0, Math.min(1, t));
    if (progress.lastT === clamped) return;
    progress.lastT = clamped;

    const cx = refs.config.size / 2;
    const cy = refs.config.size / 2;
    // Mask radius covers the full sprite (size * scale / 2) plus a small
    // margin so the masked area extends past the visible ring.
    const radius = (refs.config.size * progress.visual.scale) / 2 + 1;
    progress.mask.clear();
    if (clamped <= 0) return;
    if (clamped >= 1) {
      progress.mask.circle(cx, cy, radius).fill({ color: 0xffffff });
      return;
    }
    const start = -Math.PI / 2;
    const end = start + clamped * Math.PI * 2;
    progress.mask.moveTo(cx, cy);
    progress.mask.arc(cx, cy, radius, start, end);
    progress.mask.lineTo(cx, cy);
    progress.mask.fill({ color: 0xffffff });
  }

  public setControlEnabled(id: string, enabled: boolean): void {
    const button = this._buttons.find((b) => b.config.id === id);
    if (button) {
      this._setButtonEnabled(button, enabled);
      return;
    }
    const joystick = this._joysticks.find((j) => j.config.id === id);
    if (joystick) {
      this._setJoystickEnabled(joystick, enabled);
    }
  }

  public setControlVisible(id: string, visible: boolean): void {
    const button = this._buttons.find((b) => b.config.id === id);
    if (button) {
      button.container.visible = visible;
      // An invisible button shouldn't carry a stale `down` visual when
      // it next becomes visible — reset to the up state on hide.
      if (!visible && button.isDown) {
        button.isDown = false;
        this._applyButtonBgVisual(button);
      }
      return;
    }
    const joystick = this._joysticks.find((j) => j.config.id === id);
    if (joystick) {
      joystick.container.visible = visible;
      if (!visible && joystick.activePointerId !== null) {
        joystick.activePointerId = null;
        joystick.knob.position.set(joystick.originX, joystick.originY);
      }
    }
  }

  private _setButtonEnabled(refs: ButtonRefs, enabled: boolean): void {
    if (refs.enabled === enabled) return;
    refs.enabled = enabled;
    if (!enabled && refs.isDown) refs.isDown = false;
    refs.container.cursor = enabled ? "pointer" : "default";
    refs.container.eventMode = enabled ? "static" : "auto";
    if (refs.icon && refs.iconVisual) refs.icon.alpha = refs.iconVisual.alpha * (enabled ? 1 : 0.5);
    this._applyButtonBgVisual(refs);
  }

  private _setJoystickEnabled(refs: JoystickRefs, enabled: boolean): void {
    if (refs.enabled === enabled) return;
    refs.enabled = enabled;
    // Dim the wrapping containers — multiplies on top of the per-slot
    // alpha set on the underlying sprite, so a base configured at 0.85
    // alpha reads as ~0.42 while disabled.
    refs.base.alpha = enabled ? 1 : 0.5;
    refs.knob.alpha = enabled ? 1 : 0.5;
    refs.hitTarget.eventMode = enabled ? "static" : "auto";
    if (!enabled) {
      refs.activePointerId = null;
      refs.knob.position.set(refs.originX, refs.originY);
    }
  }

  /** Pushes the bg's tint/alpha/scale to match the current state. */
  private _applyButtonBgVisual(refs: ButtonRefs): void {
    const state: "up" | "down" | "disabled" = !refs.enabled ? "disabled" : refs.isDown ? "down" : "up";
    const visual = this._resolveButtonVisual(refs.config, state);
    this._applyVisual(refs.bg, visual, refs.config.size);
  }

  private _onButtonDown(refs: ButtonRefs, e: PIXI.FederatedPointerEvent): void {
    if (!refs.enabled) return;
    e.stopPropagation();
    refs.isDown = true;
    this._applyButtonBgVisual(refs);
    for (const cb of this._buttonStateListeners) cb(refs.config.id, true);
  }

  private _onButtonUp(refs: ButtonRefs): void {
    if (!refs.enabled) return;
    refs.isDown = false;
    this._applyButtonBgVisual(refs);
    for (const cb of this._buttonStateListeners) cb(refs.config.id, false);
  }

  // ── JOYSTICKS ──

  private _createJoystick(config: VirtualJoystickConfig): void {
    const container = new PIXI.Container();

    let dynamicArea: PIXI.Graphics | null = null;
    if (config.dynamic) {
      dynamicArea = new PIXI.Graphics();
      dynamicArea.eventMode = "static";
      container.addChild(dynamicArea);
    }

    const base = this._buildJoystickBase(config);
    container.addChild(base);

    const knob = this._buildJoystickKnob(config);
    knob.eventMode = "none";
    knob.position.set(config.baseSize, config.baseSize);
    container.addChild(knob);

    if (!config.dynamic) {
      base.eventMode = "static";
    }

    const hitTarget: PIXI.Container = config.dynamic ? dynamicArea! : base;

    const refs: JoystickRefs = {
      config,
      container,
      base,
      knob,
      hitTarget,
      dynamicArea,
      activePointerId: null,
      originX: 0,
      originY: 0,
      enabled: true,
    };
    this._joysticks.push(refs);

    hitTarget.on("pointerdown", (e: PIXI.FederatedPointerEvent) => this._onJoystickDown(refs, e));
    hitTarget.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => this._onJoystickMove(refs, e));
    hitTarget.on("pointerup", (e: PIXI.FederatedPointerEvent) => this._onJoystickUp(refs, e));
    hitTarget.on("pointerupoutside", (e: PIXI.FederatedPointerEvent) => this._onJoystickUp(refs, e));

    if (config.dynamic) {
      base.visible = false;
      knob.visible = false;
    }

    this.addChild(container);
    this._repositionAll();
  }

  private _buildJoystickBase(config: VirtualJoystickConfig): PIXI.Container {
    const wrap = new PIXI.Container();
    const visual = this._resolveJoystickBase(config);
    const sprite = this._buildSprite(visual, config.baseSize * 2);
    sprite.position.set(config.baseSize, config.baseSize);
    wrap.addChild(sprite);
    return wrap;
  }

  private _buildJoystickKnob(config: VirtualJoystickConfig): PIXI.Container {
    const wrap = new PIXI.Container();
    const visual = this._resolveJoystickKnob(config);
    const sprite = this._buildSprite(visual, config.knobSize * 2);
    wrap.addChild(sprite);
    return wrap;
  }

  // ── VISUAL RESOLUTION ──

  private _resolveButtonVisual(config: VirtualButtonConfig, state: "up" | "down" | "disabled"): ResolvedVisual {
    const v = config[state];
    const stateDefaults = BUTTON_STATE_DEFAULTS[state];
    return {
      textureId: v?.textureId ?? OnScreenControlsAssetIds.ButtonBg,
      color: v?.color ?? stateDefaults.color,
      alpha: v?.alpha ?? stateDefaults.alpha,
      scale: v?.scale ?? 1,
    };
  }

  private _resolveButtonProgress(config: VirtualButtonConfig): ResolvedVisual {
    const v = config.progress;
    return {
      textureId: v?.textureId ?? OnScreenControlsAssetIds.ButtonProgress,
      color: v?.color ?? 0xffffff,
      alpha: v?.alpha ?? 0.85,
      // 1.1 default puts the ring just outside the bg circle.
      scale: v?.scale ?? 1.1,
    };
  }

  private _resolveButtonIcon(config: VirtualButtonConfig): ResolvedVisual | null {
    const v = config.icon;
    if (!v?.textureId) return null;
    return {
      textureId: v.textureId,
      color: v.color ?? 0xffffff,
      alpha: v.alpha ?? 1,
      scale: v.scale ?? 0.6,
    };
  }

  private _resolveJoystickBase(config: VirtualJoystickConfig): ResolvedVisual {
    return this._resolveJoystickVisual(config.base, OnScreenControlsAssetIds.JoystickBase, 0.85);
  }

  private _resolveJoystickKnob(config: VirtualJoystickConfig): ResolvedVisual {
    return this._resolveJoystickVisual(config.knob, OnScreenControlsAssetIds.JoystickHandle, 0.95);
  }

  private _resolveJoystickVisual(v: OscVisual | undefined, defaultTextureId: string, defaultAlpha: number): ResolvedVisual {
    return {
      textureId: v?.textureId ?? defaultTextureId,
      color: v?.color ?? 0xffffff,
      alpha: v?.alpha ?? defaultAlpha,
      scale: v?.scale ?? 1,
    };
  }

  /**
   * Builds a square sprite anchored at center, sized to `slotSize *
   * scale`, tinted and dimmed per the visual. Throws if the texture
   * isn't loaded — register an asset request for the id at app boot
   * (the framework's defaults are loaded automatically by
   * `OnScreenControlsBinding`).
   */
  private _buildSprite(visual: ResolvedVisual, slotSize: number): PIXI.Sprite {
    const texture = this.assetLoader.getAsset<PIXI.Texture>(visual.textureId);
    if (!texture) {
      throw new Error(
        `OnScreenControlsView: texture '${visual.textureId}' not loaded — register an asset request for this id before the app boots`,
      );
    }
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    this._applyVisual(sprite, visual, slotSize);
    return sprite;
  }

  /** Updates an existing sprite to a new visual (texture swap if changed, plus tint/alpha/scale). */
  private _applyVisual(sprite: PIXI.Sprite, visual: ResolvedVisual, slotSize: number): void {
    const texture = this.assetLoader.getAsset<PIXI.Texture>(visual.textureId);
    if (texture && sprite.texture !== texture) sprite.texture = texture;
    sprite.tint = visual.color;
    sprite.alpha = visual.alpha;
    const dim = slotSize * visual.scale;
    sprite.width = dim;
    sprite.height = dim;
  }

  private _onJoystickDown(refs: JoystickRefs, e: PIXI.FederatedPointerEvent): void {
    e.stopPropagation();
    refs.activePointerId = e.pointerId;
    const config = refs.config;

    if (config.dynamic) {
      // Dynamic: spawn the joystick centered on the touch — direction
      // stays (0, 0) until the user drags.
      const local = refs.container.toLocal(e.global);
      refs.originX = local.x;
      refs.originY = local.y;
      refs.base.position.set(local.x - config.baseSize, local.y - config.baseSize);
      refs.knob.position.set(local.x, local.y);
      refs.base.visible = true;
      refs.knob.visible = true;
    } else {
      // Static: origin is the fixed base centre. Immediately snap the
      // knob to the touch point so the press registers as a direction
      // input on its own (no need to wait for the first pointermove).
      refs.originX = refs.base.x + config.baseSize;
      refs.originY = refs.base.y + config.baseSize;
      this._applyJoystickPointer(refs, e);
    }
  }

  private _onJoystickMove(refs: JoystickRefs, e: PIXI.FederatedPointerEvent): void {
    if (refs.activePointerId !== e.pointerId) return;
    this._applyJoystickPointer(refs, e);
  }

  /** Reads the pointer's local position, clamps it to the base radius, repositions the knob, and emits the direction. */
  private _applyJoystickPointer(refs: JoystickRefs, e: PIXI.FederatedPointerEvent): void {
    const config = refs.config;
    const local = refs.container.toLocal(e.global);
    const dx = local.x - refs.originX;
    const dy = local.y - refs.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = config.baseSize;

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxDist) {
      clampedX = (dx / dist) * maxDist;
      clampedY = (dy / dist) * maxDist;
    }

    refs.knob.position.set(refs.originX + clampedX, refs.originY + clampedY);

    const nx = clampedX / maxDist;
    const ny = clampedY / maxDist;
    for (const cb of this._joystickDirListeners) cb(config.id, nx, ny);
  }

  private _onJoystickUp(refs: JoystickRefs, e: PIXI.FederatedPointerEvent): void {
    if (refs.activePointerId !== e.pointerId) return;
    refs.activePointerId = null;
    refs.knob.position.set(refs.originX, refs.originY);
    for (const cb of this._joystickDirListeners) cb(refs.config.id, 0, 0);
    if (refs.config.dynamic) {
      refs.base.visible = false;
      refs.knob.visible = false;
    }
  }

  // ── REPOSITIONING ──

  private _repositionAll(): void {
    const w = this._screenWidth;
    const h = this._screenHeight;
    if (w <= 0 || h <= 0) return;

    for (const b of this._buttons) {
      const pos = resolveAnchorPosition(b.config.anchor, b.config.offsetX, b.config.offsetY, w, h);
      b.container.position.set(pos.x - b.config.size / 2, pos.y - b.config.size / 2);
    }

    for (const j of this._joysticks) {
      const pos = resolveAnchorPosition(j.config.anchor, j.config.offsetX, j.config.offsetY, w, h);
      const baseR = j.config.baseSize;

      if (j.config.dynamic && j.dynamicArea) {
        const areaW = j.config.dynamicAreaWidth ?? w / 2;
        const areaH = j.config.dynamicAreaHeight ?? h / 2;
        j.dynamicArea.clear();
        j.dynamicArea.rect(0, 0, areaW, areaH).fill({ color: 0x000000, alpha: 0.001 });
        j.container.position.set(pos.x - areaW / 2, pos.y - areaH / 2);
        j.originX = areaW / 2;
        j.originY = areaH / 2;
      } else {
        j.container.position.set(pos.x - baseR, pos.y - baseR);
        j.originX = baseR;
        j.originY = baseR;
        j.knob.position.set(j.originX, j.originY);
      }
    }
  }

  public override preDestroy(): void {
    for (const b of this._buttons) b.container.destroy({ children: true });
    for (const j of this._joysticks) j.container.destroy({ children: true });
    this._buttonStateListeners.clear();
    this._joystickDirListeners.clear();
    this._buttons.length = 0;
    this._joysticks.length = 0;
  }
}
