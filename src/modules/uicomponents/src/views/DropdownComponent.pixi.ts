import type { DestroyOptions, NineSliceSprite, Sprite, Text } from "pixi.js";
import { Container, Graphics, Rectangle } from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { TextStyle } from "../../../../core/styles/TextStyle.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { DropdownComponentStyle } from "../UIComponentsStyleTypes.js";

export type DropdownItem = {
  /** Unique identifier for this option. Used by `selectedId` / `setSelectedId`. */
  readonly id: string;
  /** Display label shown in the list and (when selected) in the header. */
  readonly label: string;
};

/**
 * Geometry / content options for a {@link DropdownComponent}. Visual
 * styling lives on the {@link DropdownComponentStyle} passed alongside
 * the asset manager and is owned by the framework's `StyleManager`.
 */
export type DropdownComponentOpts = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Header width. @default 160 */
  width?: number;
  /** Header height. @default 36 */
  height?: number;
  /** Text shown in the header when nothing is selected. @default "Select…" */
  placeholder?: string;
  /** Items to choose from. May also be set later with `setItems()`. */
  items?: readonly DropdownItem[];
  /** Initial selection. Must match an item id; ignored otherwise. */
  selectedId?: string;
  /** Per-item row height. @default 32 */
  itemHeight?: number;
  /** Vertical gap between header bottom and list top, in pixels. @default 4 */
  listOffset?: number;
};

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 36;
const DEFAULT_ITEM_HEIGHT = 32;
const DEFAULT_LIST_OFFSET = 4;
const DEFAULT_PLACEHOLDER = "Select…";

const SCRIM_EXTENT = 1_000_000;
/**
 * zIndex applied to the overlay scrim and list so they paint above
 * any sibling layers when the host root uses `sortableChildren`. A
 * deliberately huge value beats common HUD layer zIndexes (typically
 * single digits).
 */
const OVERLAY_Z_INDEX = 1_000_000;

/** Padding from header / item left edge to the label text. */
const LABEL_PADDING = 12;
/** Padding from the header right edge to the chevron. */
const CHEVRON_PADDING = 12;
/** Square render size of the chevron icon. */
const CHEVRON_SIZE = 12;

type ItemState = "idle" | "hover" | "selected";

/**
 * Reusable dropdown / select component, themed via the framework's
 * style system. Construction takes an `AssetManager`, a
 * {@link DropdownComponentStyle}, and geometry / content opts:
 *
 * ```ts
 * const dropdownStyle = this.styleManager.resolve<DropdownComponentStyle>(
 *   UIComponentsStyleIds.Dropdown,
 * );
 * const dropdown = new DropdownComponent(this.assetLoader, dropdownStyle, {
 *   width: 200,
 *   items: [{ id: "easy", label: "Easy" }, { id: "hard", label: "Hard" }],
 * });
 * dropdown.onChange((id, item) => console.log("picked:", id, item.label));
 * ```
 *
 * - The header is a textured sprite (resolved `header` slot) carrying
 *   the selected label (or placeholder) plus a chevron icon. Tap the
 *   header to toggle the list.
 * - The chevron is a single texture rotated 180° at runtime when the
 *   list is open — designers ship a baseline downward arrow, the
 *   component handles the open-state flip.
 * - The list bg is a separate textured sprite (`list` slot) that wraps
 *   stacked item rows; each row's background is the resolved
 *   `itemIdle` / `itemHover` / `itemSelected` sprite — texture swaps
 *   on hover and on selection.
 * - When opened, the option list is re-parented to the scene root,
 *   given a high `zIndex`, and the root is forced to
 *   `sortableChildren = true` so the list paints above any HUD layers.
 *   A transparent scrim sits between the list and the rest of the
 *   scene to capture taps-outside and close the dropdown.
 * - `onChange(cb)` returns an `Unsubscribe` and fires only on user
 *   selections — programmatic `setSelectedId` is silent.
 *
 * Limitation: the list is positioned once at open time using the
 * dropdown's current global transform. Moving the dropdown while open
 * does not reposition the list — close and re-open if the dropdown's
 * world transform changes. Parent scale / rotation is not propagated
 * to the re-parented list.
 */
export class DropdownComponent extends StyledHudObject<DropdownComponentStyle> {
  private readonly _header: Sprite | NineSliceSprite;
  private readonly _label: Text;
  private readonly _chevron: Sprite | NineSliceSprite;
  private readonly _list: Container;
  private readonly _listBg: Sprite | NineSliceSprite;
  private readonly _itemRows: Array<{ container: Container; bg: Sprite | NineSliceSprite; text: Text }> = [];
  private readonly _changeListeners = new Set<(id: string, item: DropdownItem) => void>();

  private readonly _headerStyle: SpriteStyle | undefined;
  private readonly _listStyle: SpriteStyle | undefined;
  private readonly _itemStyles: Record<ItemState, SpriteStyle | undefined>;
  private readonly _chevronStyle: SpriteStyle | undefined;
  private readonly _labelStyle: TextStyle | undefined;

  private readonly _width: number;
  private readonly _height: number;
  private readonly _placeholder: string;
  private readonly _itemHeight: number;
  private readonly _listOffset: number;

  private _items: readonly DropdownItem[];
  private _selectedId: string | null;
  private _isOpen = false;
  private _scrim: Graphics | null = null;
  private _listOverlayParent: Container | null = null;

  public constructor(assetManager: AssetManager, style: DropdownComponentStyle, opts: DropdownComponentOpts = {}) {
    super(assetManager, style);

    this._width = opts.width ?? DEFAULT_WIDTH;
    this._height = opts.height ?? DEFAULT_HEIGHT;
    this._placeholder = opts.placeholder ?? DEFAULT_PLACEHOLDER;
    this._itemHeight = opts.itemHeight ?? DEFAULT_ITEM_HEIGHT;
    this._listOffset = opts.listOffset ?? DEFAULT_LIST_OFFSET;
    this._items = opts.items ?? [];
    this._selectedId = this._resolveInitialSelection(opts.selectedId, this._items);

    this._headerStyle = style.header;
    this._listStyle = style.list;
    this._itemStyles = {
      idle: style.itemIdle,
      hover: style.itemHover,
      selected: style.itemSelected,
    };
    this._chevronStyle = style.chevron;
    this._labelStyle = style.label;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    // Header bg (texture-driven) — replaces the legacy roundRect Graphics.
    this._header = this._buildStyledSprite(this._headerStyle, this._width, this._height);
    this._header.anchor.set(0, 0);
    this._header.position.set(0, 0);
    this._header.eventMode = "static";
    this._header.cursor = "pointer";
    this._header.on("pointertap", () => this.toggle());
    this.addChild(this._header);

    // Header label.
    this._label = this._buildStyledText(this._computeHeaderLabel(), this._labelStyle);
    this._label.anchor.set(0, 0.5);
    this._label.position.set(LABEL_PADDING, this._height / 2);
    this.addChild(this._label);

    // Chevron sprite — anchored at centre so 180° rotation pivots in
    // place when the list opens / closes.
    this._chevron = this._buildStyledSprite(this._chevronStyle, CHEVRON_SIZE, CHEVRON_SIZE);
    this._chevron.anchor.set(0.5, 0.5);
    this._chevron.position.set(this._width - CHEVRON_PADDING - CHEVRON_SIZE / 2, this._height / 2);
    this._chevron.eventMode = "none";
    this.addChild(this._chevron);

    // List container (hidden by default).
    this._list = new Container();
    this._list.visible = false;
    this._list.eventMode = "static";
    this.addChild(this._list);

    // List bg — placeholder size; resized in `_rebuildList` once the
    // item count is known. Using slot dim 1 here would feed
    // `_buildStyledSprite` a degenerate size; pre-feed the header
    // width so the texture is at least correctly proportioned even if
    // the list is empty.
    this._listBg = this._buildStyledSprite(this._listStyle, this._width, this._itemHeight);
    this._listBg.anchor.set(0, 0);
    this._listBg.position.set(0, 0);
    // Absorb pointer events so clicks at the rounded corners (where no
    // item row sits) don't fall through to the scrim and close the
    // dropdown unexpectedly.
    this._listBg.eventMode = "static";
    this._list.addChild(this._listBg);

    this._rebuildList();
  }

  /** The id of the selected item, or `null` when nothing is selected. */
  public get selectedId(): string | null {
    return this._selectedId;
  }

  /** The selected item, or `null` when nothing is selected. */
  public get selectedItem(): DropdownItem | null {
    if (this._selectedId === null) return null;
    return this._items.find((it) => it.id === this._selectedId) ?? null;
  }

  /** Whether the option list is currently open. */
  public get isOpen(): boolean {
    return this._isOpen;
  }

  /** Current items list. */
  public get items(): readonly DropdownItem[] {
    return this._items;
  }

  /**
   * Replace the items list. If the previously selected id is no
   * longer present, the selection is cleared (silently — no
   * `onChange` is fired).
   */
  public setItems(items: readonly DropdownItem[]): void {
    this._items = items;
    if (this._selectedId !== null && !items.some((it) => it.id === this._selectedId)) {
      this._selectedId = null;
    }
    this._label.text = this._computeHeaderLabel();
    this._rebuildList();
  }

  /**
   * Set the selection programmatically. Pass `null` to clear. No-op if
   * the id doesn't match any current item. Does NOT fire `onChange`.
   */
  public setSelectedId(id: string | null): void {
    if (id === this._selectedId) return;
    if (id !== null && !this._items.some((it) => it.id === id)) return;
    this._selectedId = id;
    this._label.text = this._computeHeaderLabel();
    this._rebuildList();
  }

  /** Open the option list. No-op if already open or items list is empty. */
  public open(): void {
    if (this._isOpen || this._items.length === 0) return;
    this._isOpen = true;
    this._list.visible = true;
    this._installOverlay();
    this._refreshChevronRotation();
  }

  /** Close the option list. No-op if already closed. */
  public close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._list.visible = false;
    this._removeOverlay();
    this._refreshChevronRotation();
  }

  /** Flip open ↔ closed. */
  public toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  /** Subscribe to user selections. Returns an unsubscribe function. */
  public onChange(cb: (id: string, item: DropdownItem) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override destroy(opts?: DestroyOptions): void {
    if (this._isOpen) this.close();
    this._changeListeners.clear();
    super.destroy(opts);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _resolveInitialSelection(id: string | undefined, items: readonly DropdownItem[]): string | null {
    if (id === undefined) return null;
    return items.some((it) => it.id === id) ? id : null;
  }

  private _computeHeaderLabel(): string {
    const sel = this.selectedItem;
    return sel ? sel.label : this._placeholder;
  }

  private _refreshChevronRotation(): void {
    // Chevron's baseline texture points down. Flip 180° when the list
    // opens so it points up — single asset covers both states.
    this._chevron.rotation = this._isOpen ? Math.PI : 0;
  }

  private _rebuildList(): void {
    for (const row of this._itemRows) {
      row.container.removeFromParent();
      row.container.destroy({ children: true });
    }
    this._itemRows.length = 0;

    const w = this._width;
    const ih = this._itemHeight;
    const totalH = this._items.length * ih;

    // Resize the list bg to the new total height. NineSliceSprite (or
    // plain Sprite) handles the resize cleanly via partial-apply.
    this._applyPartialSpriteStyle(this._listBg, this._listStyle, w, Math.max(1, totalH));

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]!;
      const row = this._createItemRow(item, i);
      this._list.addChild(row.container);
      this._itemRows.push(row);
    }
  }

  private _createItemRow(item: DropdownItem, index: number): { container: Container; bg: Sprite | NineSliceSprite; text: Text } {
    const w = this._width;
    const ih = this._itemHeight;
    const container = new Container();
    container.position.set(0, index * ih);
    container.eventMode = "static";
    container.cursor = "pointer";
    // A bare Container with `eventMode: static` but no `hitArea`
    // defers hit testing to interactive children — the row's bg has
    // `eventMode: none`, so without this only the text bounds catch
    // pointer events. Defining the hit rect here makes the entire
    // row react to hover and tap.
    container.hitArea = new Rectangle(0, 0, w, ih);

    const isSelected = this._selectedId === item.id;
    const initialState: ItemState = isSelected ? "selected" : "idle";
    const bg = this._buildStyledSprite(this._itemStyles[initialState], w, ih);
    bg.anchor.set(0, 0);
    bg.position.set(0, 0);
    bg.eventMode = "none";
    container.addChild(bg);

    const text = this._buildStyledText(item.label, this._labelStyle);
    text.anchor.set(0, 0.5);
    text.position.set(LABEL_PADDING, ih / 2);
    container.addChild(text);

    const setState = (state: ItemState): void => {
      this._applyPartialSpriteStyle(bg, this._itemStyles[state], w, ih);
    };
    container.on("pointerover", () => {
      if (this._selectedId !== item.id) setState("hover");
    });
    container.on("pointerout", () => {
      setState(this._selectedId === item.id ? "selected" : "idle");
    });
    container.on("pointertap", () => this._handleItemSelect(item));

    return { container, bg, text };
  }

  private _handleItemSelect(item: DropdownItem): void {
    const changed = this._selectedId !== item.id;
    if (changed) {
      this._selectedId = item.id;
      this._label.text = this._computeHeaderLabel();
      this._rebuildList();
    }
    this.close();
    if (changed) {
      for (const cb of this._changeListeners) cb(item.id, item);
    }
  }

  private _installOverlay(): void {
    const root = this._findRoot();
    if (!root) {
      // Detached from the scene — keep list inline. Caller is
      // responsible for z-order in this fallback path.
      this._list.position.set(0, this._height + this._listOffset);
      return;
    }

    // Position list in root's coords so it sits just below the header.
    const headerBottomGlobal = this.toGlobal({ x: 0, y: this._height + this._listOffset });
    const headerBottomLocal = root.toLocal(headerBottomGlobal);
    this._list.position.set(headerBottomLocal.x, headerBottomLocal.y);

    // Scrim sits behind the list; tapping it (anywhere outside the
    // list's hit bounds) closes the dropdown.
    const scrim = new Graphics();
    scrim.rect(-SCRIM_EXTENT, -SCRIM_EXTENT, SCRIM_EXTENT * 2, SCRIM_EXTENT * 2).fill({ color: 0x000000, alpha: 0.001 });
    scrim.eventMode = "static";
    scrim.on("pointertap", () => this.close());

    // Force the root to sort children so our high zIndex actually wins.
    // Hosts that mount UI through HUD layers (or any other zIndex-based
    // stacking) would otherwise paint over our overlay because the
    // re-parented list lands at zIndex 0.
    root.sortableChildren = true;
    scrim.zIndex = OVERLAY_Z_INDEX;
    this._list.zIndex = OVERLAY_Z_INDEX + 1;

    root.addChild(scrim);
    root.addChild(this._list);
    this._scrim = scrim;
    this._listOverlayParent = root;
  }

  private _removeOverlay(): void {
    if (this._scrim) {
      this._scrim.removeFromParent();
      this._scrim.destroy();
      this._scrim = null;
    }
    if (this._listOverlayParent) {
      this._list.position.set(0, this._height + this._listOffset);
      this.addChild(this._list);
      this._listOverlayParent = null;
    }
  }

  private _findRoot(): Container | null {
    if (!this.parent) return null;
    let node: Container = this.parent;
    while (node.parent) node = node.parent;
    return node;
  }
}
