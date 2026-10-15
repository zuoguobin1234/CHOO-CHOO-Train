import { addStars } from "./addStars.js";
import { addMoon } from "./addMoon.js";
import { addMountains } from "./addMountains.js";
import { addTrees } from "./addTrees.js";
import { addGround } from "./addGround.js";
import { addTrain } from "./addTrain.js";
import { addSmokes } from "./addSmokes.js";

const { Application , Container} = PIXI;

// Create a PixiJS application.
const app = new Application();

const trainContainer = new Container();

(async () => {
  // Intialize the application.
  await app.init({ background: "#021f4b", resizeTo: window });

  // Then adding the application's canvas to the DOM body.
  document.body.appendChild(app.canvas);

  addStars(app);
  addMoon(app);
  addMountains(app);
  addTrees(app);
  addGround(app);
  addTrain(app, trainContainer);
  addSmokes(app, trainContainer);
})();
