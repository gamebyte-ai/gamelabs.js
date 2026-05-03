import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { TextStyle } from "../../../../core/styles/TextStyle.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ListComponentStyle } from "../UIComponentsStyleTypes.js";

export type ListSelectionMode = "none" | "single" | "multi";

export type ListItemVariant = "text" | "text+image" | "image";

export type ListItem<T = unknown> = {
  /** Unique identifier for this row. Used by `selectedIds` / `setSelectedIds`. */
  readonly id: string;
  /** Label text. Used by the `"text"` and `"text+image"` variants. */
  readonly label?: string;
  /**
   * Asset id resolved to a `PIXI.Texture` via the asset manager at row-
   * construction time. Used by the `"image"` and `"text+image"` variants.
   * Throws if the id is not loaded — register the texture before
   * constructing or calling `setItems`.
   */
  readonly textureId?: string;
  /**
   * Pre-resolved texture (alternative to `textureId`). When both are
   * present, `texture` wins so callers can override resolution.
   */
  readonly texture?: PIXI.Texture;
  /**
   * Caller-defined payload carried with the row. The type parameter
   * `T` threads through `setItems` / `selectedItems` / `onChange` /
   * `onItemPress` so games can attach typed data (inventory metadata,
   * difficulty tier, etc.) without external bookkeeping. The list
   * never reads or renders `data` — it's opaque to the component.
   */
  readonly data?: T;
};

/**
 * Geometry / content options for a {@link ListComponent}. Visual
 * styling for the row backgrounds + label text lives on the
 * {@link ListComponentStyle} passed alongside the asset manager and is
 * owned by the framework's `StyleManager`.
 */
export type ListComponentOpts<T = unknown> = {
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
  items?: readonly ListItem<T>[];
  /** Initial selection. Filtered to known item ids and the active selection mode. */
  selectedIds?: readonly string[];
  /** Square image size in pixels. Used by `"image"` / `"text+image"` variants. @default 24 */
  imageSize?: number;
  /** Padding around the image inside its row slot. @default 8 */
  imagePadding?: number;
  /** Left padding for the label in the `"text"` variant. @default 12 */
  textPadding?: number;
};

const DEFAULT_WIDTH = 240;
const DEFAULT_ITEM_HEIGHT = 36;
const DEFAULT_ITEM_GAP = 0;
const DEFAULT_PADDING = 0;
const DEFAULT_VARIANT: ListItemVariant = "text";
const DEFAULT_SELECTION_MODE: ListSelectionMode = "none";
const DEFAULT_IMAGE_SIZE = 24;
const DEFAULT_IMAGE_PADDING = 8;
const DEFAULT_TEXT_PADDING = 12;

type RowState = "idle" | "hover" | "selected";

type RowEntry<T> = {
  item: ListItem<T>;
  row: PIXI.Container;
  bg: PIXI.Sprite | PIXI.NineSliceSprite;
  sprite: PIXI.Sprite | null;
  text: PIXI.Text | null;
};

/**
 * Reusable list / picker component, themed via the framework's style
 * system. Construction takes an `AssetManager`, a
 * {@link ListComponentStyle}, and geometry / content opts:
 *
 * ```ts
 * const listStyle = this.styleManager.resolve<ListComponentStyle>(
 *   UIComponentsStyleIds.List,
 * );
 * const list = new ListComponent(this.assetLoader, listStyle, {
 *   width: 240,
 *   variant: "text",
 *   selectionMode: "single",
 *   items: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }],
 * });
 * list.onChange((ids, items) => console.log("selected:", ids));
 * ```
 *
 * - Renders one row per item in a single column. Item layout is one of
 *   three variants: `"text"`, `"text+image"`, or `"image"`. Picking the
 *   variant up front keeps the row geometry (and hit area) stable.
 * - Each row's background is a textured sprite — texture swaps between
 *   the resolved `itemIdle` / `itemHover` / `itemSelected` slots on
 *   pointer transitions and selection changes.
 * - Selection is opt-in: `"none"` makes rows behave like buttons (only
 *   `onItemPress` fires); `"single"` enforces mutual exclusion;
 *   `"multi"` toggles each row in or out of a set. Programmatic
 *   `setSelectedIds()` is silent — `onChange` only fires on user-driven
 *   selection changes.
 * - Sets its own `.layout` (a flex column with the configured `width`,
 *   `padding`, `itemGap`, `alignItems: "stretch"`) so it nests inside
 *   other `@pixi/layout` flex flows. The component does NOT scroll on
 *   its own — wrap it in a `ScrollViewComponent` when the row count
 *   exceeds the visible area.
 *
 * Per-item content textures (variants `"image"` / `"text+image"`):
 * items can carry either a pre-resolved {@link ListItem.texture} or a
 * {@link ListItem.textureId}. The constructor (and `setItems()`)
 * resolves textureIds eagerly through the asset manager — both must be
 * loaded before the component renders.
 */
export class ListComponent<T = unknown> extends StyledHudObject<ListComponentStyle> {
  private readonly _width: number;
  private readonly _itemHeight: number;
  private readonly _padding: number;
  private readonly _variant: ListItemVariant;
  private readonly _selectionMode: ListSelectionMode;
  private readonly _imageSize: number;
  private readonly _imagePadding: number;
  private readonly _textPadding: number;

  private readonly _itemStyles: Record<RowState, SpriteStyle | undefined>;
  private readonly _resolvedLabelStyle: TextStyle | undefined;

  private readonly _changeListeners = new Set<(selectedIds: readonly string[], selectedItems: readonly ListItem<T>[]) => void>();
  private readonly _pressListeners = new Set<(id: string, item: ListItem<T>) => void>();
  private readonly _entries: RowEntry<T>[] = [];

  private _items: readonly ListItem<T>[];
  private _selectedIds: readonly string[];

  public constructor(assetManager: AssetManager, style: ListComponentStyle, opts: ListComponentOpts<T> = {}) {
    super(assetManager, style);

    this._width = opts.width ?? DEFAULT_WIDTH;
    this._itemHeight = opts.itemHeight ?? DEFAULT_ITEM_HEIGHT;
    this._padding = opts.padding ?? DEFAULT_PADDING;
    this._variant = opts.variant ?? DEFAULT_VARIANT;
    this._selectionMode = opts.selectionMode ?? DEFAULT_SELECTION_MODE;
    this._imageSize = opts.imageSize ?? DEFAULT_IMAGE_SIZE;
    this._imagePadding = opts.imagePadding ?? DEFAULT_IMAGE_PADDING;
    this._textPadding = opts.textPadding ?? DEFAULT_TEXT_PADDING;

    this._itemStyles = {
      idle: style.itemIdle,
      hover: style.itemHover,
      selected: style.itemSelected,
    };
    this._resolvedLabelStyle = style.label;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._items = opts.items ?? [];
    this._selectedIds = this._normalizeSelection(this._filterKnownIds(opts.selectedIds ?? [], this._items));

    const layout: Omit<LayoutOptions, "target"> = {
      flexDirection: "column",
      gap: opts.itemGap ?? DEFAULT_ITEM_GAP,
      padding: this._padding,
      width: this._width,
      alignItems: "stretch",
      justifyContent: "flex-start",
    };
    this.layout = layout;

    this._rebuildRows();
  }

  /** Current items list. */
  public get items(): readonly ListItem<T>[] {
    return this._items;
  }

  /** Current selection (always an empty array in `"none"` selection mode). */
  public get selectedIds(): readonly string[] {
    return this._selectedIds;
  }

  /** Items currently in the selection set, in items order. */
  public get selectedItems(): readonly ListItem<T>[] {
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
   * the id matches. Eagerly resolves any per-item `textureId` via the
   * asset manager. No `onChange` is fired.
   */
  public setItems(items: readonly ListItem<T>[]): void {
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

  /** Subscribe to user-driven selection changes (single / multi modes only). */
  public onChange(cb: (selectedIds: readonly string[], selectedItems: readonly ListItem<T>[]) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  /** Subscribe to user taps on any row. Fires for every mode, including `"none"`. */
  public onItemPress(cb: (id: string, item: ListItem<T>) => void): Unsubscribe {
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

  private _filterKnownIds(ids: readonly string[], items: readonly ListItem<T>[]): readonly string[] {
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
  }

  private _createRow(item: ListItem<T>): RowEntry<T> {
    const w = this._width - this._padding * 2;
    const h = this._itemHeight;
    const row = new PIXI.Container();
    row.layout = { width: w, height: h };
    row.eventMode = "static";
    row.cursor = "pointer";
    // Explicit hit rect so the entire row catches hover / tap, not
    // just the bounds of whichever child happens to be drawn.
    row.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const isSelected = this._isSelected(item.id);
    const initialState: RowState = isSelected ? "selected" : "idle";
    const bg = this._buildStyledSprite(this._itemStyles[initialState], w, h);
    bg.anchor.set(0, 0);
    bg.position.set(0, 0);
    bg.eventMode = "none";
    row.addChild(bg);

    let sprite: PIXI.Sprite | null = null;
    let text: PIXI.Text | null = null;

    if (this._variant === "image" || this._variant === "text+image") {
      // Per-item content texture — pre-resolved `texture` wins; else
      // resolve `textureId` via the base helper (throws on missing).
      const tex = item.texture ?? (item.textureId !== undefined ? this._getTexture(item.textureId) : PIXI.Texture.EMPTY);
      sprite = new PIXI.Sprite(tex);
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
      text = this._buildStyledText(item.label ?? "", this._resolvedLabelStyle);
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

  private _onRowPointerOver(item: ListItem<T>): void {
    if (this._isSelected(item.id)) return;
    const entry = this._entries.find((e) => e.item.id === item.id);
    if (!entry) return;
    this._setRowState(entry, "hover");
  }

  private _onRowPointerOut(item: ListItem<T>): void {
    const entry = this._entries.find((e) => e.item.id === item.id);
    if (!entry) return;
    this._setRowState(entry, this._isSelected(item.id) ? "selected" : "idle");
  }

  private _isSelected(id: string): boolean {
    return this._selectedIds.includes(id);
  }

  private _setRowState(entry: RowEntry<T>, state: RowState): void {
    const w = this._width - this._padding * 2;
    const h = this._itemHeight;
    this._applyPartialSpriteStyle(entry.bg, this._itemStyles[state], w, h);
  }

  private _syncRowVisuals(): void {
    const idSet = new Set(this._selectedIds);
    for (const entry of this._entries) {
      this._setRowState(entry, idSet.has(entry.item.id) ? "selected" : "idle");
    }
  }

  private _handleItemTap(item: ListItem<T>): void {
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
