import type * as THREE from "three";

export type GroundGridOptions = {
  size?: number;
  divisions?: number;
  color1?: THREE.ColorRepresentation;
  color2?: THREE.ColorRepresentation;
  y?: number;
};

export interface IGroundGrid {
  get isVisible(): boolean;
  setOptions(options: GroundGridOptions): void;
  show(visible: boolean): void;
}

