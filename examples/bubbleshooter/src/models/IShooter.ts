import { InjectionToken } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";

export interface IShooter {
  readonly heldColor: BubbleColor | null;
  readonly aimAngle: number;
}

export const IShooter = new InjectionToken<IShooter>("IShooter");
