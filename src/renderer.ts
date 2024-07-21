import { Mat4, mat4 } from 'wgpu-matrix';
import { toRadians } from './math_util';

import testSceneVertSrc from './shaders/test_scene.vert.wgsl?raw';
import testSceneFragSrc from './shaders/test_scene.frag.wgsl?raw';

var canvas;
var canvasFormat: GPUTextureFormat;
var context: GPUCanvasContext;
var device: GPUDevice;

var aspectRatio: number;

export async function initWebGPU() {
    canvas = <HTMLCanvasElement> document.getElementById("mainCanvas")!;

    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    aspectRatio = canvas.width / canvas.height; // TODO: update on canvas resize (also update renderer proj matrix, may want inheritance from a base Renderer class for this)

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
    indexBuffer!: GPUBuffer;

    viewProjMatUniformBuffer!: GPUBuffer;

    uniformsBindGroup!: GPUBindGroup;

    pipeline!: GPURenderPipeline;

    projMat: Mat4 = mat4.create();
    viewAngleRadians = 0;

    setup() {
        const vertices = new Float32Array([
            -1, -1, -1,
            1, -1, -1,
            1, 1, -1,
            -1, 1, -1,
            -1, -1, 1,
            1, -1, 1,
            1, 1, 1,
            -1, 1, 1
        ]);
        this.vertexBuffer = device.createBuffer({
            label: "cube vertex buffer",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, vertices);

        const indices = new Uint32Array([
            0, 1, 3, 3, 1, 2,
            1, 5, 2, 2, 5, 6,
            5, 4, 6, 6, 4, 7,
            4, 0, 7, 7, 0, 3,
            3, 2, 7, 7, 2, 6,
            4, 5, 0, 0, 5, 1
        ]);
        this.indexBuffer = device.createBuffer({
            label: "cube index buffer",
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, indices);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 12,
            attributes: [
                {
                    format: "float32x3",
                    offset: 0,
                    shaderLocation: 0
                }
            ]
        };

        this.viewProjMatUniformBuffer = device.createBuffer({
            label: "view proj mat uniform",
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const uniformsBindGroupLayout = device.createBindGroupLayout({
            label: "uniforms bind group layout",
            entries: [
                { // viewProjMat
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }
            ]
        });

        this.uniformsBindGroup = device.createBindGroup({
            label: "uniforms bind group",
            layout: uniformsBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.viewProjMatUniformBuffer }
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            label: "pipeline layout",
            bindGroupLayouts: [ uniformsBindGroupLayout ]
        });

        this.pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: device.createShaderModule({
                    label: "test scene vert shader",
                    code: testSceneVertSrc
                }),
                buffers: [ vertexBufferLayout ]
            },
            fragment: {
                module: device.createShaderModule({
                    label: "test scene frag shader",
                    code: testSceneFragSrc,
                }),
                targets: [
                    {
                        format: canvasFormat,
                    }
                ]
            }
        });

        this.projMat = mat4.perspective(toRadians(45), aspectRatio, 0.1, 1000);
    }

    draw(time: number) {
        this.viewAngleRadians = 0.004 * time;
        const centerPos = [0, 0, 0];
        const eyeHorizontalDist = 8;
        const eyePos = [eyeHorizontalDist * Math.cos(this.viewAngleRadians), 4, eyeHorizontalDist * Math.sin(this.viewAngleRadians)];

        let viewMat = mat4.lookAt(eyePos, centerPos, [0, 1, 0])
        let viewProjMat = mat4.mul(this.projMat, viewMat);
        device.queue.writeBuffer(this.viewProjMatUniformBuffer, 0, viewProjMat);

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
        renderPass.setIndexBuffer(this.indexBuffer, 'uint32');

        renderPass.setBindGroup(0, this.uniformsBindGroup);

        renderPass.drawIndexed(36);

        renderPass.end();

        device.queue.submit([encoder.finish()]);

        requestAnimationFrame((t) => this.draw(t));
    }
}