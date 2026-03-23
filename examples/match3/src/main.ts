import "./style.css";
import "@pixi/layout";

import { Match3App } from "./Match3App.js";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new Match3App(stage);
await app.initialize();
app.mainLoop();
