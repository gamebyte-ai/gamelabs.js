import "./style.css";
import "@pixi/layout";

import { AvoidanceApp } from "./AvoidanceApp";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new AvoidanceApp(stage);
await app.initialize();
app.mainLoop();
