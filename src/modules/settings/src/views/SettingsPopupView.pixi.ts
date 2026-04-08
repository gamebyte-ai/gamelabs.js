import * as PIXI from "pixi.js";
import { PopupView } from "../../../../core/ui/PopupView.pixi.js";
import { ButtonComponent } from "../../../uicomponents/src/ButtonComponent.pixi.js";
import type { ISettingsPopupView } from "./ISettingsPopupView.js";

type FieldRow = {
  name: string;
  container: PIXI.Container;
};

type BooleanRow = FieldRow & {
  toggle: PIXI.Graphics;
  value: boolean;
};

type NumberRow = FieldRow & {
  track: PIXI.Graphics;
  thumb: PIXI.Graphics;
  valueText: PIXI.Text;
  value: number;
  min: number;
  max: number;
  step: number;
};

export class SettingsPopupView extends PopupView implements ISettingsPopupView {
  private static readonly PANEL_WIDTH = 340;
  private static readonly ROW_HEIGHT = 44;
  private static readonly TRACK_WIDTH = 140;
  private static readonly TRACK_HEIGHT = 6;
  private static readonly THUMB_RADIUS = 10;
  private static readonly TOGGLE_WIDTH = 44;
  private static readonly TOGGLE_HEIGHT = 24;

  private _panel: PIXI.Container | null = null;
  private _panelBg: PIXI.Graphics | null = null;
  private _rowsContainer: PIXI.Container | null = null;
  private _closeBtn: ButtonComponent | null = null;

  private readonly _booleanRows: BooleanRow[] = [];
  private readonly _numberRows: NumberRow[] = [];
  private readonly _booleanChangedListeners = new Set<(name: string, value: boolean) => void>();
  private readonly _numberChangedListeners = new Set<(name: string, value: number) => void>();
  private readonly _closeListeners = new Set<() => void>();

  public override postInitialize(): void {
    super.postInitialize();

    const panel = new PIXI.Container();
    (panel as any).layout = {
      width: SettingsPopupView.PANEL_WIDTH,
      flexDirection: "column",
      alignItems: "center",
      padding: 20,
      gap: 8,
    };

    const panelBg = new PIXI.Graphics();
    (panelBg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    panel.addChild(panelBg);
    this._panelBg = panelBg;

    // Title
    const title = new PIXI.Text({
      text: "Settings",
      style: { fill: 0x2d3748, fontSize: 22, fontWeight: "800", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    title.anchor.set(0.5, 0.5);
    (title as any).layout = {};
    panel.addChild(title);

    // Rows container
    this._rowsContainer = new PIXI.Container();
    (this._rowsContainer as any).layout = {
      width: "100%",
      flexDirection: "column",
      gap: 4,
      paddingTop: 8,
    };
    panel.addChild(this._rowsContainer);

    // Close button
    this._closeBtn = new ButtonComponent({
      width: 120, height: 38,
      label: "Close",
      labelStyle: { fontSize: 14, fontWeight: "600", fill: 0x4a5568 },
      radius: 19,
      fillColor: 0xe2e8f0,
      fillAlpha: 0.8,
      strokeColor: 0xcbd5e0,
    });
    (this._closeBtn as any).layout = { marginTop: 8 };
    panel.addChild(this._closeBtn);
    this._closeBtn.onPress(() => {
      for (const cb of this._closeListeners) cb();
    });

    // Wrapper to center panel
    const wrapper = new PIXI.Container();
    (wrapper as any).layout = { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" };
    wrapper.addChild(panel);
    this.addChild(wrapper);

    this._panel = panel;
    this._redrawPanelBg();
  }

  // ── Field creation ──

  public addBooleanField(name: string, label: string, value: boolean): void {
    const row = this._createRowContainer();
    const W = SettingsPopupView.PANEL_WIDTH - 40;

    const labelText = new PIXI.Text({
      text: label,
      style: { fill: 0x4a5568, fontSize: 14, fontWeight: "600", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    labelText.position.set(0, SettingsPopupView.ROW_HEIGHT / 2);
    labelText.anchor.set(0, 0.5);
    row.addChild(labelText);

    const toggle = new PIXI.Graphics();
    toggle.eventMode = "static";
    (toggle as any).cursor = "pointer";
    toggle.position.set(W - SettingsPopupView.TOGGLE_WIDTH, (SettingsPopupView.ROW_HEIGHT - SettingsPopupView.TOGGLE_HEIGHT) / 2);
    row.addChild(toggle);

    const boolRow: BooleanRow = { name, container: row, toggle, value };
    this._booleanRows.push(boolRow);
    this._drawToggle(toggle, value);

    toggle.on("pointertap", () => {
      boolRow.value = !boolRow.value;
      this._drawToggle(toggle, boolRow.value);
      for (const cb of this._booleanChangedListeners) cb(name, boolRow.value);
    });

    this._rowsContainer!.addChild(row);
    this._redrawPanelBg();
  }

  public addNumberField(name: string, label: string, value: number, min: number, max: number, step: number): void {
    const row = this._createRowContainer();
    const W = SettingsPopupView.PANEL_WIDTH - 40;

    const labelText = new PIXI.Text({
      text: label,
      style: { fill: 0x4a5568, fontSize: 14, fontWeight: "600", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    labelText.position.set(0, SettingsPopupView.ROW_HEIGHT / 2);
    labelText.anchor.set(0, 0.5);
    row.addChild(labelText);

    const valueText = new PIXI.Text({
      text: this._formatNumber(value, step),
      style: { fill: 0x718096, fontSize: 13, fontWeight: "600", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }
    });
    valueText.anchor.set(1, 0.5);
    valueText.position.set(W, SettingsPopupView.ROW_HEIGHT / 2);
    row.addChild(valueText);

    // Slider track
    const trackX = W - SettingsPopupView.TRACK_WIDTH - 45;
    const trackY = SettingsPopupView.ROW_HEIGHT / 2;
    const track = new PIXI.Graphics();
    track.eventMode = "static";
    track.position.set(trackX, trackY);
    row.addChild(track);

    // Slider thumb
    const thumb = new PIXI.Graphics();
    thumb.eventMode = "static";
    (thumb as any).cursor = "pointer";
    row.addChild(thumb);

    const numRow: NumberRow = { name, container: row, track, thumb, valueText, value, min, max, step };
    this._numberRows.push(numRow);
    this._drawSlider(numRow);

    // Drag handling
    let dragging = false;
    const updateFromX = (globalX: number): void => {
      const localX = globalX - track.getGlobalPosition().x;
      const ratio = Math.max(0, Math.min(1, localX / SettingsPopupView.TRACK_WIDTH));
      const raw = min + ratio * (max - min);
      const stepped = step > 0 ? Math.round(raw / step) * step : raw;
      const clamped = Math.max(min, Math.min(max, stepped));
      numRow.value = clamped;
      this._drawSlider(numRow);
      valueText.text = this._formatNumber(clamped, step);
      for (const cb of this._numberChangedListeners) cb(name, clamped);
    };

    track.on("pointerdown", (e: PIXI.FederatedPointerEvent) => { dragging = true; updateFromX(e.global.x); });
    thumb.on("pointerdown", () => { dragging = true; });
    row.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => { if (dragging) updateFromX(e.global.x); });
    row.on("pointerup", () => { dragging = false; });
    row.on("pointerupoutside", () => { dragging = false; });
    row.eventMode = "static";

    this._rowsContainer!.addChild(row);
    this._redrawPanelBg();
  }

  public updateFieldValue(name: string, value: unknown): void {
    for (const br of this._booleanRows) {
      if (br.name === name && typeof value === "boolean") {
        br.value = value;
        this._drawToggle(br.toggle, value);
        return;
      }
    }
    for (const nr of this._numberRows) {
      if (nr.name === name && typeof value === "number") {
        nr.value = value;
        this._drawSlider(nr);
        nr.valueText.text = this._formatNumber(value, nr.step);
        return;
      }
    }
  }

  // ── Events ──

  public onBooleanChanged(cb: (name: string, value: boolean) => void): () => void {
    this._booleanChangedListeners.add(cb);
    return () => this._booleanChangedListeners.delete(cb);
  }

  public onNumberChanged(cb: (name: string, value: number) => void): () => void {
    this._numberChangedListeners.add(cb);
    return () => this._numberChangedListeners.delete(cb);
  }

  public onCloseTapped(cb: () => void): () => void {
    this._closeListeners.add(cb);
    return () => this._closeListeners.delete(cb);
  }

  // ── Drawing helpers ──

  private _createRowContainer(): PIXI.Container {
    const row = new PIXI.Container();
    (row as any).layout = { width: "100%", height: SettingsPopupView.ROW_HEIGHT };
    return row;
  }

  private _drawToggle(gfx: PIXI.Graphics, on: boolean): void {
    const w = SettingsPopupView.TOGGLE_WIDTH;
    const h = SettingsPopupView.TOGGLE_HEIGHT;
    const r = h / 2;
    gfx.clear();
    gfx.roundRect(0, 0, w, h, r);
    gfx.fill({ color: on ? 0x48bb78 : 0xcbd5e0, alpha: 1 });
    // Thumb circle
    const thumbX = on ? w - r : r;
    gfx.circle(thumbX, r, r - 3);
    gfx.fill({ color: 0xffffff });
  }

  private _drawSlider(nr: NumberRow): void {
    const tw = SettingsPopupView.TRACK_WIDTH;
    const th = SettingsPopupView.TRACK_HEIGHT;
    const tr = SettingsPopupView.THUMB_RADIUS;

    // Track
    nr.track.clear();
    nr.track.roundRect(0, -th / 2, tw, th, th / 2);
    nr.track.fill({ color: 0xcbd5e0 });

    // Filled portion
    const ratio = nr.max > nr.min ? (nr.value - nr.min) / (nr.max - nr.min) : 0;
    const filledW = ratio * tw;
    nr.track.roundRect(0, -th / 2, filledW, th, th / 2);
    nr.track.fill({ color: 0x4299e1 });

    // Thumb
    const thumbX = nr.track.x + filledW;
    const thumbY = nr.track.y;
    nr.thumb.clear();
    nr.thumb.circle(0, 0, tr);
    nr.thumb.fill({ color: 0x4299e1 });
    nr.thumb.circle(0, 0, tr - 3);
    nr.thumb.fill({ color: 0xffffff });
    nr.thumb.position.set(thumbX, thumbY);
  }

  private _redrawPanelBg(): void {
    if (!this._panelBg || !this._panel) return;
    // Defer to next frame so layout has computed height
    requestAnimationFrame(() => {
      if (!this._panelBg || !this._panel) return;
      const layout = (this._panel as any).layout;
      const w = layout?.computedLayout?.width ?? SettingsPopupView.PANEL_WIDTH;
      const h = layout?.computedLayout?.height ?? 300;
      this._panelBg.clear();
      this._panelBg.roundRect(0, 0, w, h, 16);
      this._panelBg.fill({ color: 0xffffff, alpha: 0.95 });
      this._panelBg.stroke({ color: 0xe2e8f0, width: 2 });
    });
  }

  private _formatNumber(value: number, step: number): string {
    if (step >= 1) return String(Math.round(value));
    const decimals = Math.max(0, -Math.floor(Math.log10(step)));
    return value.toFixed(decimals);
  }

  public override preDestroy(): void {
    this._booleanChangedListeners.clear();
    this._numberChangedListeners.clear();
    this._closeListeners.clear();
    this._booleanRows.length = 0;
    this._numberRows.length = 0;
    this._panel = null;
    this._panelBg = null;
    this._rowsContainer = null;
    this._closeBtn = null;
  }
}
