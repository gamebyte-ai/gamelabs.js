import type { Unsubscribe } from "gamelabsjs";

export class GameEvents {
  private readonly changeCubeColorListeners = new Set<(hex: number) => void>();
  private readonly toggleCubeRotationListeners = new Set<() => void>();

  onChangeCubeColor(cb: (hex: number) => void): Unsubscribe {
    this.changeCubeColorListeners.add(cb);
    return () => {
      this.changeCubeColorListeners.delete(cb);
    };
  }

  emitChangeCubeColor(hex: number): void {
    for (const cb of this.changeCubeColorListeners) cb(hex);
  }

  onToggleCubeRotation(cb: () => void): Unsubscribe {
    this.toggleCubeRotationListeners.add(cb);
    return () => {
      this.toggleCubeRotationListeners.delete(cb);
    };
  }

  emitToggleCubeRotation(): void {
    for (const cb of this.toggleCubeRotationListeners) cb();
  }
}

