import "./style.css";
import "@pixi/layout";

import { Example01App } from "./Example01App";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new Example01App(stage);
await app.initialize();
app.mainLoop();

