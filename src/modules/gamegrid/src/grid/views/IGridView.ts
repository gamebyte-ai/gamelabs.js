import type { IView } from "../../../../../core/views/IView.js";
import type { BaseGridPreset } from "../models/BaseGridPreset.js";
import type { Vector3 } from "../models/Vector3.js";
import type { GridItemObjectOptions } from "./GridItemObject.js";

export type AddGridData = {
  id: number;
  position: Vector3;
  rotation: Vector3;
  preset: BaseGridPreset;
};

export interface IGridView extends IView {
  addGrid(data: AddGridData): void;
  removeGrid(gridId: number): void;
  updateGridPosition(gridId: number, position: Vector3): void;
  updateGridRotation(gridId: number, rotation: Vector3): void;
  createItem(itemOptions: GridItemObjectOptions, gridId: number, col: number, row: number): void;
  moveItem(itemId: number, gridId: number, col: number, row: number, toGridId: number, toCol: number, toRow: number): void;
  destroyItem(itemId: number, gridId: number, col: number, row: number): void;
}
