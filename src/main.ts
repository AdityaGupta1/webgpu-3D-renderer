import { initWebGPU, TestSceneRenderer } from './renderer.js'

await initWebGPU();

const renderer = new TestSceneRenderer();
renderer.setup();

requestAnimationFrame((t) => renderer.draw(t));