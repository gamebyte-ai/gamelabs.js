import "./style.css";

import { Example01App } from "./Example01App";

const stage = document.getElementById("stage");
if (!stage) throw new Error("Missing #stage element");
await Example01App.create(stage);

