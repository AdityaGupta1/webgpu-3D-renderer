import { initWebGPU, TestSceneRenderer } from './renderer.js'

await initWebGPU();

const renderer = new TestSceneRenderer();
renderer.setup();

setInterval(function() {
    renderer.draw();
}, 1000 / 60);