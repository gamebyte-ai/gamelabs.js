import "./style.css";
import "@pixi/layout";

import { ScreensApp } from "./ScreensApp";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new ScreensApp(stage);
await app.initialize();
app.mainLoop();

