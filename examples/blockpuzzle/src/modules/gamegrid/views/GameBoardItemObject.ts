import * as THREE from "three";
import type { IAssetManager, IInputManager, RectGridPreset } from "@gamebyte/gamelabsjs";
import { GridItemObject, type IGridObjectListener } from "@gamebyte/gamelabsjs";
import type { PieceCells } from "../../../BlockPuzzleConfig";
import { GameBoardItemObjectOptions } from "./GameBoardItemObjectOptions";

/**
 * Visual for one piece — N coloured blocks laid out according to the
 * piece's shape data, centred on the host cell.
 *
 * The shape comes from `options.pieceType.cells` and the per-block
 * world size from `options.blockSize`, both fed in by
 * `GameBoardsViewController.createItemObjectOption`. Rendering is
 * fully generic: any list of `(col, row)` offsets renders correctly,
 * which is what makes the piece catalog data-driven (a new piece is
 * one entry in `BlockPuzzleConfig.pieceTypes` with no rendering code
 * to update).
 */
export class GameBoardItemObject extends GridItemObject {
  private static readonly BLOCK_Y = 0.05;
  private static readonly BLOCK_INSET = 0.9;

  public declare readonly preset: RectGridPreset;

  public constructor(
    options: GameBoardItemObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager: IAssetManager | null,
  ) {
    super(options, pointerListener, inputManager, assetManager);
  }

  protected override createVisual(): void {
    const options = this._options as GameBoardItemObjectOptions;
    const { width, height } = GameBoardItemObject.computeBbox(options.pieceType.cells);
    const blockSize = options.blockSize;
    const drawSize = blockSize * GameBoardItemObject.BLOCK_INSET;
    const material = new THREE.MeshBasicMaterial({ color: options.color, side: THREE.DoubleSide });

    for (const [col, row] of options.pieceType.cells) {
      // Centre the bounding box on the host cell — the per-block
      // offset is `(index - (extent - 1) / 2) * blockSize` in each
      // axis, which puts a 1×1 piece at (0, 0) and a 3×3 piece
      // symmetrically around the host cell centre.
      const x = (col - (width - 1) / 2) * blockSize;
      const z = (row - (height - 1) / 2) * blockSize;

      const geom = new THREE.PlaneGeometry(drawSize, drawSize);
      const mesh = new THREE.Mesh(geom, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, GameBoardItemObject.BLOCK_Y, z);
      this.add(mesh);
    }
  }

  protected override createCollider(): void {
    // No collider — step 2 has no interaction with pieces.
  }

  /**
   * Bounding box (in cells) that contains all of `cells`. Used to
   * centre the piece visual on its host cell — the per-block offsets
   * derive directly from this.
   */
  private static computeBbox(cells: PieceCells): { readonly width: number; readonly height: number } {
    let maxCol = 0;
    let maxRow = 0;
    for (const [col, row] of cells) {
      if (col > maxCol) maxCol = col;
      if (row > maxRow) maxRow = row;
    }
    return { width: maxCol + 1, height: maxRow + 1 };
  }
}
