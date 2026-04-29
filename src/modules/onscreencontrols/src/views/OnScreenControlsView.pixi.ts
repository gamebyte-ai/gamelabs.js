import type * as PIXI from "pixi.js";
import { HudViewBase } from "../../../../core/hud/HudViewBase.js";
import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import { StyleManager } from "../../../../core/styles/StyleManager.js";
import type { IOnScreenControlsView } from "./IOnScreenControlsView.js";
import { OscButton } from "./OscButton.pixi.js";
import { OscJoystick } from "./OscJoystick.pixi.js";
import { ControlType, OscStyleIds, resolveAnchorPosition } from "../OnScreenControlTypes.js";
import type {
  ControlConfig,
  OscButtonStyle,
  OscJoystickStyle,
  VirtualButtonConfig,
  VirtualJoystickConfig,
} from "../OnScreenControlTypes.js";

type ButtonEntry = {
  config: VirtualButtonConfig;
  button: OscButton;
};

type JoystickEntry = {
  config: VirtualJoystickConfig;
  joystick: OscJoystick;
};

/**
 * Pixi rendering layer for on-screen controls.
 *
 * Buttons are delegated to {@link OscButton}; joysticks to
 * {@link OscJoystick}. The view's job is now: resolving the merged
 * `osc.button` / `osc.joystick` styles, instantiating widgets,
 * positioning them per `ControlAnchor` + offsets on every layout
 * pass, wiring per-widget events back to its own listeners, and
 * forwarding manager flags.
 *
 * The view never reads or writes manager state directly — all wiring
 * goes through `OnScreenControlsViewController`. Apps add controls via
 * `OnScreenControlManager.addControl` and the view picks them up
 * through the `controlAdded` event.
 *
 * Texture loading is mandatory for every visible slot (no `Graphics`
 * fallback). The framework's default textures are loaded automatically
 * by `OnScreenControlsBinding`; missing textures throw with a clear
 * error message at widget construction.
 */
export class OnScreenControlsView extends HudViewBase implements IOnScreenControlsView {
  private _screenWidth = 0;
  private _screenHeight = 0;
  private _styleManager: StyleManager | null = null;

  private readonly _buttons: ButtonEntry[] = [];
  private readonly _joysticks: JoystickEntry[] = [];
  private readonly _buttonStateListeners = new Set<(id: string, isDown: boolean) => void>();
  private readonly _joystickDirListeners = new Set<(id: string, nx: number, ny: number) => void>();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._styleManager = resolver.getInstance(StyleManager);
  }

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
      this._buttons[btnIdx]!.button.destroy({ children: true });
      this._buttons.splice(btnIdx, 1);
      return;
    }

    const joyIdx = this._joysticks.findIndex((j) => j.config.id === id);
    if (joyIdx >= 0) {
      this._joysticks[joyIdx]!.joystick.destroy({ children: true });
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
    const button = new OscButton(this.assetLoader, this._resolveButtonStyle(config), config.size);

    const entry: ButtonEntry = { config, button };
    this._buttons.push(entry);

    button.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      if (!button.enabled) return;
      e.stopPropagation();
      button.setDown(true);
      for (const cb of this._buttonStateListeners) cb(config.id, true);
    });
    const releaseHandler = () => {
      if (!button.enabled) return;
      button.setDown(false);
      for (const cb of this._buttonStateListeners) cb(config.id, false);
    };
    button.on("pointerup", releaseHandler);
    button.on("pointerupoutside", releaseHandler);

    this.addChild(button);
    this._repositionAll();
  }

  public setButtonProgressVisible(id: string, visible: boolean): void {
    const entry = this._buttons.find((b) => b.config.id === id);
    if (!entry) return;
    if (visible) entry.button.showProgress();
    else entry.button.hideProgress();
  }

  public setButtonProgressValue(id: string, t: number): void {
    const entry = this._buttons.find((b) => b.config.id === id);
    if (!entry) return;
    entry.button.setProgress(t);
  }

  public setControlEnabled(id: string, enabled: boolean): void {
    const buttonEntry = this._buttons.find((b) => b.config.id === id);
    if (buttonEntry) {
      buttonEntry.button.setEnabled(enabled);
      return;
    }
    const joystickEntry = this._joysticks.find((j) => j.config.id === id);
    if (joystickEntry) {
      joystickEntry.joystick.setEnabled(enabled);
    }
  }

  public setControlVisible(id: string, visible: boolean): void {
    const buttonEntry = this._buttons.find((b) => b.config.id === id);
    if (buttonEntry) {
      buttonEntry.button.visible = visible;
      // An invisible button shouldn't carry a stale `down` visual when
      // it next becomes visible — reset to the up state on hide.
      if (!visible && buttonEntry.button.isDown) buttonEntry.button.setDown(false);
      return;
    }
    const joystickEntry = this._joysticks.find((j) => j.config.id === id);
    if (joystickEntry) {
      joystickEntry.joystick.visible = visible;
      if (!visible) joystickEntry.joystick.release();
    }
  }

  /**
   * Pulls the merged button style for `config` — `OscStyleIds.Button`
   * registered defaults deep-merged with any per-control overrides
   * (`config.up`, `.down`, `.disabled`, `.icon`, `.progress`).
   */
  private _resolveButtonStyle(config: VirtualButtonConfig): OscButtonStyle {
    if (!this._styleManager) throw new Error("OnScreenControlsView: not initialized");
    return this._styleManager.resolve<OscButtonStyle>(OscStyleIds.Button, {
      up: config.up,
      down: config.down,
      disabled: config.disabled,
      icon: config.icon,
      progress: config.progress,
    });
  }

  /**
   * Pulls the merged joystick style for `config` — `OscStyleIds.Joystick`
   * registered defaults deep-merged with any per-control overrides
   * (`config.base`, `.knob`).
   */
  private _resolveJoystickStyle(config: VirtualJoystickConfig): OscJoystickStyle {
    if (!this._styleManager) throw new Error("OnScreenControlsView: not initialized");
    return this._styleManager.resolve<OscJoystickStyle>(OscStyleIds.Joystick, {
      base: config.base,
      knob: config.knob,
    });
  }

  // ── JOYSTICKS ──

  private _createJoystick(config: VirtualJoystickConfig): void {
    const joystick = new OscJoystick(this.assetLoader, this._resolveJoystickStyle(config), {
      baseSize: config.baseSize,
      knobSize: config.knobSize,
      dynamic: config.dynamic,
    });

    const entry: JoystickEntry = { config, joystick };
    this._joysticks.push(entry);

    joystick.onDirectionChanged((nx, ny) => {
      for (const cb of this._joystickDirListeners) cb(config.id, nx, ny);
    });

    this.addChild(joystick);
    this._repositionAll();
  }

  // ── REPOSITIONING ──

  private _repositionAll(): void {
    const w = this._screenWidth;
    const h = this._screenHeight;
    if (w <= 0 || h <= 0) return;

    for (const b of this._buttons) {
      const pos = resolveAnchorPosition(b.config.anchor, b.config.offsetX, b.config.offsetY, w, h);
      b.button.position.set(pos.x - b.config.size / 2, pos.y - b.config.size / 2);
    }

    for (const j of this._joysticks) {
      const pos = resolveAnchorPosition(j.config.anchor, j.config.offsetX, j.config.offsetY, w, h);
      const baseR = j.config.baseSize;

      if (j.config.dynamic) {
        const areaW = j.config.dynamicAreaWidth ?? w / 2;
        const areaH = j.config.dynamicAreaHeight ?? h / 2;
        j.joystick.setDynamicArea(areaW, areaH);
        j.joystick.position.set(pos.x - areaW / 2, pos.y - areaH / 2);
      } else {
        j.joystick.position.set(pos.x - baseR, pos.y - baseR);
      }
    }
  }

  public override preDestroy(): void {
    for (const b of this._buttons) b.button.destroy({ children: true });
    for (const j of this._joysticks) j.joystick.destroy({ children: true });
    this._buttonStateListeners.clear();
    this._joystickDirListeners.clear();
    this._buttons.length = 0;
    this._joysticks.length = 0;
  }
}
