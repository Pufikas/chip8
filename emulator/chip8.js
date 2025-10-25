import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";

const REN = new Renderer(10);
const KEY = new Keyboard();
const SPE = new Speaker();

let loop;
let fps = 60, fpsInterval, startTime, now, then, elapsed;

function init() {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;

    // test
    REN.testRender();
    REN.render();
    //

    loop = requestAnimationFrame(step);
}

function step() {
    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        // 
    }

    loop = requestAnimationFrame(step);
}

init();