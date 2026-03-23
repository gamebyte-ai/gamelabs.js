THIS IS NOT COMPLETE! ignore this file for now


what is this

This project is a **TypeScript skeleton + reusable modules** for web games. It targets **AI-generated projects** where humans review every change. 

It dependes on:
- **Three.js** for 3D (world / scene graph)
- **PixiJS** for 2D (HUD / UI)
- **GSAP** for animations





design decisions


- Minimal dependency injection
 - Two di containers; one for views, one for controllers(and others)
- MVC implementation with strict View-ViewController separation (`IView`->`IViewController` / `ViewController`->`IView`)
- Two types of views
 - World for game scene and objects (**Three.js**)
 - Hud for UIs and overlays (**PixiJS**)
- Modules for common features



Dependency Injection system



MVC system
- IView-IViewController implementations are registered in ViewFactory
- IView instances are created with ViewFactory create methods
- `IView` implementations manage scene objects, handle rendering settings, create sub views, handle pointer inputs
- `IViewController` implementations listen view and other events, handle view behaviours and responses via `IView` child interfaces

- World views
 - extend `WorldViewBase`
 - all game objects will be in world (even if it is a 2d game)

- Hud views
 - extend `HudViewBase`
 - UI and overlay graphics are hud views
 - `ScreenView` are special hud views, they cover whole canvas and only one of them is active at a time (on exit transition old screen may still be in scene but it should block interaction while `isInTransition` is true)






Hud
-  Implemented with **PixiJS** 







- Base `GamelabsApp` class for entry point
- View controller
- Minimal dependency injection (two containers. one for views, one for controllers)





making an app


creating views


binding to di containers


module structure


using modules


creating modules

 
cloning modules





my real problem is this;

I am developing a html game framework. it uses threejs for world pixijs for ui. framework has a mvc system, that works for both world and ui. view and controller class pairs are registered before hand. I want to perform initialize operations after views are created and added to a parent. 