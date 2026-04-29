import * as PIXI from "pixi.js";
import {
  BackgroundComponent,
  ButtonComponent,
  HudViewBase,
  UIComponentsStyleIds,
  VerticalLayoutComponent,
  type BackgroundComponentStyle,
  type ButtonComponentStyle,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundAssetIds } from "../UIPlaygroundAssetIds.js";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { IBackgroundDemoView } from "./IBackgroundDemoView.js";

const SECTION_LABEL_STYLE: Partial<PIXI.TextStyleOptions> = {
  fill: 0xa3b1c2,
  fontSize: 12,
  fontWeight: "600",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  letterSpacing: 1,
};

// Both backgrounds render inside a fixed-size wrapper so the cover-fit
// math has something to fill — the playground stage is shared with
// other demos, we can't have the BG paint over the whole region.
const WRAPPER_WIDTH = 360;
const WRAPPER_HEIGHT = 180;

/**
 * Live preview for the `BackgroundComponent` playground demo. Renders
 * two fixed-size wrappers stacked vertically:
 *
 *   1. **Default skin** — `BackgroundComponent` constructed with the
 *      framework default style resolved from
 *      `UIComponentsStyleIds.Background` (white texture shipped by
 *      `UIComponentsBinding`).
 *   2. **Custom skin** — `BackgroundComponent` constructed with a per-
 *      call style override pointing at the playground's
 *      `UIPlaygroundAssetIds.CustomBackground` PNG (a dark vignette).
 *
 * A "Open settings" button at the bottom of the column opens the
 * framework `SettingsBinding` popup — useful for testing the settings
 * module's UI from the playground (the module's only other entry point
 * is from inside a game example's HUD).
 *
 * Overlay alpha is controllable from the controls panel; both wrappers
 * are rebuilt on every change so the user can see the
 * readability-overlay tuning live.
 */
export class BackgroundDemoView extends HudViewBase implements IBackgroundDemoView {
  private _config: UIPlaygroundConfig | null = null;

  private _column: VerticalLayoutComponent | null = null;
  private _defaultWrapper: PIXI.Container | null = null;
  private _customWrapper: PIXI.Container | null = null;
  private _defaultBg: BackgroundComponent | null = null;
  private _customBg: BackgroundComponent | null = null;
  private _defaultOutline: PIXI.Graphics | null = null;
  private _customOutline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _settingsBtn: ButtonComponent | null = null;
  private _settingsBtnUnsub: Unsubscribe | null = null;
  private readonly _openSettingsListeners = new Set<() => void>();

  private _overlayAlpha = 0.12;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._buildColumn();
  }

  public setOverlayAlpha(alpha: number): void {
    if (this._overlayAlpha === alpha) return;
    this._overlayAlpha = alpha;
    this._rebuildBackgrounds();
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutlines();
  }

  public onOpenSettingsPressed(cb: () => void): Unsubscribe {
    this._openSettingsListeners.add(cb);
    return () => this._openSettingsListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._openSettingsListeners.clear();
    this._settingsBtnUnsub?.();
    this._settingsBtnUnsub = null;
    this._defaultOutline?.removeFromParent();
    this._defaultOutline?.destroy();
    this._defaultOutline = null;
    this._customOutline?.removeFromParent();
    this._customOutline?.destroy();
    this._customOutline = null;
    this._column?.removeFromParent();
    this._column?.destroy({ children: true });
    this._column = null;
    this._defaultWrapper = null;
    this._customWrapper = null;
    this._defaultBg = null;
    this._customBg = null;
    this._settingsBtn = null;
    this._config = null;
    super.preDestroy();
  }

  private _fireOpenSettings(): void {
    for (const cb of this._openSettingsListeners) cb();
  }

  private _buildColumn(): void {
    const column = new VerticalLayoutComponent({
      gap: 24,
      padding: 0,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    });
    this._column = column;
    this.addChild(column);
    this._rebuildBackgrounds();
  }

  private _rebuildBackgrounds(): void {
    if (!this._column) return;

    this._settingsBtnUnsub?.();
    this._settingsBtnUnsub = null;
    this._defaultOutline?.removeFromParent();
    this._defaultOutline?.destroy();
    this._defaultOutline = null;
    this._customOutline?.removeFromParent();
    this._customOutline?.destroy();
    this._customOutline = null;

    this._column.removeChildren().forEach((c) => c.destroy({ children: true }));

    this._column.addChild(this._buildSection("DEFAULT SKIN (white)", false));
    this._column.addChild(this._buildSection("CUSTOM SKIN (dark vignette)", true));
    this._column.addChild(this._buildSettingsRow());

    this._refreshOutlines();
  }

  private _buildSection(captionText: string, isCustom: boolean): VerticalLayoutComponent {
    const section = new VerticalLayoutComponent({
      gap: 6,
      padding: 0,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    });

    const caption = new PIXI.Text({ text: captionText, style: SECTION_LABEL_STYLE });
    caption.layout = {};
    section.addChild(caption);

    // Wrapper: fixed size, gives the background a layout box to cover.
    // Mask the wrapper's bounds so the cover-fit overflow doesn't bleed
    // into the rest of the playground's stage region.
    const wrapper = new PIXI.Container();
    wrapper.layout = { width: WRAPPER_WIDTH, height: WRAPPER_HEIGHT };
    const mask = new PIXI.Graphics();
    mask.rect(0, 0, WRAPPER_WIDTH, WRAPPER_HEIGHT).fill({ color: 0xffffff });
    wrapper.addChild(mask);
    wrapper.mask = mask;
    section.addChild(wrapper);

    const bgStyle = isCustom
      ? this.styleManager.resolve<BackgroundComponentStyle>(UIComponentsStyleIds.Background, {
          bg: { textureId: UIPlaygroundAssetIds.CustomBackground },
        })
      : this.styleManager.resolve<BackgroundComponentStyle>(UIComponentsStyleIds.Background);
    const bg = new BackgroundComponent(this.assetLoader, bgStyle, { overlayAlpha: this._overlayAlpha });
    wrapper.addChild(bg);

    if (isCustom) {
      this._customWrapper = wrapper;
      this._customBg = bg;
    } else {
      this._defaultWrapper = wrapper;
      this._defaultBg = bg;
    }

    return section;
  }

  private _buildSettingsRow(): VerticalLayoutComponent {
    const row = new VerticalLayoutComponent({
      gap: 4,
      padding: 0,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    });
    const caption = new PIXI.Text({ text: "SETTINGS MODULE", style: SECTION_LABEL_STYLE });
    caption.layout = {};
    row.addChild(caption);

    // Button — opens the SettingsBinding popup. The playground app
    // registers SettingsBinding alongside UIComponentsBinding so the
    // SettingsUIIds.SettingsPopup id resolves at runtime.
    const buttonStyle = this.styleManager.resolve<ButtonComponentStyle>(UIComponentsStyleIds.Button, {
      label: { fontSize: 14, fontWeight: "600" },
    });
    const button = new ButtonComponent(this.assetLoader, buttonStyle, {
      width: 200,
      height: 38,
      label: "Open settings",
    });
    this._settingsBtn = button;
    this._settingsBtnUnsub = button.onPress(() => this._fireOpenSettings());
    row.addChild(button);

    return row;
  }

  private _refreshOutlines(): void {
    this._defaultOutline?.removeFromParent();
    this._defaultOutline?.destroy();
    this._defaultOutline = null;
    this._customOutline?.removeFromParent();
    this._customOutline?.destroy();
    this._customOutline = null;
    if (!this._outlineVisible || !this._config) return;

    if (this._defaultWrapper) {
      this._defaultOutline = this._makeOutline();
      this._defaultWrapper.addChild(this._defaultOutline);
    }
    if (this._customWrapper) {
      this._customOutline = this._makeOutline();
      this._customWrapper.addChild(this._customOutline);
    }
  }

  private _makeOutline(): PIXI.Graphics {
    const config = this._config!;
    const g = new PIXI.Graphics();
    g.eventMode = "none";
    g.rect(0, 0, WRAPPER_WIDTH, WRAPPER_HEIGHT).stroke({
      color: config.outlineColor,
      width: config.outlineWidth,
    });
    return g;
  }
}
