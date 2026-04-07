import { ControlAnchor, ControlType, InputMapper, KeyboardListener, OnScreenControlManager, type IInstanceResolver } from "gamelabsjs";
import { GameEvents } from "../events/GameEvents.js";

export class PlayerInputManager {
  private _mapper: InputMapper | null = null;

  public inject(resolver: IInstanceResolver): void {
    const keyboard = resolver.getInstance(KeyboardListener);
    const gameEvents = resolver.getInstance(GameEvents);
    const onScreenControls: OnScreenControlManager = resolver.getInstance(OnScreenControlManager);

    onScreenControls.addControl({
      type: ControlType.Joystick,
      id: "move",
      anchor: ControlAnchor.BottomRight,
      offsetX: 120,
      offsetY: 120,
      baseSize: 60,
      knobSize: 25,
      dynamic: false,
      threshold: 0.2,
      baseColor: 0x44cc66,
      baseAlpha: 0.3,
      knobColor: 0x44cc66,
      knobAlpha: 0.6,
    });

    this._mapper = new InputMapper();
    this._mapper.addDeviceListener(keyboard);
    this._mapper.addDeviceListener(onScreenControls);

    this._mapper.addDirectionAction("move", (x, y) => { gameEvents.emitDirectionInput(x, y); });

    // Keyboard
    this._mapper.mapKeysToDirection(keyboard.deviceId, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "move");
    this._mapper.mapKeysToDirection(keyboard.deviceId, "KeyW", "KeyS", "KeyA", "KeyD", "move");

    // On-screen joystick
    this._mapper.mapKeysToDirection(onScreenControls.deviceId, "move.up", "move.down", "move.left", "move.right", "move");
  }
}
