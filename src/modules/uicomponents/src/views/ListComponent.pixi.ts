import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { IAssetManager } from "../../../../core/assets/IAssetManager.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export type ListSelectionMode = "none" | "single" | "multi";

export type ListItemVariant = "text" | "text+image" | "image";

export type ListItem = {
  /** Unique identifier for this row. Used by `selectedIds` / `setSelectedIds`. */
  readonly id: string;
  /** Label text. Used by the `"text"` and `"text+image"` variants. */
  readonly label?: string;
  /**
   * Asset id resolved to a `PIXI.Texture` via `resolveAssets()`. Used
   * by the `"image"` and `"text+image"` variants.
   */
  readonly textureId?: string;
  /**
   * Pre-resolved texture (alternative to `textureId`). When both are
   * present, `texture` wins so callers can override resolution.
   */
  readonly texture?: PIXI.Texture;
};

export type ListComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Total list width. @default 240 */
  width?: number;
  /** Per-row height. @default 36 */
  itemHeight?: number;
  /** Vertical gap between rows. @default 0 */
  itemGap?: number;
  /** Padding around the rows on all sides. @default 0 */
  padding?: number;
  /** Item layout variant. @default "text" */
  variant?: ListItemVariant;
  /**
   * Selection model.
   * - `"none"` — non-selectable; rows fire `onItemPress` only.
   * - `"single"` — at most one item selected at a time. Re-tapping the
   *   selected row is a no-op.
   * - `"multi"` — re-tapping toggles the row in / out of the set.
   * @default "none"
   */
  selectionMode?: ListSelectionMode;
  /** Items to render. May be replaced later with `setItems()`. */
  items?: readonly ListItem[];
  /** Initial selection. Filtered to known item ids and the active selection mode. */
  selectedIds?: readonly string[];

  // ── Row visuals ─────────────────────────────────────────────────────
  /** Row corner radius. @default 0 */
  radius?: number;
  /** Resting row background color. @default 0x111827 */
  fillColor?: number;
  /** Row background alpha (applied to resting / hover / selected). @default 1 */
  fillAlpha?: number;
  /** Row background color when the pointer hovers. @default 0x374151 */
  hoverColor?: number;
  /** Row background color for selected rows. @default 0x4338ca */
  selectedColor?: number;
  /** Row border color (drawn only when `borderWidth > 0`). @default 0x475569 */
  borderColor?: number;
  /** Row border width. @default 0 */
  borderWidth?: number;

  // ── Image options (variants `"image"` / `"text+image"`) ─────────────
  /** Square image size in pixels. @default 24 */
  imageSize?: number;
  /** Padding around the image inside its row slot. @default 8 */
  imagePadding?: number;

  // ── Text options (variants `"text"` / `"text+image"`) ───────────────
  /** Label style overrides merged on top of the defaults. */
  labelStyle?: Partial<PIXI.TextStyleOptions>;
  /** Left padding for the label in `"text"` variant. @default 12 */
  textPadding?: number;
};

/**
 * Parse a JSON string into ListComponentPreset.
 */
export function parseListComponentPreset(json: string): ListComponentPreset {
  return JSON.parse(json) as ListComponentPreset;
}

const DEFAULT_LABEL_STYLE: Partial<PIXI.TextStyleOptions> = {
  fill: 0xe8eef6,
  fontSize: 14,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  fontWeight: "600",
};

type RowEntry = {
  item: ListItem;
  row: PIXI.Container;
  bg: PIXI.Graphics;
  sprite: PIXI.Sprite | null;
  text: PIXI.Text | null;
};

/**
 * Reusable list / picker component.
 *
 * - Renders one row per item in a single column. Item layout is one of
 *   three variants: `"text"`, `"text+image"`, or `"image"`. Picking the
 *   variant up front keeps the row geometry (and hit area) stable.
 * - Selection is opt-in: `"none"` makes rows behave like buttons (only
 *   `onItemPress` fires); `"single"` enforces mutual exclusion;
 *   `"multi"` toggles each row in or out of a set. Programmatic
 *   `setSelectedIds()` is silent — `onChange` only fires on user-driven
 *   selection changes.
 * - Each row paints its own background (resting / hover / selected),
 *   uses an explicit `hitArea` covering its full bounds, and forwards
 *   taps as either a state change or a press depending on the mode.
 * - Sets its own `.layout` (a flex column with the configured
 *   `width`, `padding`, `itemGap`, `alignItems: "stretch"`) so it
 *   nests inside other `@pixi/layout` flex flows. The component does
 *   NOT scroll on its own — wrap it in a `ScrollViewComponent` when
 *   the row count exceeds the visible area.
 *
 * Item textures: items can carry either a pre-resolved
 * {@link ListItem.texture} or a {@link ListItem.textureId}. After
 * `setItems()`, call `resolveAssets(assetManager)` to look up any
 * textureIds; pre-resolved `texture`s are always honored verbatim.
 */
export class ListComponent extends PIXI.Container {
  private readonly _width: number;
  private readonly _itemHeight: number;
  private readonly _padding: number;
  private readonly _variant: ListItemVariant;
  private readonly _selectionMode: ListSelectionMode;
  private readonly _radius: number;
  private readonly _fillColor: number;
  private readonly _fillAlpha: number;
  private readonly _hoverColor: number;
  private readonly _selectedColor: number;
  private readonly _borderColor: number;
  private readonly _borderWidth: number;
  private readonly _imageSize: number;
  private readonly _imagePadding: number;
  private readonly _labelStyle: Partial<PIXI.TextStyleOptions>;
  private readonly _textPadding: number;

  private readonly _changeListeners = new Set<(selectedIds: readonly string[], selectedItems: readonly ListItem[]) => void>();
  private readonly _pressListeners = new Set<(id: string, item: ListItem) => void>();
  private readonly _entries: RowEntry[] = [];

  private _items: readonly ListItem[];
  private _selectedIds: readonly string[];

  public constructor(opts: ListComponentPreset = {}) {
    super();

    this._width = opts.width ?? 240;
    this._itemHeight = opts.itemHeight ?? 36;
    this._padding = opts.padding ?? 0;
    this._variant = opts.variant ?? "text";
    this._selectionMode = opts.selectionMode ?? "none";
    this._radius = opts.radius ?? 0;
    this._fillColor = opts.fillColor ?? 0x111827;
    this._fillAlpha = opts.fillAlpha ?? 1;
    this._hoverColor = opts.hoverColor ?? 0x374151;
    this._selectedColor = opts.selectedColor ?? 0x4338ca;
    this._borderColor = opts.borderColor ?? 0x475569;
    this._borderWidth = opts.borderWidth ?? 0;
    this._imageSize = opts.imageSize ?? 24;
    this._imagePadding = opts.imagePadding ?? 8;
    this._labelStyle = { ...DEFAULT_LABEL_STYLE, ...opts.labelStyle };
    this._textPadding = opts.textPadding ?? 12;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._items = opts.items ?? [];
    this._selectedIds = this._normalizeSelection(this._filterKnownIds(opts.selectedIds ?? [], this._items));

    const layout: Omit<LayoutOptions, "target"> = {
      flexDirection: "column",
      gap: opts.itemGap ?? 0,
      padding: this._padding,
      width: this._width,
      alignItems: "stretch",
      justifyContent: "flex-start",
    };
    this.layout = layout;

    this._rebuildRows();
  }

  /** Current items list. */
  public get items(): readonly ListItem[] {
    return this._items;
  }

  /** Current selection (always an empty array in `"none"` selection mode). */
  public get selectedIds(): readonly string[] {
    return this._selectedIds;
  }

  /** Items currently in the selection set, in items order. */
  public get selectedItems(): readonly ListItem[] {
    if (this._selectedIds.length === 0) return [];
    const idSet = new Set(this._selectedIds);
    return this._items.filter((it) => idSet.has(it.id));
  }

  /** Active selection mode (constructor-only). */
  public get selectionMode(): ListSelectionMode {
    return this._selectionMode;
  }

  /** Active item variant (constructor-only). */
  public get variant(): ListItemVariant {
    return this._variant;
  }

  /**
   * Replace the items list. Selection is filtered to ids that still
   * exist; removed-then-re-added items keep their selection state if
   * the id matches. No `onChange` is fired.
   */
  public setItems(items: readonly ListItem[]): void {
    this._items = items;
    this._selectedIds = this._normalizeSelection(this._filterKnownIds(this._selectedIds, items));
    this._rebuildRows();
  }

  /**
   * Set the selection programmatically. The input is normalized for
   * the active selection mode (clamped to one id in `"single"`,
   * forced empty in `"none"`) and filtered to known item ids. Does
   * NOT fire `onChange`.
   */
  public setSelectedIds(ids: readonly string[]): void {
    const next = this._normalizeSelection(this._filterKnownIds(ids, this._items));
    if (this._sameSelection(next, this._selectedIds)) return;
    this._selectedIds = next;
    this._syncRowVisuals();
  }

  /**
   * Resolve each item's `textureId` against the asset manager and
   * apply the loaded texture to the row's sprite. Items that already
   * carry a `texture` are left alone; items with neither `texture`
   * nor `textureId` keep an empty sprite. Safe to call multiple times.
   */
  public resolveAssets(assetManager: IAssetManager): void {
    for (const entry of this._entries) {
      const sprite = entry.sprite;
      if (!sprite) continue;
      if (entry.item.texture !== undefined) continue;
      const id = entry.item.textureId;
      if (id === undefined) continue;
      const texture = assetManager.getAsset<PIXI.Texture>(id);
      if (texture) sprite.texture = texture;
    }
  }

  /** Subscribe to user-driven selection changes (single / multi modes only). */
  public onChange(cb: (selectedIds: readonly string[], selectedItems: readonly ListItem[]) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  /** Subscribe to user taps on any row. Fires for every mode, including `"none"`. */
  public onItemPress(cb: (id: string, item: ListItem) => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override destroy(opts?: PIXI.DestroyOptions): void {
    this._entries.length = 0;
    this._changeListeners.clear();
    this._pressListeners.clear();
    super.destroy(opts);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _filterKnownIds(ids: readonly string[], items: readonly ListItem[]): readonly string[] {
    if (ids.length === 0) return ids;
    const known = new Set(items.map((it) => it.id));
    return ids.filter((id) => known.has(id));
  }

  private _normalizeSelection(ids: readonly string[]): readonly string[] {
    if (this._selectionMode === "none") return [];
    if (this._selectionMode === "single") return ids.length > 0 ? [ids[0]!] : [];
    return ids;
  }

  private _sameSelection(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) return false;
    const aSet = new Set(a);
    for (const id of b) if (!aSet.has(id)) return false;
    return true;
  }

  private _rebuildRows(): void {
    for (const entry of this._entries) {
      entry.row.removeFromParent();
      entry.row.destroy({ children: true });
    }
    this._entries.length = 0;

    for (const item of this._items) {
      const entry = this._createRow(item);
      this.addChild(entry.row);
      this._entries.push(entry);
    }
    this._syncRowVisuals();
  }

  private _createRow(item: ListItem): RowEntry {
    const w = this._width - this._padding * 2;
    const h = this._itemHeight;
    const row = new PIXI.Container();
    row.layout = { width: w, height: h };
    row.eventMode = "static";
    row.cursor = "pointer";
    // Explicit hit rect so the entire row catches hover / tap, not
    // just the bounds of whichever child happens to be drawn.
    row.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const bg = new PIXI.Graphics();
    bg.eventMode = "none";
    row.addChild(bg);

    let sprite: PIXI.Sprite | null = null;
    let text: PIXI.Text | null = null;

    if (this._variant === "image" || this._variant === "text+image") {
      sprite = new PIXI.Sprite(item.texture ?? PIXI.Texture.EMPTY);
      sprite.eventMode = "none";
      sprite.anchor.set(0.5);
      sprite.width = this._imageSize;
      sprite.height = this._imageSize;
      const cy = h / 2;
      const cx = this._variant === "image" ? w / 2 : this._imagePadding + this._imageSize / 2;
      sprite.position.set(cx, cy);
      row.addChild(sprite);
    }

    if (this._variant === "text" || this._variant === "text+image") {
      text = new PIXI.Text({ text: item.label ?? "", style: this._labelStyle });
      text.eventMode = "none";
      text.anchor.set(0, 0.5);
      const x = this._variant === "text" ? this._textPadding : this._imagePadding + this._imageSize + this._imagePadding;
      text.position.set(x, h / 2);
      row.addChild(text);
    }

    row.on("pointerover", () => this._onRowPointerOver(item));
    row.on("pointerout", () => this._onRowPointerOut(item));
    row.on("pointertap", () => this._handleItemTap(item));

    return { item, row, bg, sprite, text };
  }

  private _onRowPointerOver(item: ListItem): void {
    if (this._isSelected(item.id)) return;
    const entry = this._entries.find((e) => e.item.id === item.id);
    if (!entry) return;
    this._paintRow(entry.bg, this._hoverColor);
  }

  private _onRowPointerOut(item: ListItem): void {
    const entry = this._entries.find((e) => e.item.id === item.id);
    if (!entry) return;
    const color = this._isSelected(item.id) ? this._selectedColor : this._fillColor;
    this._paintRow(entry.bg, color);
  }

  private _isSelected(id: string): boolean {
    return this._selectedIds.includes(id);
  }

  private _paintRow(bg: PIXI.Graphics, color: number): void {
    const w = this._width - this._padding * 2;
    const h = this._itemHeight;
    bg.clear();
    if (this._radius > 0) {
      bg.roundRect(0, 0, w, h, this._radius);
    } else {
      bg.rect(0, 0, w, h);
    }
    bg.fill({ color, alpha: this._fillAlpha });
    if (this._borderWidth > 0) {
      bg.stroke({ color: this._borderColor, width: this._borderWidth });
    }
  }

  private _syncRowVisuals(): void {
    const idSet = new Set(this._selectedIds);
    for (const entry of this._entries) {
      const color = idSet.has(entry.item.id) ? this._selectedColor : this._fillColor;
      this._paintRow(entry.bg, color);
    }
  }

  private _handleItemTap(item: ListItem): void {
    let nextSelection: readonly string[] = this._selectedIds;
    let changed = false;

    if (this._selectionMode === "single") {
      if (this._selectedIds[0] !== item.id) {
        nextSelection = [item.id];
        changed = true;
      }
    } else if (this._selectionMode === "multi") {
      const set = new Set(this._selectedIds);
      if (set.has(item.id)) set.delete(item.id);
      else set.add(item.id);
      nextSelection = Array.from(set);
      changed = true;
    }

    if (changed) {
      this._selectedIds = nextSelection;
      this._syncRowVisuals();
      const items = this.selectedItems;
      for (const cb of this._changeListeners) cb(nextSelection, items);
    }

    for (const cb of this._pressListeners) cb(item.id, item);
  }
}
