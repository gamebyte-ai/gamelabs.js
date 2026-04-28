import * as PIXI from "pixi.js";
import {
  ButtonComponent,
  DropdownComponent,
  HudViewBase,
  type DropdownItem,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { IDropdownDemoView } from "./IDropdownDemoView.js";

const DEFAULT_HEIGHT = 36;
const TEST_BUTTON_WIDTH = 160;
const TEST_BUTTON_HEIGHT = 36;
/**
 * Vertical gap from the dropdown header to the test button. With the
 * default 5-item list (32 px rows + 4 px offset = 164 px tall) the
 * button sits inside the list's render area, so the layering test
 * actually exercises the overlay z-order — the open list should
 * paint over the button entirely.
 */
const TEST_BUTTON_GAP = 50;

/**
 * Live preview for the `DropdownComponent` playground demo.
 *
 * Width / itemHeight / placeholder changes rebuild the underlying
 * dropdown (those are constructor-only). Items + selection flow
 * through to the live instance via `setItems` / `setSelectedId`. The
 * `toggleList()` action calls into the live dropdown so the user sees
 * the actual open/close transition.
 *
 * Centring: handled by the parent stage container.
 *
 * A second `ButtonComponent` is rendered directly below the dropdown
 * as a fixture for verifying the open list's overlay z-order: the
 * list (re-parented to the scene root with a high zIndex) should
 * paint over the button, the scrim should absorb taps in the button
 * area while the list is open, and the button should be clickable as
 * soon as the list closes.
 *
 * Outline: drawn at the dropdown header's `_width × DEFAULT_HEIGHT`
 * bounds. The open list is re-parented to the scene root by the
 * component itself, so it isn't covered by an outline here.
 */
export class DropdownDemoView extends HudViewBase implements IDropdownDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _dropdown: DropdownComponent | null = null;
  private _testButton: ButtonComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _changeUnsub: Unsubscribe | null = null;
  private _testButtonUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<(id: string, item: DropdownItem) => void>();
  private readonly _testButtonListeners = new Set<() => void>();

  // Mutable props.
  private _width = 200;
  private _itemHeight = 32;
  private _placeholder = "Select…";
  private _items: readonly DropdownItem[] = [];
  private _selectedId: string | null = null;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    // Stack the dropdown and the test button vertically. The gap is
    // sized so the test button lands inside the area the open list
    // would render into — that's the whole point of this fixture.
    this.layout = { flexDirection: "column", gap: TEST_BUTTON_GAP, alignItems: "center" };
    this._rebuildDropdown();
    // Build the test button once. It's deliberately independent of
    // the dropdown's mutable props (width / itemHeight / placeholder)
    // — width-slider drags must NOT resize this fixture.
    this._buildTestButton();
  }

  public setWidth(width: number): void {
    if (this._width === width) return;
    this._width = width;
    this._rebuildDropdown();
  }

  public setItemHeight(height: number): void {
    if (this._itemHeight === height) return;
    this._itemHeight = height;
    this._rebuildDropdown();
  }

  public setPlaceholder(placeholder: string): void {
    if (this._placeholder === placeholder) return;
    this._placeholder = placeholder;
    this._rebuildDropdown();
  }

  public setItems(items: readonly DropdownItem[]): void {
    this._items = items;
    this._dropdown?.setItems(items);
    // Mirror the component's silent-clear behaviour so our local
    // `_selectedId` stays in sync with the live dropdown.
    this._selectedId = this._dropdown?.selectedId ?? null;
  }

  public setSelectedId(id: string | null): void {
    this._selectedId = id;
    this._dropdown?.setSelectedId(id);
  }

  public toggleList(): void {
    this._dropdown?.toggle();
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onChange(cb: (id: string, item: DropdownItem) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public onTestButtonPress(cb: () => void): Unsubscribe {
    this._testButtonListeners.add(cb);
    return () => this._testButtonListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._testButtonListeners.clear();
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._testButtonUnsub?.();
    this._testButtonUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._dropdown?.removeFromParent();
    this._dropdown?.destroy();
    this._dropdown = null;
    this._testButton?.removeFromParent();
    this._testButton?.destroy();
    this._testButton = null;
    this._config = null;
    super.preDestroy();
  }

  private _fireChange(id: string, item: DropdownItem): void {
    this._selectedId = id;
    for (const cb of this._changeListeners) cb(id, item);
  }

  private _fireTestButtonPress(): void {
    for (const cb of this._testButtonListeners) cb();
  }

  private _rebuildDropdown(): void {
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._dropdown?.removeFromParent();
    this._dropdown?.destroy();

    this._dropdown = new DropdownComponent({
      width: this._width,
      height: DEFAULT_HEIGHT,
      itemHeight: this._itemHeight,
      placeholder: this._placeholder,
      items: this._items,
      selectedId: this._selectedId ?? undefined,
    });
    // `DropdownComponent` doesn't set its own `.layout`, so without
    // this it would be skipped by `@pixi/layout` and rendered at its
    // own (0, 0) — landing on top of the test button instead of
    // above it in the flex column. Marking it layout-aware here puts
    // it into the column flow alongside the button.
    this._dropdown.layout = { width: this._width, height: DEFAULT_HEIGHT };
    this._changeUnsub = this._dropdown.onChange((id, item) => this._fireChange(id, item));
    this.addChild(this._dropdown);
    // Move the persistent test button back to the end so it stays
    // AFTER the freshly added dropdown in flex order. Pixi's
    // `addChild` on an existing child only reorders the Pixi
    // children list and doesn't fire `"removed"` / `"added"`, which
    // means @pixi/layout's yoga-node tracking is left at the old
    // index — yoga then renders the button above the dropdown.
    // Detaching first guarantees both events fire and yoga rebuilds
    // its child order from the new Pixi order.
    if (this._testButton) {
      this._testButton.removeFromParent();
      this.addChild(this._testButton);
    }
    this._refreshOutline();
  }

  private _buildTestButton(): void {
    this._testButtonUnsub?.();
    this._testButtonUnsub = null;
    this._testButton?.removeFromParent();
    this._testButton?.destroy();

    // Width / colour / label are fixed constants — this fixture is
    // intentionally untouched by the dropdown's controls so the
    // overlay test isn't disturbed by `setWidth` etc.
    this._testButton = new ButtonComponent({
      width: TEST_BUTTON_WIDTH,
      height: TEST_BUTTON_HEIGHT,
      label: "Click me (overlay test)",
      radius: 6,
      fillColor: 0x16a34a,
      strokeColor: 0x14532d,
      strokeWidth: 1,
      labelStyle: { fontSize: 13, fontWeight: "700", fill: 0xffffff },
    });
    this._testButtonUnsub = this._testButton.onPress(() => this._fireTestButtonPress());
    this.addChild(this._testButton);
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._dropdown || !this._config) return;

    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(0, 0, this._width, DEFAULT_HEIGHT)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    this._dropdown.addChild(outline);
    this._outline = outline;
  }
}
