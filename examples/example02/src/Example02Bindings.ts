import { DIContainer, IInstanceResolver, ModuleBinding, ViewFactory } from "gamelabsjs";
import { Example02Config } from "./Example02Config";

export class Example02Binding extends ModuleBinding {
    public readonly config = new Example02Config();
    
    constructor(){
        super();
    }

    public configureDI(diContainer: DIContainer): void {
    }

    public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    }
}