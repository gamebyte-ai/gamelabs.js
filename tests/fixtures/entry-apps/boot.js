// Shared by core-app.js and full-app.js: one small game that adds the full entry's ready-made
// modules, shows the main screen, opens the settings popup and reports its boot on `window.__game`
// (`ready`) or `window.__bootError`, the same two signals ongame's verify_build reads.
// scripts/check-entry-apps.mjs builds each app with Vite and boots it in a browser.

export function bootEntryApp(engine) {
  const { GamelabsApp, Hud, UIEvents, UIComponentsBinding, SettingsBinding, MainScreenBinding, MainScreenUIIds, SettingsUIIds } =
    engine;

  class EntryApp extends GamelabsApp {
    constructor(mount) {
      // The `/core` app makes no HUD unless it is given a factory. The full entry makes this same HUD by default.
      super({ mount, createHud: (ctx) => Hud.create(mount, { logger: ctx.logger }) });
    }

    registerModules() {
      this.addModule(new UIComponentsBinding());
      this.addModule(new SettingsBinding({ audioFields: true }));
      this.addModule(new MainScreenBinding());
    }

    postInitialize() {
      const ui = this.diContainer.getInstance(UIEvents);
      ui.createScreen(MainScreenUIIds.MainScreen, null);
      ui.createPopup(SettingsUIIds.SettingsPopup);
    }
  }

  const game = { ready: false, world: null };
  globalThis.__game = game;
  const stage = document.getElementById("stage");
  const app = new EntryApp(stage);
  app
    .initialize()
    .then(() => {
      app.mainLoop();
      game.world = stage.querySelector("canvas.layer.world3d") !== null;
      game.ready = true;
    })
    .catch((err) => {
      globalThis.__bootError = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
      console.error("[entry-app] boot failed", err);
    });
}
