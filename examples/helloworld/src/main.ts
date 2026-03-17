import "./style.css";
import "@pixi/layout";

import { HelloWorldApp } from "./HelloWorldApp";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new HelloWorldApp(stage);
await app.initialize();
app.mainLoop();

