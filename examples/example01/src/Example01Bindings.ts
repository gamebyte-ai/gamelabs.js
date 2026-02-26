import { AssetRequest, AssetTypes, DIContainer, IInstanceResolver, ModuleBinding, ViewFactory } from "gamelabsjs";
import { Example01AssetIds } from "./Example01Assets";
import { GameEvents } from "./events/GameEvents";
import { DebugEvents } from "./events/DebugEvents";
import { GameScreenView } from "./views/GameScreenView.pixi";
import { TopBarView } from "./views/TopBarView.pixi";
import { DebugBarView } from "./views/DebugBarView.pixi";
import { GameScreenController } from "./controllers/GameScreenViewController";
import { TopBarController } from "./controllers/TopBarController";
import { DebugBarController } from "./controllers/DebugBarController";
import { CubeView } from "./views/CubeView.three";
import { CubeController } from "./controllers/CubeController";
import { Example01Config } from "./Example01Config";


export class Example01Binding extends ModuleBinding {
    public readonly config = new Example01Config();
    public readonly gameEvents = new GameEvents();
    public readonly debugEvents = new DebugEvents();
    
    constructor(){
        super();
        this._assets.set(Example01AssetIds.Cube, new AssetRequest(AssetTypes.GLTF, Example01AssetIds.Cube, new URL("../assets/cube.glb", import.meta.url).href));
    }

    public configureDI(diContainer: DIContainer): void {
        diContainer.bindInstance(GameEvents, this.gameEvents);
        diContainer.bindInstance(DebugEvents, this.debugEvents);
    }

    public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
        viewFactory.registerHudView<GameScreenView, GameScreenController> (GameScreenView, { Controller: GameScreenController });
        viewFactory.registerHudView<TopBarView,     TopBarController>     (TopBarView,     { Controller: TopBarController     });
        viewFactory.registerHudView<DebugBarView,   DebugBarController>   (DebugBarView,   { Controller: DebugBarController   });
    
        viewFactory.registerWorldView<CubeView, CubeController>(CubeView, { Controller: CubeController });
    }
}