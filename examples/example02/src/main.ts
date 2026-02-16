import "./style.css";
import "@pixi/layout";

import { Example02App } from "./Example02App";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new Example02App(stage);
await app.initialize();
app.mainLoop();

