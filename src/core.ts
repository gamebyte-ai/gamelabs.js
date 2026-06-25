// Three.js-free entry point. Re-exports only the parts of the framework that
// do not touch `three`. Consumers import `GamelabsApp` from here when they
// want a 2D / renderer-free build; the bundle graph never reaches WebGLRenderer,
// Raycaster, GLTFLoader, or any other three.js symbol.
//
// This is the BASE `GamelabsApp` (no default `createWorld`). A consumer that
// still wants a World can supply its own `createWorld` factory via config.
// 3D-only modules (gamecamera, gamegrid view layer, particles' WorldParticleEmitter,
// the World class itself, WorldViewBase, WorldInteractiveObject, WorldPointerInput,
// WorldAssetManager, DevUtils3D, GroundGrid) are intentionally NOT re-exported
// here. See AGENTS.md and individual module READMEs for what each module needs.

export { GamelabsApp } from "./core/GamelabsApp.js";
export * from "./core/di/DIContainer.js";
export * from "./core/di/InjectionToken.js";
export * from "./core/di/IInstanceResolver.js";
export * from "./core/di/IInjectionTarget.js";
export * from "./core/views/ViewFactory.js";
export * from "./core/views/IViewFactory.js";
export * from "./core/views/IView.js";
export * from "./core/views/IViewController.js";
export * from "./core/hud/Hud.js";
export * from "./core/hud/HudLayer.js";
export * from "./core/hud/HudViewBase.pixi.js";
export type { IHud } from "./core/hud/IHud.js";
export type { IWorld } from "./core/world/IWorld.js";
export type { IWorldPointerInput } from "./core/world/IWorldPointerInput.js";
export * from "./core/utilities/UpdateManager.js";
export * from "./core/utilities/FixedStepAccumulator.js";
export * from "./core/utilities/computeViewportRect.js";
export * from "./core/styles/StyleManager.js";
export * from "./core/styles/StyledHudObject.js";
export * from "./core/styles/SpriteStyle.js";
export * from "./core/styles/TextStyle.js";
export * from "./core/services/StorageService.js";
export * from "./core/services/AudioService.js";
export * from "./core/dev/ILogger.js";
export * from "./core/dev/LogTypes.js";
export * from "./core/dev/IDevUtils.js";
export * from "./core/dev/Logger.js";
export type { IGroundGrid, GroundGridOptions } from "./core/dev/IGroundGrid.js";
export * from "./core/dev/DevUtils.js";
export * from "./core/assets/AssetTypes.js";
export * from "./core/assets/IAssetManager.js";
export * from "./core/assets/AssetManager.js";
export * from "./core/assets/AssetRequest.js";
export * from "./core/assets/AssetRequestList.js";
export * from "./core/ModuleBinding.js";
export * from "./core/ui/IScreenView.js";
export * from "./core/ui/IPopupView.js";
export * from "./core/ui/ScreenTransition.js";
export * from "./core/ui/ScreenView.pixi.js";
export * from "./core/ui/PopupView.pixi.js";
export * from "./core/ui/UIEvents.js";
export * from "./core/ui/UIUtils.js";
export type { Unsubscribe } from "./core/events/subscriptions.js";
export { UnsubscribeBag } from "./core/events/subscriptions.js";
export * from "./core/types.js";
export * from "./core/version.js";
export * from "./core/input/InputManager.js";
export * from "./core/input/IInputManager.js";
export * from "./core/input/KeyboardListener.js";
export * from "./core/input/InputMapper.js";
export { POINTER_INPUT_LAYER } from "./core/input/PointerInputLayer.js";
export type { IPointerInputHandler } from "./core/input/IPointerInputHandler.js";
