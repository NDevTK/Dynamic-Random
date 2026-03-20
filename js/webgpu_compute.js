/**
 * @file webgpu_compute.js
 * @description Singleton managing WebGPU initialization and helper wrappers.
 * If WebGPU is unavailable, `available` stays false and all methods return null.
 */

class WebGPUCompute {
    constructor() {
        this.available = false;
        this.device = null;
        this._adapter = null;
    }

    /**
     * Attempt to initialize WebGPU. Call once at startup.
     * Sets `this.available` and `this.device` on success.
     */
    async init() {
        try {
            if (!navigator.gpu) return;

            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance'
            });
            if (!adapter) return;

            const device = await adapter.requestDevice();
            if (!device) return;

            // Listen for device loss — mark unavailable so callers can fall back
            device.lost.then(() => {
                this.available = false;
                this.device = null;
            });

            this._adapter = adapter;
            this.device = device;
            this.available = true;
        } catch (e) {
            // WebGPU not supported or blocked
            this.available = false;
            this.device = null;
        }
    }

    /**
     * Create a compute pipeline from WGSL source.
     * @param {string} shaderCode  — WGSL source string
     * @param {GPUBindGroupLayoutEntry[]} bindGroupLayoutEntries
     * @returns {{ pipeline: GPUComputePipeline, bindGroupLayout: GPUBindGroupLayout }|null}
     */
    createComputePipeline(shaderCode, bindGroupLayoutEntries) {
        if (!this.available) return null;
        try {
            const shaderModule = this.device.createShaderModule({ code: shaderCode });
            const bindGroupLayout = this.device.createBindGroupLayout({
                entries: bindGroupLayoutEntries
            });
            const pipelineLayout = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            });
            const pipeline = this.device.createComputePipeline({
                layout: pipelineLayout,
                compute: { module: shaderModule, entryPoint: 'main' }
            });
            return { pipeline, bindGroupLayout };
        } catch (e) {
            return null;
        }
    }

    /**
     * Create a GPUBuffer.
     * @param {number} size  — byte size
     * @param {GPUBufferUsageFlags} usage
     * @returns {GPUBuffer|null}
     */
    createBuffer(size, usage) {
        if (!this.available) return null;
        try {
            return this.device.createBuffer({ size, usage });
        } catch (e) {
            return null;
        }
    }

    /**
     * Read data back from a GPU buffer into a Float32Array.
     * @param {GPUBuffer} gpuBuffer — source buffer (must include COPY_SRC usage)
     * @param {number} size         — byte size to read
     * @returns {Promise<Float32Array|null>}
     */
    async readBuffer(gpuBuffer, size) {
        if (!this.available || !gpuBuffer) return null;
        try {
            const stagingBuffer = this.device.createBuffer({
                size,
                usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
            });

            const encoder = this.device.createCommandEncoder();
            encoder.copyBufferToBuffer(gpuBuffer, 0, stagingBuffer, 0, size);
            this.device.queue.submit([encoder.finish()]);

            await stagingBuffer.mapAsync(GPUMapMode.READ);
            const result = new Float32Array(stagingBuffer.getMappedRange().slice(0));
            stagingBuffer.unmap();
            stagingBuffer.destroy();
            return result;
        } catch (e) {
            return null;
        }
    }
}

export const webgpuCompute = new WebGPUCompute();
