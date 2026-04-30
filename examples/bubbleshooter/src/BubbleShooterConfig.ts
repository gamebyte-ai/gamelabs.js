import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";

/**
 * Layout uses the classic Bubble Shooter offset-row scheme:
 * - even rows hold {@link wideRowColumns} bubbles flush to the left wall
 * - odd rows hold {@link wideRowColumns} - 1 bubbles, shifted right by one bubble radius
 * - vertical row pitch is `bubbleRadius * sqrt(3)` so neighboring bubbles touch
 */
export class BubbleShooterConfig {
  public readonly bubbleRadius = 20;
  public readonly wideRowColumns = 11;
  public readonly rowCount = 20;
  /**
   * Bottom rows left empty in the initial layout (still valid cells).
   * The lowest of these are the lose-line area for later steps.
   */
  public readonly initialEmptyBottomRows = 7;

  public readonly playAreaPaddingX = 16;
  public readonly playAreaPaddingTop = 16;
  /**
   * Space below the grid. Kept equal to {@link shooterMarginFromBottom}
   * so the grid's bottom edge lines up exactly with the shooter level
   * (the new lower rows act as the lose-line area).
   */
  public readonly playAreaPaddingBottom = 70;

  public readonly playAreaBgColor = 0x101822;
  public readonly playAreaBorderColor = 0x2a3a55;
  public readonly playAreaBorderWidth = 4;

  public readonly cellOutlineColor = 0x2f4769;
  public readonly cellOutlineThickness = 1.5;

  public readonly cameraMargin = 24;

  public readonly shooterRadius = 34;
  public readonly shooterMarginFromBottom = 70;
  public readonly shooterRingColor = 0x4a6280;
  public readonly shooterRingThickness = 2.5;
  public readonly shooterBarrelLength = 28;
  public readonly shooterBarrelThickness = 6;
  public readonly shooterBarrelColor = 0x6b86a8;

  /** Next-bubble preview slot, drawn beside the shooter. */
  public readonly nextSlotOffsetX = 78;
  public readonly nextSlotOffsetY = -10;
  public readonly nextSlotRadius = 22;
  public readonly nextSlotRingThickness = 2;
  public readonly nextSlotRingColor = 0x4a6280;
  /** Visual scale of the bubble inside the next-slot ring (× bubbleRadius). */
  public readonly nextBubbleRadiusScale = 0.6;

  public readonly landingPreviewOpacity = 0.4;

  public readonly aimDotRadius = 3.5;
  public readonly aimDotSpacing = 15;
  public readonly aimDotColor = 0xffffff;
  public readonly aimDotAlpha = 0.6;
  /** Arc-length speed of the dot march, in world units per second. */
  public readonly aimDotFlowSpeed = 80;
  public readonly aimMaxBounces = 4;
  /** Minimum angle from horizontal so aim never points sideways or down. */
  public readonly aimMinAngleFromHorizontalRad = (15 * Math.PI) / 180;

  /** World units per second for the bubble's straight-line flight. */
  public readonly firedBubbleSpeed = 1500;

  /** Minimum same-colour group size that pops on snap. */
  public readonly matchPopThreshold = 3;

  /**
   * Front camera focal-point Z. Pushes the camera back so bubble spheres
   * (radius ≈ {@link bubbleRadius}) sit comfortably between the ortho
   * near plane and the far plane. With `FRONT_OFFSET` = 5, anything more
   * than `bubbleRadius + 0.1` is enough; 200 leaves generous headroom.
   */
  public readonly cameraFocusZ = 500;

  public readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0,
    },
  };
}
