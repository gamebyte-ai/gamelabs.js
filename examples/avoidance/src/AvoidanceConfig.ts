import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";

export class AvoidanceConfig {
  // Game area
  readonly gameAreaSize = 500;
  readonly gameAreaBorderWidth = 6;
  readonly gameAreaBorderColor = 0x44cc66;
  readonly gameAreaBgColor = 0x0a1a10;
  readonly gameAreaBgAlpha = 0.6;

  // Player
  readonly playerSize = 28;
  readonly playerSpeed = 200;

  // Enemy
  readonly enemySize = 22;
  readonly enemyBaseSpeed = 120;
  readonly enemySpeedIncrement = 15;

  // Collision
  readonly collisionShrink = 0.7;

  // Slow ability
  readonly slowAbilityDurationMs = 3000;
  readonly slowAbilityCooldownMs = 10000;
  readonly slowAbilityFactor = 0.5;

  // Camera shake on death
  readonly cameraShakeAmplitude = 22;
  readonly cameraShakeDurationMs = 450;

  // Waves
  readonly waveAnnounceDurationMs = 1500;
  readonly waveBaseEnemyCount = 10;
  readonly waveEnemyCountIncrement = 5;
  readonly waveBaseSpawnDelayMs = 800;
  readonly waveSpawnDelayDecrementMs = 50;
  readonly waveMinSpawnDelayMs = 150;
  readonly wavePauseBetweenMs = 1000;

  // Transitions
  readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0
    }
  };
}
