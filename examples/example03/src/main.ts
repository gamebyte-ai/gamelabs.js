import "./style.css";
import "@pixi/layout";

import { Example03App } from "./Example03App";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new Example03App(stage);
await app.initialize();
app.mainLoop();
