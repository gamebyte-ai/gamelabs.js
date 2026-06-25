import { Group } from "three";
import type { IPointerInputHandler } from "../input/IPointerInputHandler.js";
import type { IWorldPointerInput } from "./IWorldPointerInput.js";

export class WorldInteractiveObject extends Group {
  //  MEMBERS
  private _isPointerInputHandlerCached: boolean | null = null;
  private _worldPointerInput: IWorldPointerInput | null = null;
  private _isPointerListener: boolean = false;

  // Optional pointer handler methods. Subclasses that define all four
  // are automatically registered with the world pointer input subsystem
  // when added to the scene graph. Declared here so the duck-type check
  // below is type-safe (no `as any` needed).
  onPointerDown?(event: PointerEvent, onThisObject: boolean): void;
  onPointerMove?(event: PointerEvent, onThisObject: boolean): void;
  onPointerUp?(event: PointerEvent, onThisObject: boolean): void;
  onPointerCancel?(event: PointerEvent): void;

  //  CONSTRUCTOR
  public constructor() {
    super();
    this.addEventListener("added", this.onAdded);
    this.addEventListener("removed", this.onRemoved);
  }

  //  PROPERTIES
  public get worldPointerInput(): IWorldPointerInput | null {
    return this._worldPointerInput;
  }

  public get isPointerInputHandler(): boolean {
    if (this._isPointerInputHandlerCached === null) {
      this._isPointerInputHandlerCached =
        typeof this.onPointerDown === "function" &&
        typeof this.onPointerMove === "function" &&
        typeof this.onPointerUp === "function" &&
        typeof this.onPointerCancel === "function";
    }
    return this._isPointerInputHandlerCached;
  }

  //  METHODS
  protected setWorldPointerInput(worldPointerInput: IWorldPointerInput | null): void {
    if (this._worldPointerInput === null && worldPointerInput !== null) {
      this._worldPointerInput = worldPointerInput;
      if (this._isPointerListener) {
        this._worldPointerInput.addPointerHandler(this as unknown as IPointerInputHandler);
      }
    }
  }

  public destroy(): void {
    this.removeEventListener("added", this.onAdded);
    this.removeEventListener("removed", this.onRemoved);
  }

  private onAdded(_event: object): void {
    if (this.isPointerInputHandler) {
      this._isPointerListener = true;
      this._worldPointerInput?.addPointerHandler(this as unknown as IPointerInputHandler);
    }
  }

  private onRemoved(_event: object): void {
    if (this._isPointerListener) {
      this._isPointerListener = false;
      this._worldPointerInput?.removePointerHandler(this as unknown as IPointerInputHandler);
    }
  }
}
