import type { IView } from "../../../../core/views/IView.js";
import type { Vector3 } from "../types/Vector3.js";
import type { GridPreset } from "../models/GridPreset.js";
import type { GridItem } from "../models/GridItem.js";

export type AddGridData = {
  id: number;
  columnCount: number;
  rowCount: number;
  position: Vector3;
  rotation: Vector3;
  preset?: GridPreset;
};

export interface IGridView extends IView {
  addGrid(data: AddGridData): void;
  removeGrid(gridId: number): void;
  updateGridPosition(gridId: number, position: Vector3): void;
  updateGridRotation(gridId: number, rotation: Vector3): void;
  updateCellItem(gridId: number, col: number, row: number, item: GridItem | null): void;
}
