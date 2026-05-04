import * as PIXI from "pixi.js";
import { PopupView } from "../../../../core/ui/PopupView.pixi.js";
import { ButtonComponent } from "../../../uicomponents/src/views/ButtonComponent.pixi.js";
import { HorizontalLayoutComponent } from "../../../uicomponents/src/views/HorizontalLayoutComponent.pixi.js";
import { ImageComponent } from "../../../uicomponents/src/views/ImageComponent.pixi.js";
import { LabelComponent } from "../../../uicomponents/src/views/LabelComponent.pixi.js";
import { ToggleComponent } from "../../../uicomponents/src/views/ToggleComponent.pixi.js";
import { SliderComponent } from "../../../uicomponents/src/views/SliderComponent.pixi.js";
import {
  UIComponentsStyleIds,
  type ButtonComponentStyle,
  type ImageComponentStyle,
  type LabelComponentStyle,
  type SliderComponentStyle,
  type ToggleComponentStyle,
} from "../../../uicomponents/src/UIComponentsStyleTypes.js";
import { SettingsAssetIds } from "../constants/SettingsAssetIds.js";
import type { ISettingsPopupView } from "./ISettingsPopupView.js";

type FieldRow = {
  name: string;
  container: HorizontalLayoutComponent;
};

type BooleanRow = FieldRow & {
  toggle: ToggleComponent;
  value: boolean;
};

type NumberRow = FieldRow & {
  slider: SliderComponent;
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
  private _panelBg: ImageComponent | null = null;
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

    // 9-slice rounded panel bg via ImageComponent. Both the texture id
    // and the visual override (alpha, 9-slice border) live in the
    // binding — the texture as a `HudTexture` request, the override as
    // a `Text` style asset that points back at the texture id by string.
    const panelBgStyle = this._resolveStyleFromTextAsset<ImageComponentStyle>(UIComponentsStyleIds.Image, SettingsAssetIds.PanelBgStyle);
    const panelBg = new ImageComponent(this.assetLoader, panelBgStyle, { fit: "stretch" });
    panelBg.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    panelBg.eventMode = "static";
    panel.addChild(panelBg);
    this._panelBg = panelBg;

    // Title — `LabelComponent` with the popup's heading style. Yoga
    // (`alignItems: "center"` on the panel) handles horizontal centering;
    // anchor stays at the default (0, 0) so the label's local origin
    // is its top-left, which matches Yoga's positive-bounds expectation.
    const titleStyle = this._resolveStyleFromTextAsset<LabelComponentStyle>(UIComponentsStyleIds.Label, SettingsAssetIds.TitleStyle);
    const title = new LabelComponent(this.assetLoader, titleStyle, { text: "Settings" });
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

    // Close button — style override shipped as a Text asset. Apps
    // re-theme by overriding the request URL or replacing the inline
    // JSON content on the binding before app boot.
    const closeButtonStyle = this._resolveStyleFromTextAsset<ButtonComponentStyle>(
      UIComponentsStyleIds.Button,
      SettingsAssetIds.CloseButtonStyle,
    );
    this._closeBtn = new ButtonComponent(this.assetLoader, closeButtonStyle, {
      width: 120,
      height: 38,
      label: "Close",
    });
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
  }

  // ── Field creation ──

  public addBooleanField(name: string, label: string, value: boolean): void {
    const row = this._createRow();

    // Default anchor (0, 0) keeps the label's layout-box origin aligned
    // with its rendered-pixel origin. Row's `justifyContent: "space-
    // between"` puts the label at the row's left edge and the toggle
    // at the row's right edge — no need to touch the label's layout.
    const labelComp = new LabelComponent(this.assetLoader, this._fieldLabelStyle(), { text: label });
    row.addChild(labelComp);

    const toggleStyle = this.styleManager.resolve<ToggleComponentStyle>(UIComponentsStyleIds.Toggle);
    const toggle = new ToggleComponent(this.assetLoader, toggleStyle, {
      width: SettingsPopupView.TOGGLE_WIDTH,
      height: SettingsPopupView.TOGGLE_HEIGHT,
      value,
    });
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
    // `min`, `max`, `step`, `value` flow through to SliderComponent;
    // the popup itself doesn't display the numeric value any longer.
    const row = this._createRow();

    const labelComp = new LabelComponent(this.assetLoader, this._fieldLabelStyle(), { text: label });
    row.addChild(labelComp);

    const sliderStyle = this.styleManager.resolve<SliderComponentStyle>(UIComponentsStyleIds.Slider);
    const slider = new SliderComponent(this.assetLoader, sliderStyle, {
      trackWidth: SettingsPopupView.TRACK_WIDTH,
      trackHeight: SettingsPopupView.TRACK_HEIGHT,
      thumbRadius: SettingsPopupView.THUMB_RADIUS,
      min,
      max,
      step,
      value,
    });
    // SliderComponent's internal contents are centered around its local
    // `y=0` (track at `±trackHeight/2`, thumb at `±thumbRadius`), so
    // declaring a fixed-height layout box would put the slider's
    // local origin at the box's top-left and the visible content
    // would render *above* the row. `height: 0` collapses the layout
    // box vertically; combined with the row's `alignItems: "center"`,
    // Yoga places the slider's local `y=0` at the row's vertical
    // centerline — which is exactly where the slider's content
    // expects to render.
    //
    // Width matches the bare track (no thumb-overflow allowance) so
    // the slider's *track* right edge lines up with the toggle's
    // right edge under the row's `justifyContent: "space-between"` —
    // both right-side controls sit the same distance from the panel
    // edge. The thumb's value=max position overflows the layout box
    // by `thumbRadius`, which lands inside the panel's 20px right
    // padding (safe). The thumb's value=min position similarly
    // overflows left by `thumbRadius`, which sits in the empty space
    // between the field label and the slider track (also safe given
    // typical field-label widths).
    slider.layout = {
      width: SettingsPopupView.TRACK_WIDTH,
      height: 0,
    };
    row.addChild(slider);

    const numRow: NumberRow = { name, container: row, slider };
    this._numberRows.push(numRow);

    slider.onChange((v) => {
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

  /**
   * Builds a fresh field row as a flex `HorizontalLayoutComponent`.
   * `justifyContent: "space-between"` puts the first child at the
   * row's left edge and the last child at the row's right edge — so
   * boolean rows (label + toggle) and number rows (label + slider +
   * value readout) all share a consistent right-edge x without us
   * having to mutate any child's `.layout` after construction.
   * `alignItems: "center"` handles vertical centering.
   */
  private _createRow(): HorizontalLayoutComponent {
    return new HorizontalLayoutComponent({
      width: "100%",
      height: SettingsPopupView.ROW_HEIGHT,
      alignItems: "center",
      justifyContent: "space-between",
      padding: 0,
    });
  }

  /**
   * Resolves a UIComponent style by deep-merging the JSON override
   * stored as a Text asset on top of the registered defaults. Missing
   * asset → empty `{}` so the resolved style falls through to the
   * framework defaults verbatim (defensive against the binding not
   * being installed).
   */
  private _resolveStyleFromTextAsset<T extends object>(styleId: string, assetId: string): T {
    const json = this.assetLoader.getAsset<string>(assetId) ?? "{}";
    return this.styleManager.resolve<T>(styleId, JSON.parse(json) as T);
  }

  /**
   * Resolved `LabelComponentStyle` for field-name labels (left side of
   * each row). Source JSON shipped by `SettingsBinding` as
   * `SettingsAssetIds.FieldLabelStyle`.
   */
  private _fieldLabelStyle(): LabelComponentStyle {
    return this._resolveStyleFromTextAsset<LabelComponentStyle>(UIComponentsStyleIds.Label, SettingsAssetIds.FieldLabelStyle);
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
