import passthrough2dVertSrc from './shaders/passthrough_2d.vert.wgsl?raw';
import redFragSrc from './shaders/red.frag.wgsl?raw';

var canvas;
var canvasFormat: GPUTextureFormat;
var context: GPUCanvasContext;
var device: GPUDevice;

export async function initWebGPU() {
    canvas = <HTMLCanvasElement> document.getElementById("mainCanvas")!;

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    if (!navigator.gpu)
    {
        throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
    {
        throw new Error("No appropriate GPUAdapter found.");
    }

    device = await adapter.requestDevice();

    context = canvas.getContext("webgpu")!;
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    console.log("WebGPU init successsful.");
}

export class TestSceneRenderer {
    vertexBuffer!: GPUBuffer;
    pipeline!: GPURenderPipeline;

    setup() {
        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            0, 1
        ]);
        this.vertexBuffer = device.createBuffer({
            label: "triangle vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, vertices);        

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [
                {
                    format: "float32x2",
                    offset: 0,
                    shaderLocation: 0
                }
            ]
        };

        this.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: device.createShaderModule({
                    code: passthrough2dVertSrc
                }),
                buffers: [ vertexBufferLayout ]
            },
            fragment: {
                module: device.createShaderModule({
                    code: redFragSrc,
                }),
                targets: [
                    {
                        format: canvasFormat,
                    }
                ]
            }
        });
    }

    draw() {
        const encoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [
                {
                    view: textureView,
                    loadOp: "clear",
                    clearValue: [0, 0, 0, 1],
                    storeOp: "store",
                }
            ]
        }

        const renderPass = encoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(this.pipeline);
        renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.draw(3);

        renderPass.end();

        device.queue.submit([encoder.finish()]);
    }
}