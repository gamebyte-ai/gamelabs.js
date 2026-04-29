import * as PIXI from "pixi.js";
import type { Layout } from "@pixi/layout";
import { PopupView } from "../../../../core/ui/PopupView.pixi.js";
import { ButtonComponent } from "../../../uicomponents/src/views/ButtonComponent.pixi.js";
import { ToggleComponent } from "../../../uicomponents/src/views/ToggleComponent.pixi.js";
import { SliderComponent } from "../../../uicomponents/src/views/SliderComponent.pixi.js";
import type { ISettingsPopupView } from "./ISettingsPopupView.js";

type FieldRow = {
  name: string;
  container: PIXI.Container;
};

type BooleanRow = FieldRow & {
  toggle: ToggleComponent;
  value: boolean;
};

type NumberRow = FieldRow & {
  slider: SliderComponent;
  valueText: PIXI.Text;
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

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this.layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

  public override postInitialize(): void {
    super.postInitialize();

    const panel = new PIXI.Container();
    panel.layout = {
      width: SettingsPopupView.PANEL_WIDTH,
      flexDirection: "column",
      alignItems: "center",
      padding: 20,
      gap: 8,
    };

    const panelBg = new PIXI.Graphics();
    panelBg.eventMode = "static";
    panelBg.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    panel.addChild(panelBg);
    this._panelBg = panelBg;

    // Title
    const title = new PIXI.Text({
      text: "Settings",
      style: {
        fill: 0x2d3748,
        fontSize: 22,
        fontWeight: "800",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      },
    });
    title.anchor.set(0.5, 0.5);
    title.layout = {};
    panel.addChild(title);

    // Rows container
    this._rowsContainer = new PIXI.Container();
    this._rowsContainer.layout = {
      width: "100%",
      flexDirection: "column",
      gap: 4,
      paddingTop: 8,
    };
    panel.addChild(this._rowsContainer);

    // Close button — uses the framework's default skin (provided by
    // `UIComponentsBinding`).
    this._closeBtn = new ButtonComponent({
      width: 120,
      height: 38,
      label: "Close",
      labelStyle: { fontSize: 14, fontWeight: "600", fill: 0x4a5568 },
    });
    this._closeBtn.resolveAssets(this.assetLoader);
    this._closeBtn.layout = { marginTop: 8 };
    panel.addChild(this._closeBtn);
    this._closeBtn.onPress(() => {
      for (const cb of this._closeListeners) cb();
    });

    // Wrapper to center panel
    const wrapper = new PIXI.Container();
    wrapper.layout = { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" };
    wrapper.addChild(panel);
    this.addChild(wrapper);

    this._panel = panel;

    // Redraw panel background whenever the panel's layout recomputes
    // (fields added, resize, etc.). Listen on panel, not panelBg, because
    // the panel's height is computed from its children and panelBg is just
    // 100%x100% of that.
    panel.on("layout", (l: Layout) => this._handlePanelLayout(l));
  }

  // ── Field creation ──

  public addBooleanField(name: string, label: string, value: boolean): void {
    const row = this._createRowContainer();
    const W = SettingsPopupView.PANEL_WIDTH - 40;

    const labelText = new PIXI.Text({
      text: label,
      style: {
        fill: 0x4a5568,
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      },
    });
    labelText.position.set(0, SettingsPopupView.ROW_HEIGHT / 2);
    labelText.anchor.set(0, 0.5);
    row.addChild(labelText);

    const toggle = new ToggleComponent({
      width: SettingsPopupView.TOGGLE_WIDTH,
      height: SettingsPopupView.TOGGLE_HEIGHT,
      value,
    });
    toggle.position.set(W - SettingsPopupView.TOGGLE_WIDTH, (SettingsPopupView.ROW_HEIGHT - SettingsPopupView.TOGGLE_HEIGHT) / 2);
    row.addChild(toggle);

    const boolRow: BooleanRow = { name, container: row, toggle, value };
    this._booleanRows.push(boolRow);

    toggle.onChange((v) => {
      boolRow.value = v;
      for (const cb of this._booleanChangedListeners) cb(name, v);
    });

    this._rowsContainer!.addChild(row);
  }

  public addNumberField(name: string, label: string, value: number, min: number, max: number, step: number): void {
    const row = this._createRowContainer();
    const W = SettingsPopupView.PANEL_WIDTH - 40;

    const labelText = new PIXI.Text({
      text: label,
      style: {
        fill: 0x4a5568,
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      },
    });
    labelText.position.set(0, SettingsPopupView.ROW_HEIGHT / 2);
    labelText.anchor.set(0, 0.5);
    row.addChild(labelText);

    const valueText = new PIXI.Text({
      text: this._formatNumber(value, step),
      style: {
        fill: 0x718096,
        fontSize: 13,
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      },
    });
    valueText.anchor.set(1, 0.5);
    valueText.position.set(W, SettingsPopupView.ROW_HEIGHT / 2);
    row.addChild(valueText);

    const slider = new SliderComponent({
      trackWidth: SettingsPopupView.TRACK_WIDTH,
      trackHeight: SettingsPopupView.TRACK_HEIGHT,
      thumbRadius: SettingsPopupView.THUMB_RADIUS,
      min,
      max,
      step,
      value,
    });
    slider.resolveAssets(this.assetLoader);
    slider.position.set(W - SettingsPopupView.TRACK_WIDTH - 45, SettingsPopupView.ROW_HEIGHT / 2);
    row.addChild(slider);

    const numRow: NumberRow = { name, container: row, slider, valueText, step };
    this._numberRows.push(numRow);

    slider.onChange((v) => {
      valueText.text = this._formatNumber(v, step);
      for (const cb of this._numberChangedListeners) cb(name, v);
    });

    this._rowsContainer!.addChild(row);
  }

  public updateFieldValue(name: string, value: unknown): void {
    for (const br of this._booleanRows) {
      if (br.name === name && typeof value === "boolean") {
        br.value = value;
        br.toggle.setValue(value);
        return;
      }
    }
    for (const nr of this._numberRows) {
      if (nr.name === name && typeof value === "number") {
        nr.slider.setValue(value);
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
    row.layout = { width: "100%", height: SettingsPopupView.ROW_HEIGHT };
    return row;
  }

  private _handlePanelLayout(l: Layout): void {
    if (!this._panelBg) return;
    const w = Math.max(1, Math.floor(l.computedLayout.width));
    const h = Math.max(1, Math.floor(l.computedLayout.height));
    this._panelBg.clear();
    this._panelBg.roundRect(0, 0, w, h, 16);
    this._panelBg.fill({ color: 0xffffff, alpha: 0.95 });
    this._panelBg.stroke({ color: 0xe2e8f0, width: 2 });
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
