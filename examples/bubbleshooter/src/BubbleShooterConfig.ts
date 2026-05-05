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
  public readonly playAreaPaddingBottom = 100;

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
  /** Duration of the swap animation that moves held + next bubbles past each other. */
  public readonly shooterSwapDurationSeconds = 0.25;

  /** Next-bubble preview slot, drawn beside the shooter. */
  public readonly nextSlotOffsetX = 78;
  public readonly nextSlotOffsetY = -10;
  /** World-space side length of the swap-icon plane that frames the next bubble. */
  public readonly nextSlotIconSize = 44;
  /** Click hit-test radius around the next-slot centre (slightly forgiving vs the visible icon). */
  public readonly nextSlotClickRadius = 24;
  /** Visual scale of the bubble inside the next-slot ring (× bubbleRadius). */
  public readonly nextBubbleRadiusScale = 0.6;

  public readonly landingPreviewOpacity = 0.55;
  /** Ring thickness for the ghost landing preview (world units). */
  public readonly landingPreviewRingThickness = 2.5;

  public readonly aimDotRadius = 3.5;
  public readonly aimDotSpacing = 15;
  public readonly aimDotColor = 0xffffff;
  /** Aim dot colour while a power-up (bomb / fireball) is loaded into the held slot. */
  public readonly aimDotPowerUpColor = 0xff3030;
  public readonly aimDotAlpha = 0.6;
  /** Arc-length speed of the dot march, in world units per second. */
  public readonly aimDotFlowSpeed = 60;
  /**
   * Number of dots at the trajectory tail (closest to the landing) that
   * fade out toward the end. Earlier dots use full opacity. With the
   * default linear ramp, the last dot ends up at `1/(K+1)` of full
   * alpha and the K-th-from-end at `K/(K+1)`.
   */
  public readonly aimDotFadeTailCount = 4;
  public readonly aimMaxBounces = 4;
  /** Minimum angle from horizontal so aim never points sideways or down. */
  public readonly aimMinAngleFromHorizontalRad = (15 * Math.PI) / 180;

  /** World units per second for the bubble's straight-line flight. */
  public readonly firedBubbleSpeed = 1500;

  /** Minimum same-colour group size that pops on snap. */
  public readonly matchPopThreshold = 3;

  /** Bomb power-up inventory at game / level start. */
  public readonly initialBombCount = 3;
  /**
   * Number of hex rings the bomb explosion covers around its landing
   * cell. `1` = centre + 6 neighbours (7 cells). `2` = centre + 6 +
   * the next-out 12-cell ring (19 cells). `3` would be 37, etc.
   */
  public readonly bombBlastRingCount = 2;

  /** Fireball power-up inventory at game / level start. */
  public readonly initialFireballCount = 3;
  /** Fireball flight speed in world units per second. */
  public readonly fireballSpeed = 1500;
  /**
   * Centre-to-centre distance at which the fireball pops a cluster bubble
   * along its straight-line path. Default `2 · bubbleRadius` (= a clean
   * touch); raise to vacuum bubbles slightly off-axis.
   */
  public readonly fireballCollisionRadius = 40;

  /** Seconds between sequential bubble pops within a single match group. */
  public readonly popDelaySeconds = 0.05;
  /** Per-bubble score increment within a single pop sequence. */
  public readonly popPointsStep = 5;

  /** Particle burst — quick visual when a bubble pops. */
  public readonly popParticleCount = 8;
  public readonly popParticleSpeedMin = 60;
  public readonly popParticleSpeedMax = 130;
  public readonly popParticleLifetimeSeconds = 0.45;
  public readonly popParticleRadius = 3;

  /**
   * Snap shake — when a fired bubble settles into the grid, its hex
   * neighbours wobble outward (away from the snap cell) along a
   * damped sine, then oscillate through their resting positions a
   * couple of times before settling back. The motion is
   * `offset(t) = peak · exp(-decay·t) · sin(2π·freq·t)` so each
   * bubble starts at rest, snaps out, then jellies in/out with
   * shrinking amplitude.
   *
   * The shake propagates over {@link snapShakeRingCount} hex rings;
   * each successive ring's peak is scaled by
   * {@link snapShakeRingFalloff}^(depth-1) so closer bubbles wobble
   * more strongly.
   */
  public readonly snapShakePeakOffset = 8.0;
  public readonly snapShakeDurationSeconds = 0.82;
  /** Hex-ring depth the wobble propagates to (1 = immediate neighbours only). */
  public readonly snapShakeRingCount = 3;
  /** Per-ring peak multiplier. Ring `d` peak = `peak · falloff^(d-1)`. */
  public readonly snapShakeRingFalloff = 0.7;
  /** Wobble frequency in Hz — controls how many times the bubble swings within the lifetime. */
  public readonly snapShakeFrequencyHz = 4.2;
  /**
   * Damping coefficient. Amplitude at time `t` is multiplied by
   * `exp(-decay·t)`; tuned so that by `snapShakeDurationSeconds` the
   * bubble has decayed to ~5 % of its peak. Higher = settles faster.
   */
  public readonly snapShakeDecayRate = 7.5;

  /** Score-popup lifetime in seconds (text fades to zero opacity by then). */
  public readonly scorePopupLifetimeSeconds = 0.75;
  /** World units the score popup rises over its lifetime. */
  public readonly scorePopupRise = 36;
  /** Score popup plane width (world units); height auto-scales to canvas aspect. */
  public readonly scorePopupWidth = 50;

  /** Acceleration for disconnected falling bubbles, world units per second squared. */
  public readonly fallingBubbleGravity = 1200;
  /**
   * Outward radial separation impulse applied to each disconnected
   * bubble before it falls. Each bubble's initial velocity points away
   * from the group's centre of mass at this magnitude — the cluster
   * visibly breaks apart for a beat instead of dropping as a frozen
   * blob.
   */
  public readonly fallingBubbleSeparationImpulse = 100;
  /**
   * Extra upward velocity added on top of the radial separation impulse,
   * giving the disconnect a tiny "burst" feel before gravity pulls
   * everything down.
   */
  public readonly fallingBubbleSeparationUpBias = 70;
  /** Bonus points awarded when a falling bubble pops at the threshold. */
  public readonly fallingBubblePopPoints = 40;
  /**
   * World-Y threshold (relative to the shooter) at which a falling bubble
   * pops. Default: just below the shooter level so the player sees the
   * full drop before the burst.
   */
  public readonly fallingBubblePopDepth = -50;

  /**
   * Shrink applied to the bubble-vs-bubble collision radius (world units).
   * Effective centre-to-centre threshold becomes `2 · bubbleRadius -
   * bubbleCollisionTolerance`, so the flying bubble can squeeze through
   * gaps slightly tighter than its full diameter. The aim trajectory,
   * ghost landing preview, and actual fire all use the same value via
   * `AimTrajectoryCalculator`, so the predicted landing always matches
   * the real flight.
   */
  public readonly bubbleCollisionTolerance = 6.45;

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
