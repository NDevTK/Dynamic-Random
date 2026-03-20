/**
 * @file webgpu_particle_architecture.js
 * @description Massive particle system: 100k particles via WebGPU compute shader,
 * or 5k particles via Canvas 2D fallback. Gravity attractors, velocity damping,
 * wrap-around edges. Particles drawn as 1-2px dots with additive blending,
 * colored by speed.
 */

import { Architecture } from './background_architectures.js';
import { webgpuCompute } from './webgpu_compute.js';
import { mouse } from './state.js';

// ---------------------------------------------------------------------------
// WGSL compute shader — updates particle positions/velocities each frame.
// Struct layout per particle (6 floats = 24 bytes):
//   x, y, vx, vy, life, colorIndex
// ---------------------------------------------------------------------------
const PARTICLE_SHADER = /* wgsl */`
struct Particle {
    x: f32, y: f32,
    vx: f32, vy: f32,
    life: f32,
    colorIndex: f32,
}
struct Attractor {
    x: f32, y: f32, strength: f32, _pad: f32,
}
struct Uniforms {
    width: f32, height: f32,
    dt: f32, damping: f32,
    attractorCount: u32, _p0: u32, _p1: u32, _p2: u32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;
@group(0) @binding(2) var<storage, read> attractors: array<Attractor>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];

    // Apply gravity toward each attractor
    for (var a = 0u; a < uniforms.attractorCount; a++) {
        let att = attractors[a];
        let dx = att.x - p.x;
        let dy = att.y - p.y;
        let distSq = dx * dx + dy * dy + 1.0;
        let dist = sqrt(distSq);
        let force = att.strength / distSq * 800.0;
        p.vx += (dx / dist) * force * uniforms.dt;
        p.vy += (dy / dist) * force * uniforms.dt;
    }

    // Velocity damping
    p.vx *= uniforms.damping;
    p.vy *= uniforms.damping;

    // Cap speed
    let speed = sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > 8.0) {
        p.vx = p.vx / speed * 8.0;
        p.vy = p.vy / speed * 8.0;
    }

    // Integrate
    p.x += p.vx * uniforms.dt;
    p.y += p.vy * uniforms.dt;

    // Wrap-around edges
    if (p.x < 0.0)             { p.x += uniforms.width; }
    if (p.x >= uniforms.width)  { p.x -= uniforms.width; }
    if (p.y < 0.0)             { p.y += uniforms.height; }
    if (p.y >= uniforms.height) { p.y -= uniforms.height; }

    // Life cycles for subtle respawning variety
    p.life -= 0.0002;
    if (p.life <= 0.0) {
        p.life = 0.5 + fract(p.x * 0.001 + p.y * 0.001);
        p.vx = (fract(p.x * 7.3 + p.y * 3.1) - 0.5) * 2.0;
        p.vy = (fract(p.x * 5.7 + p.y * 9.2) - 0.5) * 2.0;
    }

    // Color index based on speed
    p.colorIndex = clamp(speed / 8.0, 0.0, 1.0);

    particles[i] = p;
}
`;

// Floats per particle in the GPU buffer
const FLOATS_PER_PARTICLE = 6;
const GPU_PARTICLE_COUNT  = 100_000;
const CPU_PARTICLE_COUNT  = 5_000;
// Floats per attractor: x, y, strength, pad
const FLOATS_PER_ATTRACTOR = 4;
const MAX_ATTRACTORS = 4;

export class WebGPUParticleArchitecture extends Architecture {
    constructor() {
        super();
        // Shared state
        this.attractors   = [];
        this.hue          = 200;
        this.useGPU       = false;

        // WebGPU objects
        this._particleBuf   = null;
        this._uniformBuf    = null;
        this._attractorBuf  = null;
        this._pipeline      = null;
        this._bindGroup     = null;
        this._gpuReady      = false;

        // CPU fallback typed arrays
        this._cpuX  = null;
        this._cpuY  = null;
        this._cpuVx = null;
        this._cpuVy = null;
        this._cpuLife = null;
    }

    // -----------------------------------------------------------------------
    // init
    // -----------------------------------------------------------------------
    async init(system) {
        this.hue = system.hue;

        // Pick 2-4 gravity attractors
        const count = 2 + Math.floor(system.rng() * 3);
        this.attractors = [];
        for (let i = 0; i < count; i++) {
            this.attractors.push({
                x:        system.rng() * system.width,
                y:        system.rng() * system.height,
                strength: 0.3 + system.rng() * 0.7,
                vx:       (system.rng() - 0.5) * 0.4,
                vy:       (system.rng() - 0.5) * 0.4,
            });
        }

        // Ensure WebGPU is initialised (no-op if already done)
        if (!webgpuCompute.available) {
            await webgpuCompute.init();
        }

        if (webgpuCompute.available) {
            this._initGPU(system);
        } else {
            this._initCPU(system);
        }
    }

    // -----------------------------------------------------------------------
    // GPU setup
    // -----------------------------------------------------------------------
    _initGPU(system) {
        const device = webgpuCompute.device;
        const N = GPU_PARTICLE_COUNT;

        // --- particle buffer ---
        const particleData = new Float32Array(N * FLOATS_PER_PARTICLE);
        for (let i = 0; i < N; i++) {
            const base = i * FLOATS_PER_PARTICLE;
            particleData[base]     = Math.random() * system.width;
            particleData[base + 1] = Math.random() * system.height;
            particleData[base + 2] = (Math.random() - 0.5) * 4;
            particleData[base + 3] = (Math.random() - 0.5) * 4;
            particleData[base + 4] = Math.random();
            particleData[base + 5] = 0;
        }
        this._particleBuf = webgpuCompute.createBuffer(
            particleData.byteLength,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        );
        device.queue.writeBuffer(this._particleBuf, 0, particleData);

        // --- uniform buffer: width, height, dt, damping, attractorCount, 3×pad ---
        this._uniformBuf = webgpuCompute.createBuffer(
            32, // 8 × 4 bytes
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        );

        // --- attractor buffer ---
        this._attractorBuf = webgpuCompute.createBuffer(
            MAX_ATTRACTORS * FLOATS_PER_ATTRACTOR * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        );

        // --- pipeline ---
        const result = webgpuCompute.createComputePipeline(PARTICLE_SHADER, [
            { binding: 0, visibility: GPUShaderStage.COMPUTE,
              buffer: { type: 'storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE,
              buffer: { type: 'uniform' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE,
              buffer: { type: 'read-only-storage' } },
        ]);

        if (!result) { this._initCPU(system); return; }

        this._pipeline = result.pipeline;

        this._bindGroup = device.createBindGroup({
            layout: result.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this._particleBuf } },
                { binding: 1, resource: { buffer: this._uniformBuf } },
                { binding: 2, resource: { buffer: this._attractorBuf } },
            ]
        });

        this.useGPU   = true;
        this._gpuReady = true;

        // Pre-allocate readback array (reused each frame)
        this._readbackData = new Float32Array(N * FLOATS_PER_PARTICLE);
        // Staging buffer for non-blocking readback
        this._stagingBuf = webgpuCompute.createBuffer(
            particleData.byteLength,
            GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        );
        this._stagingMapped = false;
        this._pendingPositions = null; // last successfully read positions
    }

    // -----------------------------------------------------------------------
    // CPU fallback setup
    // -----------------------------------------------------------------------
    _initCPU(system) {
        this.useGPU = false;
        const N = CPU_PARTICLE_COUNT;
        this._cpuX    = new Float32Array(N);
        this._cpuY    = new Float32Array(N);
        this._cpuVx   = new Float32Array(N);
        this._cpuVy   = new Float32Array(N);
        this._cpuLife = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            this._cpuX[i]    = Math.random() * system.width;
            this._cpuY[i]    = Math.random() * system.height;
            this._cpuVx[i]   = (Math.random() - 0.5) * 4;
            this._cpuVy[i]   = (Math.random() - 0.5) * 4;
            this._cpuLife[i] = Math.random();
        }
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------
    update(system) {
        // Move attractors slowly (same for both paths)
        for (const a of this.attractors) {
            a.x += a.vx * system.speedMultiplier;
            a.y += a.vy * system.speedMultiplier;
            if (a.x < 0 || a.x > system.width)  a.vx *= -1;
            if (a.y < 0 || a.y > system.height) a.vy *= -1;
        }

        if (this.useGPU && this._gpuReady) {
            this._updateGPU(system);
        } else {
            this._updateCPU(system);
        }
    }

    _updateGPU(system) {
        const device = webgpuCompute.device;
        const N = GPU_PARTICLE_COUNT;

        // Write uniforms
        const uniforms = new Float32Array(8);
        uniforms[0] = system.width;
        uniforms[1] = system.height;
        uniforms[2] = system.speedMultiplier;
        uniforms[3] = 0.985; // damping
        const ui32 = new Uint32Array(uniforms.buffer);
        ui32[4] = this.attractors.length;
        device.queue.writeBuffer(this._uniformBuf, 0, uniforms);

        // Write attractors
        const attData = new Float32Array(MAX_ATTRACTORS * FLOATS_PER_ATTRACTOR);
        for (let i = 0; i < this.attractors.length; i++) {
            const a = this.attractors[i];
            attData[i * 4]     = a.x;
            attData[i * 4 + 1] = a.y;
            attData[i * 4 + 2] = a.strength;
        }
        device.queue.writeBuffer(this._attractorBuf, 0, attData);

        // Dispatch compute
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(this._pipeline);
        pass.setBindGroup(0, this._bindGroup);
        pass.dispatchWorkgroups(Math.ceil(N / 64));
        pass.end();

        // Non-blocking copy to staging (skip if staging is still mapped)
        if (!this._stagingMapped) {
            encoder.copyBufferToBuffer(this._particleBuf, 0, this._stagingBuf, 0,
                N * FLOATS_PER_PARTICLE * 4);
        }

        device.queue.submit([encoder.finish()]);

        // Kick off async read — use previous frame's data for drawing
        if (!this._stagingMapped) {
            this._stagingMapped = true;
            this._stagingBuf.mapAsync(GPUMapMode.READ).then(() => {
                const mapped = this._stagingBuf.getMappedRange();
                this._pendingPositions = new Float32Array(mapped.slice(0));
                this._stagingBuf.unmap();
                this._stagingMapped = false;
            }).catch(() => { this._stagingMapped = false; });
        }
    }

    _updateCPU(system) {
        const N = CPU_PARTICLE_COUNT;
        const w = system.width, h = system.height;
        const dt = system.speedMultiplier;
        const x = this._cpuX, y = this._cpuY;
        const vx = this._cpuVx, vy = this._cpuVy;
        const life = this._cpuLife;

        for (let i = 0; i < N; i++) {
            // Gravity toward attractors
            for (const a of this.attractors) {
                const dx = a.x - x[i];
                const dy = a.y - y[i];
                const distSq = dx * dx + dy * dy + 1;
                const dist = Math.sqrt(distSq);
                const force = a.strength / distSq * 800;
                vx[i] += (dx / dist) * force * dt * 0.016;
                vy[i] += (dy / dist) * force * dt * 0.016;
            }

            // Damping
            vx[i] *= 0.985;
            vy[i] *= 0.985;

            // Cap speed
            const spd = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
            if (spd > 8) { vx[i] = vx[i] / spd * 8; vy[i] = vy[i] / spd * 8; }

            // Integrate
            x[i] += vx[i] * dt;
            y[i] += vy[i] * dt;

            // Wrap
            if (x[i] < 0)  x[i] += w;
            if (x[i] >= w) x[i] -= w;
            if (y[i] < 0)  y[i] += h;
            if (y[i] >= h) y[i] -= h;

            // Life
            life[i] -= 0.001;
            if (life[i] <= 0) {
                life[i] = 0.5 + Math.random() * 0.5;
                vx[i] = (Math.random() - 0.5) * 2;
                vy[i] = (Math.random() - 0.5) * 2;
            }
        }
    }

    // -----------------------------------------------------------------------
    // draw
    // -----------------------------------------------------------------------
    draw(system) {
        const ctx = system.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.useGPU && this._pendingPositions) {
            this._drawGPU(ctx, system);
        } else if (!this.useGPU) {
            this._drawCPU(ctx, system);
        }

        // Draw attractor halos
        ctx.globalCompositeOperation = 'lighter';
        for (const a of this.attractors) {
            const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 60);
            g.addColorStop(0, `hsla(${this.hue}, 80%, 70%, 0.15)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawGPU(ctx, system) {
        const data = this._pendingPositions;
        const N = GPU_PARTICLE_COUNT;
        const hue = this.hue;

        // Batch by color bucket to minimise fillStyle changes
        const BUCKETS = 4;
        const buckets = Array.from({ length: BUCKETS }, () => []);

        for (let i = 0; i < N; i++) {
            const base = i * FLOATS_PER_PARTICLE;
            const ci = Math.min(BUCKETS - 1, Math.floor(data[base + 5] * BUCKETS));
            buckets[ci].push(data[base], data[base + 1]);
        }

        for (let b = 0; b < BUCKETS; b++) {
            const pts = buckets[b];
            const t = b / (BUCKETS - 1);
            const h = (hue + t * 120) % 360;
            const l = 50 + t * 40;
            ctx.fillStyle = `hsla(${h}, 90%, ${l}%, 0.6)`;
            ctx.beginPath();
            for (let p = 0; p < pts.length; p += 2) {
                ctx.rect(pts[p], pts[p + 1], 1, 1);
            }
            ctx.fill();
        }
    }

    _drawCPU(ctx, system) {
        const N = CPU_PARTICLE_COUNT;
        const hue = this.hue;
        const x = this._cpuX, y = this._cpuY;
        const vx = this._cpuVx, vy = this._cpuVy;

        const BUCKETS = 4;
        const buckets = Array.from({ length: BUCKETS }, () => []);

        for (let i = 0; i < N; i++) {
            const spd = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
            const t = Math.min(1, spd / 8);
            const b = Math.min(BUCKETS - 1, Math.floor(t * BUCKETS));
            buckets[b].push(x[i], y[i]);
        }

        for (let b = 0; b < BUCKETS; b++) {
            const pts = buckets[b];
            const t = b / (BUCKETS - 1);
            const h = (hue + t * 120) % 360;
            const l = 50 + t * 40;
            ctx.fillStyle = `hsla(${h}, 90%, ${l}%, 0.7)`;
            ctx.beginPath();
            for (let p = 0; p < pts.length; p += 2) {
                ctx.rect(pts[p], pts[p + 1], 1.5, 1.5);
            }
            ctx.fill();
        }
    }
}
