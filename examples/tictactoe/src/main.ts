import "./style.css";
import "@pixi/layout";

import { TicTacToeApp } from "./TicTacToeApp";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");

const app = new TicTacToeApp(stage);
await app.initialize();
app.mainLoop();
