import * as PIXI from "pixi.js";
import {
  HudViewBase,
  ListComponent,
  type IInstanceResolver,
  type ListItem,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import {
  SCROLL_VIEW_ITEM_PALETTE,
  type ListSelectionModePreset,
  type ListVariantPreset,
} from "../constants/DemoPresets.js";
import type { IListDemoView } from "./IListDemoView.js";

const LIST_WIDTH = 280;
const TEXTURE_SIZE = 32;

/**
 * Live preview for the `ListComponent` playground demo.
 *
 * Variant / selectionMode / itemHeight changes rebuild
 * the underlying component (those are constructor-only). itemCount
 * flows through to the live instance via `setItems` so the user's
 * selection survives slider drags. The image and text+image variants
 * use a small palette of canvas-generated textures cycled per item
 * index, so the demo doesn't need to load real assets.
 *
 * Outline: drawn at the list's known geometry (`width × itemCount ·
 * itemHeight`) so it tracks every relevant rebuild and update.
 */
export class ListDemoView extends HudViewBase implements IListDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _list: ListComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _changeUnsub: Unsubscribe | null = null;
  private _pressUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<
    (selectedIds: readonly string[], selectedItems: readonly ListItem[]) => void
  >();
  private readonly _pressListeners = new Set<(id: string, item: ListItem) => void>();
  private readonly _paletteTextures: PIXI.Texture[] = [];

  // Mutable props.
  private _variant: ListVariantPreset = "text";
  private _selectionMode: ListSelectionModePreset = "none";
  private _itemCount = 6;
  private _itemHeight = 36;
  private _selectedIds: readonly string[] = [];

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._generatePaletteTextures();
    this._rebuildList();
  }

  public setVariant(variant: ListVariantPreset): void {
    if (this._variant === variant) return;
    this._variant = variant;
    this._rebuildList();
  }

  public setSelectionMode(mode: ListSelectionModePreset): void {
    if (this._selectionMode === mode) return;
    this._selectionMode = mode;
    // Selection semantics change with mode; clear so the new component
    // starts from a known empty state.
    this._selectedIds = [];
    this._rebuildList();
  }

  public setItemCount(count: number): void {
    if (this._itemCount === count) return;
    this._itemCount = count;
    if (this._list) {
      this._list.setItems(this._buildItems());
      this._selectedIds = this._list.selectedIds;
    }
    this._refreshOutline();
  }

  public setItemHeight(height: number): void {
    if (this._itemHeight === height) return;
    this._itemHeight = height;
    this._rebuildList();
  }

  public clearSelection(): void {
    this._selectedIds = [];
    this._list?.setSelectedIds([]);
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onChange(
    cb: (selectedIds: readonly string[], selectedItems: readonly ListItem[]) => void,
  ): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public onItemPress(cb: (id: string, item: ListItem) => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._pressListeners.clear();
    this._changeUnsub?.();
    this._pressUnsub?.();
    this._changeUnsub = null;
    this._pressUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._list?.removeFromParent();
    this._list?.destroy({ children: true });
    this._list = null;
    for (const tex of this._paletteTextures) tex.destroy(true);
    this._paletteTextures.length = 0;
    this._config = null;
    super.preDestroy();
  }

  private _fireChange(ids: readonly string[], items: readonly ListItem[]): void {
    this._selectedIds = ids;
    for (const cb of this._changeListeners) cb(ids, items);
  }

  private _firePress(id: string, item: ListItem): void {
    for (const cb of this._pressListeners) cb(id, item);
  }

  private _generatePaletteTextures(): void {
    if (this._paletteTextures.length > 0) return;
    for (const color of SCROLL_VIEW_ITEM_PALETTE) {
      this._paletteTextures.push(this._makeColorTexture(color, TEXTURE_SIZE));
    }
  }

  private _makeColorTexture(color: number, size: number): PIXI.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return PIXI.Texture.WHITE;
    const radius = 6;
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
    return PIXI.Texture.from(canvas);
  }

  private _buildItems(): readonly ListItem[] {
    const items: ListItem[] = [];
    for (let i = 0; i < this._itemCount; i++) {
      items.push({
        id: `item-${i}`,
        label: `Item ${i + 1}`,
        texture: this._paletteTextures[i % this._paletteTextures.length],
      });
    }
    return items;
  }

  private _rebuildList(): void {
    this._changeUnsub?.();
    this._pressUnsub?.();
    this._changeUnsub = null;
    this._pressUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._list?.removeFromParent();
    this._list?.destroy({ children: true });

    this._list = new ListComponent({
      width: LIST_WIDTH,
      itemHeight: this._itemHeight,
      variant: this._variant,
      selectionMode: this._selectionMode,
      items: this._buildItems(),
      selectedIds: this._selectedIds,
      radius: 4,
    });
    this._changeUnsub = this._list.onChange((ids, items) => this._fireChange(ids, items));
    this._pressUnsub = this._list.onItemPress((id, item) => this._firePress(id, item));
    this.addChild(this._list);
    this._refreshOutline();
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._list || !this._config) return;

    // List uses default itemGap = 0 and padding = 0, so total height
    // = itemCount × itemHeight. Width is the configured LIST_WIDTH.
    const w = LIST_WIDTH;
    const h = this._itemCount * this._itemHeight;
    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(0, 0, w, h)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    this._list.addChild(outline);
    this._outline = outline;
  }
}
