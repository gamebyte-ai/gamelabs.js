# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-04-07

### Added
- ESLint + Prettier configuration for code consistency
- Battle-tested unit tests with Vitest — 49 tests covering DIContainer (27), UnsubscribeBag (17), InjectionToken (2), including adversarial edge cases: circular dependency detection, factory/inject failure recovery, re-entrant flush, state corruption scenarios
- GitHub Actions CI pipeline (typecheck, lint, format, test, build on Node 20 + 22)
- CHANGELOG.md for version tracking
- ISSUES.md documenting 9 known issues with severity ratings
- Avoidance game example (enemy spawning, waves, game over popup, score tracking)
- Water Sort puzzle example with tween pour animations
- UI components module: ButtonComponent, BackgroundComponent, ImageComponent, VerticalLayoutComponent, HorizontalLayoutComponent
- Popup system with PopupView
- On-screen controls module: virtual joystick and buttons for touch input
- Settings module: settings manager with persistence and popup UI
- Audio DSP module: effects chain (filter, reverb, delay, distortion, compressor)
- AudioManager core service with asset integration
- KeyboardListener and InputMapper for keyboard input handling
- StorageService for persistent key-value storage
- Documentation site with HTML pages (`docs/`, `build:docs` script)

### Changed
- Package name changed from `gamelabsjs` to `@gamebyte/gamelabsjs`
- Screen and popup creation now uses string ids
- Screen creation moved from ViewFactory method to UI events

### Fixed
- All import references updated to scoped package name across docs and examples

## [0.1.0] - 2025-03-01

### Added
- Initial release
- Core framework: GamelabsApp, DI containers, View/Controller pattern
- Two rendering layers: World (Three.js) and HUD (PixiJS)
- Module system with ModuleBinding
- Asset management with fallback support
- Input system with pointer handling and raycasting
- Screen transitions (slide_in_left, slide_in_right, slide_in_down, slide_in_up, instant)
- Built-in modules: gamecamera, gamegrid, mainscreen, levelprogressscreen
- Camera controllers: front2d, front3d, topdown2d, topdown3d, isometric2d, isometric3d, orbital3d
- Grid system for tile-based games
- Development tools: Logger, StatsPanel, GroundGrid
- Examples: helloworld, screens, tictactoe, match3
