export interface IPointerInputHandler {
  onPointerDown(event: PointerEvent, onThisObject: boolean): void;
  onPointerMove(event: PointerEvent, onThisObject: boolean): void;
  onPointerUp(event: PointerEvent, onThisObject: boolean): void;
  onPointerCancel(event: PointerEvent): void;
}
