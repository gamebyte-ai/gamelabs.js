import * as PIXI from "pixi.js";
import { HudViewBase } from "../../../../core/hud/HudViewBase.js";
import type { IOnScreenControlsView } from "./IOnScreenControlsView.js";
import { ControlType, resolveAnchorPosition } from "../OnScreenControlTypes.js";
import type { ControlConfig, VirtualButtonConfig, VirtualJoystickConfig } from "../OnScreenControlTypes.js";

type ButtonRefs = {
  config: VirtualButtonConfig;
  container: PIXI.Container;
  bg: PIXI.Graphics;
  icon: PIXI.Sprite | null;
};

type JoystickRefs = {
  config: VirtualJoystickConfig;
  container: PIXI.Container;
  base: PIXI.Graphics;
  knob: PIXI.Graphics;
  dynamicArea: PIXI.Graphics | null;
  activePointerId: number | null;
  originX: number;
  originY: number;
};

export class OnScreenControlsView extends HudViewBase implements IOnScreenControlsView {
  private _screenWidth = 0;
  private _screenHeight = 0;

  private readonly _buttons: ButtonRefs[] = [];
  private readonly _joysticks: JoystickRefs[] = [];
  private readonly _buttonStateListeners = new Set<(id: string, isDown: boolean) => void>();
  private readonly _joystickDirListeners = new Set<(id: string, nx: number, ny: number) => void>();

  public override postInitialize(): void {
    (this as any).eventMode = "auto";
    this.interactiveChildren = true;
  }

  public resize(width: number, height: number): void {
    this._screenWidth = width;
    this._screenHeight = height;
    this._repositionAll();
  }

  public createControl(config: ControlConfig): void {
    if (config.type === ControlType.Button) this._createButton(config as VirtualButtonConfig);
    else if (config.type === ControlType.Joystick) this._createJoystick(config as VirtualJoystickConfig);
  }

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
    (container as any).cursor = "pointer";

    const bg = new PIXI.Graphics();
    this._drawButtonBg(bg, config, false);
    container.addChild(bg);

    let icon: PIXI.Sprite | null = null;
    if (config.iconTextureId) {
      const texture = this.assetLoader.getAsset<PIXI.Texture>(config.iconTextureId);
      if (texture) {
        icon = new PIXI.Sprite(texture);
        icon.anchor.set(0.5, 0.5);
        icon.width = config.size * 0.6;
        icon.height = config.size * 0.6;
        icon.position.set(config.size / 2, config.size / 2);
        container.addChild(icon);
      }
    }

    this._buttons.push({ config, container, bg, icon });

    container.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      this._drawButtonBg(bg, config, true);
      for (const cb of this._buttonStateListeners) cb(config.id, true);
    });
    container.on("pointerup", () => {
      this._drawButtonBg(bg, config, false);
      for (const cb of this._buttonStateListeners) cb(config.id, false);
    });
    container.on("pointerupoutside", () => {
      this._drawButtonBg(bg, config, false);
      for (const cb of this._buttonStateListeners) cb(config.id, false);
    });

    this.addChild(container);
    this._repositionAll();
  }

  private _drawButtonBg(bg: PIXI.Graphics, config: VirtualButtonConfig, isDown: boolean): void {
    const s = config.size;
    const color = isDown ? (config.downColor ?? 0x444444) : (config.upColor ?? 0x222222);
    const alpha = isDown ? (config.downAlpha ?? 0.8) : (config.upAlpha ?? 0.5);
    bg.clear();
    bg.circle(s / 2, s / 2, s / 2).fill({ color, alpha });
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

    const base = new PIXI.Graphics();
    this._drawJoystickBase(base, config);
    container.addChild(base);

    const knob = new PIXI.Graphics();
    knob.eventMode = "none";
    this._drawJoystickKnob(knob, config);
    knob.position.set(config.baseSize, config.baseSize);
    container.addChild(knob);

    if (!config.dynamic) {
      base.eventMode = "static";
    }

    const refs: JoystickRefs = {
      config,
      container,
      base,
      knob,
      dynamicArea,
      activePointerId: null,
      originX: 0,
      originY: 0,
    };
    this._joysticks.push(refs);

    const hitTarget = config.dynamic ? dynamicArea! : base;

    hitTarget.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation();
      refs.activePointerId = e.pointerId;

      if (config.dynamic) {
        const local = container.toLocal(e.global);
        refs.originX = local.x;
        refs.originY = local.y;
        base.position.set(local.x - config.baseSize, local.y - config.baseSize);
        knob.position.set(local.x, local.y);
        base.visible = true;
        knob.visible = true;
      } else {
        refs.originX = base.x + config.baseSize;
        refs.originY = base.y + config.baseSize;
      }
    });

    hitTarget.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => {
      if (refs.activePointerId !== e.pointerId) return;
      const local = container.toLocal(e.global);
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

      knob.position.set(refs.originX + clampedX, refs.originY + clampedY);

      const nx = clampedX / maxDist;
      const ny = clampedY / maxDist;
      for (const cb of this._joystickDirListeners) cb(config.id, nx, ny);
    });

    hitTarget.on("pointerup", (e: PIXI.FederatedPointerEvent) => {
      if (refs.activePointerId !== e.pointerId) return;
      refs.activePointerId = null;
      knob.position.set(refs.originX, refs.originY);
      for (const cb of this._joystickDirListeners) cb(config.id, 0, 0);
      if (config.dynamic) {
        base.visible = false;
        knob.visible = false;
      }
    });

    hitTarget.on("pointerupoutside", (e: PIXI.FederatedPointerEvent) => {
      if (refs.activePointerId !== e.pointerId) return;
      refs.activePointerId = null;
      knob.position.set(refs.originX, refs.originY);
      for (const cb of this._joystickDirListeners) cb(config.id, 0, 0);
      if (config.dynamic) {
        base.visible = false;
        knob.visible = false;
      }
    });

    if (config.dynamic) {
      base.visible = false;
      knob.visible = false;
    }

    this.addChild(container);
    this._repositionAll();
  }

  private _drawJoystickBase(bg: PIXI.Graphics, config: VirtualJoystickConfig): void {
    const r = config.baseSize;
    const color = config.baseColor ?? 0x222222;
    const alpha = config.baseAlpha ?? 0.35;
    bg.circle(r, r, r).fill({ color, alpha });
  }

  private _drawJoystickKnob(knob: PIXI.Graphics, config: VirtualJoystickConfig): void {
    const r = config.knobSize;
    const color = config.knobColor ?? 0x888888;
    const alpha = config.knobAlpha ?? 0.6;
    knob.circle(0, 0, r).fill({ color, alpha });
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
    this._buttonStateListeners.clear();
    this._joystickDirListeners.clear();
    this._buttons.length = 0;
    this._joysticks.length = 0;
  }
}
