import type { Unsubscribe } from "../events/subscriptions.js";
import type { HostEvent, HostListener } from "./HostEvent.js";

/**
 * Oyun → host tek-yönlü sinyal kanalı. INTERNAL — direkt kullanma.
 * `GamelabsApp.informHost` + `GamelabsApp.registerHostListener` public API.
 */
export class HostEvents {
  private readonly _listeners = new Set<HostListener>();

  public register(listener: HostListener): Unsubscribe {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  public size(): number {
    return this._listeners.size;
  }

  /**
   * Her listener'ı try/catch içinde çağırır — bir throw sonrakileri engellemez.
   * Dev'de warn (görünürlük), prod'da sessiz yut (playable canlıda çökmez).
   * `isDev`: caller'dan geçirilir (test edilebilir olması için).
   */
  public emit(event: HostEvent, isDev: boolean): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (err) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.warn(`[gamelabs] host listener threw on { type: "${event.type}" }:`, err);
        }
      }
    }
  }
}
