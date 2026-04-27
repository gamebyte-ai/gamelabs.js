import { MyGameApp } from './MyGameApp';

const app = new MyGameApp(document.getElementById('stage')!);
await app.initialize();
app.mainLoop();
