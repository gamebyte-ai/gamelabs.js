import * as PIXI from "pixi.js";
import {
  DropdownComponent,
  HudViewBase,
  type DropdownItem,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { IDropdownDemoView } from "./IDropdownDemoView.js";

const DEFAULT_HEIGHT = 36;

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
 * Outline: drawn at the dropdown header's `_width × DEFAULT_HEIGHT`
 * bounds. The open list is re-parented to the scene root by the
 * component itself, so it isn't covered by an outline here.
 */
export class DropdownDemoView extends HudViewBase implements IDropdownDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _dropdown: DropdownComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _changeUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<(id: string, item: DropdownItem) => void>();

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
    this.layout = {};
    this._rebuildDropdown();
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

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._dropdown?.removeFromParent();
    this._dropdown?.destroy();
    this._dropdown = null;
    this._config = null;
    super.preDestroy();
  }

  private _fireChange(id: string, item: DropdownItem): void {
    this._selectedId = id;
    for (const cb of this._changeListeners) cb(id, item);
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
    this._changeUnsub = this._dropdown.onChange((id, item) => this._fireChange(id, item));
    this.addChild(this._dropdown);
    this._refreshOutline();
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
