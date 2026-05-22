import * as THREE from "three";
import type { IAssetManager, IInputManager, RectGridPreset } from "@gamebyte/gamelabsjs";
import { GridCellObject, GridCellObjectOptions, type IGridObjectListener } from "@gamebyte/gamelabsjs";
import type { BoardPalette } from "../../../BlockPuzzleConfig";

/**
 * Static board cell — a flat coloured rectangle with a thin outline,
 * sized to the host grid's cell extents. Non-interactive in step 1
 * (no pieces, no drag).
 *
 * The cell scales naturally to either surface because it reads
 * `preset.columnSize` / `preset.rowSize` — the playing grid uses
 * `BlockPuzzleConfig.gridCellSize`, the tray uses the larger
 * `BlockPuzzleConfig.traySlotSize`, both wired in via the preset.
 */
export class GameBoardCellObject extends GridCellObject {
  private static readonly FILL_Y = 0.005;
  private static readonly OUTLINE_Y = 0.01;
  private static readonly CELL_INSET = 0.92;

  public declare readonly preset: RectGridPreset;

  private readonly _palette: BoardPalette;

  public constructor(
    options: GridCellObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager: IAssetManager | null,
    palette: BoardPalette,
  ) {
    super(options, pointerListener, inputManager, assetManager);
    // The parent constructor invoked `createVisual` before `_palette`
    // landed, so the override is a no-op and we build visuals here.
    this._palette = palette;
    this._buildVisuals();
  }

  protected override createVisual(): void {
    // Deferred — the parent invokes this during super(), too early
    // for our own fields to be initialised. See constructor.
  }

  protected override createCollider(): void {
    // No collider — step 1 has no pointer interaction with cells.
  }

  private _buildVisuals(): void {
    const cw = this.preset.columnSize * GameBoardCellObject.CELL_INSET;
    const ch = this.preset.rowSize * GameBoardCellObject.CELL_INSET;

    const fill = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshBasicMaterial({ color: this._palette.cellFill }));
    fill.rotation.x = -Math.PI / 2;
    fill.position.set(0, GameBoardCellObject.FILL_Y, 0);
    this.add(fill);

    const halfW = cw / 2;
    const halfH = ch / 2;
    const outlineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW, GameBoardCellObject.OUTLINE_Y, -halfH),
      new THREE.Vector3(halfW, GameBoardCellObject.OUTLINE_Y, -halfH),
      new THREE.Vector3(halfW, GameBoardCellObject.OUTLINE_Y, -halfH),
      new THREE.Vector3(halfW, GameBoardCellObject.OUTLINE_Y, halfH),
      new THREE.Vector3(halfW, GameBoardCellObject.OUTLINE_Y, halfH),
      new THREE.Vector3(-halfW, GameBoardCellObject.OUTLINE_Y, halfH),
      new THREE.Vector3(-halfW, GameBoardCellObject.OUTLINE_Y, halfH),
      new THREE.Vector3(-halfW, GameBoardCellObject.OUTLINE_Y, -halfH),
    ]);
    const outline = new THREE.LineSegments(outlineGeom, new THREE.LineBasicMaterial({ color: this._palette.cellOutline }));
    this.add(outline);
  }
}
