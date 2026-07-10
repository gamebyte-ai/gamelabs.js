/**
 * Kanonik oyun → host (dağıtım ortamı) sinyalleri.
 *
 * Yeni variant eklemek gamelabs.js'te minor bump gerektirir.
 * `type` string literal + payload discriminated union: TS narrowing
 * ve JSON-serializable (ileride wire protokolüne dönüşebilir).
 */
export type HostEvent =
  /** Oyun boot bitti, ilk frame render edildi. Impression signal. */
  | { type: "ready" }
  /**
   * Bir oyun oturumu bitti (final win/lose, no more rounds).
   * `outcome` semantic; `score`/`durationMs`/`level` opsiyonel — oyunda anlamlıysa geçir.
   * Ad networks payload'ı yok sayar (sadece signal'ı sayar); portal analytics kullanır.
   */
  | {
      type: "end";
      outcome?: "win" | "lose" | "complete";
      score?: number;
      durationMs?: number;
      level?: number;
    }
  /** CTA (Download / Install / Play Now) tıklandı. URL fallback için — bazı network'ler yok sayar. */
  | { type: "openStore"; url: string }
  /**
   * İlk anlamlı kullanıcı etkileşimi (tap / drag / decision).
   * v1'de template-level auto-hook (InputManager first-pointer) → per-game manuel iş yok.
   */
  | { type: "interaction" }
  /**
   * Bir round / level başladı. Portal-aware (Poki `gameplayStart`, Yandex `GameAPI.start`,
   * CrazyGames `sdk.game.gameplayStart`). Round-based olmayan oyunlar çağırmaz.
   */
  | { type: "roundStart" }
  /** Bir round / level bitti. `outcome`/`score` opsiyonel. */
  | {
      type: "roundEnd";
      outcome?: "win" | "lose" | "complete";
      score?: number;
      level?: number;
    };

/** `HostEvent` variant'ının `type` field'ı. String union — autocomplete + typo-catch için. */
export type HostEventType = HostEvent["type"];

/** Host listener imzası. Return value kullanılmaz. */
export type HostListener = (event: HostEvent) => void;

/**
 * Window global augmentation — array-based multi-listener registry.
 * Adapter shim `window.__gamelabsHostListeners = window.__gamelabsHostListeners || [];`
 * ile lazy init edip `.push(listener)` yapar. `as any` cast'e gerek yok.
 */
declare global {
  interface Window {
    __gamelabsHostListeners?: HostListener[];
  }
}
