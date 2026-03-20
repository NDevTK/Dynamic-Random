/**
 * @file webgpu_fluid_architecture.js
 * @description Grid-based 2D fluid simulation. WebGPU path uses 128×128 compute
 * shaders for density + velocity advection/diffusion/projection. Canvas 2D fallback
 * uses a 64×64 JS Navier-Stokes solver. Dye is injected at mouse position; rendered
 * via ImageData for efficient pixel-level coloring.
 */

import { Architecture } from './background_architectures.js';
import { webgpuCompute } from './webgpu_compute.js';
import { mouse } from './state.js';

// ---------------------------------------------------------------------------
// WGSL shaders
// ---------------------------------------------------------------------------

/** Diffuse a scalar field: x = (x0 + a*(neighbors)) / (1+4a) — 4 Gauss-Seidel iters */
const DIFFUSE_SHADER = /* wgsl */`
struct Uniforms { N: u32, a: f32, c: f32, _pad: f32 }
@group(0) @binding(0) var<uniform>            uni: Uniforms;
@group(0) @binding(1) var<storage, read>      x0:  array<f32>;
@group(0) @binding(2) var<storage, read_write> x:  array<f32>;

fn IX(i: u32, j: u32) -> u32 { return i + (uni.N + 2u) * j; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x + 1u;
    let j = id.y + 1u;
    if (i > uni.N || j > uni.N) { return; }
    let idx = IX(i, j);
    x[idx] = (x0[idx] + uni.a * (
        x[IX(i - 1u, j)] + x[IX(i + 1u, j)] +
        x[IX(i, j - 1u)] + x[IX(i, j + 1u)]
    )) / uni.c;
}
`;

/** Advect a scalar field backwards along velocity (u,v) */
const ADVECT_SHADER = /* wgsl */`
struct Uniforms { N: u32, dt0: f32, _p0: u32, _p1: u32 }
@group(0) @binding(0) var<uniform>            uni:  Uniforms;
@group(0) @binding(1) var<storage, read>      d0:   array<f32>;
@group(0) @binding(2) var<storage, read>      u:    array<f32>;
@group(0) @binding(3) var<storage, read>      v:    array<f32>;
@group(0) @binding(4) var<storage, read_write> d:   array<f32>;

fn IX(i: u32, j: u32) -> u32 { return i + (uni.N + 2u) * j; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x + 1u;
    let j = id.y + 1u;
    if (i > uni.N || j > uni.N) { return; }
    let N = f32(uni.N);
    var px = f32(i) - uni.dt0 * u[IX(i, j)];
    var py = f32(j) - uni.dt0 * v[IX(i, j)];
    px = clamp(px, 0.5, N + 0.5);
    py = clamp(py, 0.5, N + 0.5);
    let i0 = u32(px); let i1 = i0 + 1u;
    let j0 = u32(py); let j1 = j0 + 1u;
    let s1 = px - f32(i0); let s0 = 1.0 - s1;
    let t1 = py - f32(j0); let t0 = 1.0 - t1;
    d[IX(i, j)] = s0*(t0*d0[IX(i0,j0)] + t1*d0[IX(i0,j1)])
                + s1*(t0*d0[IX(i1,j0)] + t1*d0[IX(i1,j1)]);
}
`;

/** Project step: compute divergence, solve pressure, subtract gradient */
const PROJECT_DIV_SHADER = /* wgsl */`
struct Uniforms { N: u32, _p0: u32, _p1: u32, _p2: u32 }
@group(0) @binding(0) var<uniform>            uni: Uniforms;
@group(0) @binding(1) var<storage, read>      vx:  array<f32>;
@group(0) @binding(2) var<storage, read>      vy:  array<f32>;
@group(0) @binding(3) var<storage, read_write> div: array<f32>;
@group(0) @binding(4) var<storage, read_write> p:   array<f32>;

fn IX(i: u32, j: u32) -> u32 { return i + (uni.N + 2u) * j; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x + 1u;
    let j = id.y + 1u;
    if (i > uni.N || j > uni.N) { return; }
    let N = f32(uni.N);
    div[IX(i,j)] = -0.5 / N * (
        vx[IX(i+1u,j)] - vx[IX(i-1u,j)] +
        vy[IX(i,j+1u)] - vy[IX(i,j-1u)]
    );
    p[IX(i,j)] = 0.0;
}
`;

const PROJECT_GRAD_SHADER = /* wgsl */`
struct Uniforms { N: u32, _p0: u32, _p1: u32, _p2: u32 }
@group(0) @binding(0) var<uniform>             uni: Uniforms;
@group(0) @binding(1) var<storage, read>       p:   array<f32>;
@group(0) @binding(2) var<storage, read_write> vx:  array<f32>;
@group(0) @binding(3) var<storage, read_write> vy:  array<f32>;

fn IX(i: u32, j: u32) -> u32 { return i + (uni.N + 2u) * j; }

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x + 1u;
    let j = id.y + 1u;
    if (i > uni.N || j > uni.N) { return; }
    let N = f32(uni.N);
    vx[IX(i,j)] -= 0.5 * N * (p[IX(i+1u,j)] - p[IX(i-1u,j)]);
    vy[IX(i,j)] -= 0.5 * N * (p[IX(i,j+1u)] - p[IX(i,j-1u)]);
}
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GPU_N = 128;
const CPU_N = 64;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export class WebGPUFluidArchitecture extends Architecture {
    constructor() {
        super();
        this.N = 0;
        this.useGPU = false;
        this.hueBase = 200;
        this.prevMx = 0;
        this.prevMy = 0;
        this.tick = 0;

        // Offscreen canvas for ImageData rendering
        this._offscreen = null;
        this._offCtx = null;
        this._imageData = null;

        // CPU arrays
        this._vx = null; this._vy = null;
        this._vxP = null; this._vyP = null;
        this._dyeR = null; this._dyeG = null; this._dyeB = null;
        this._dyeRP = null; this._dyeGP = null; this._dyeBP = null;

        // GPU objects
        this._dev = null;
        this._bufs = null;
        this._pipelines = null;
        this._gpuReady = false;
        this._gpuDye = null; // Float32Array readback [R, G, B interleaved per cell]
        this._stagingBuf = null;
        this._stagingMapped = false;
    }

    // -------------------------------------------------------------------------
    // init
    // -------------------------------------------------------------------------
    async init(system) {
        this.hueBase = system.hue || 200;
        this.prevMx = mouse.x;
        this.prevMy = mouse.y;
        this.tick = 0;

        if (!webgpuCompute.available) {
            await webgpuCompute.init();
        }

        if (webgpuCompute.available) {
            this._initGPU(system);
        } else {
            this._initCPU(system);
        }

        // Shared offscreen canvas
        this.N = this.useGPU ? GPU_N : CPU_N;
        this._offscreen = document.createElement('canvas');
        this._offscreen.width = this.N;
        this._offscreen.height = this.N;
        this._offCtx = this._offscreen.getContext('2d');
        this._imageData = this._offCtx.createImageData(this.N, this.N);
    }

    // -------------------------------------------------------------------------
    // GPU setup
    // -------------------------------------------------------------------------
    _initGPU(system) {
        const device = webgpuCompute.device;
        const N = GPU_N;
        const size = (N + 2) * (N + 2);
        const bytes = size * 4;

        const BU = GPUBufferUsage;
        const mk = (usage) => webgpuCompute.createBuffer(bytes, usage);
        const mkU = (sz, usage) => webgpuCompute.createBuffer(sz, usage);

        // Field buffers: vx, vy, vxP, vyP, dyeR, dyeG, dyeB, dyeRP, dyeGP, dyeBP, div, p
        const SRWC = BU.STORAGE | BU.COPY_SRC | BU.COPY_DST;
        const SRC  = BU.STORAGE | BU.COPY_DST;
        const bufs = {
            vx:   mk(SRWC), vy:   mk(SRWC),
            vxP:  mk(SRC),  vyP:  mk(SRC),
            dyeR: mk(SRWC), dyeG: mk(SRWC), dyeB: mk(SRWC),
            dyeRP:mk(SRC),  dyeGP:mk(SRC),  dyeBP:mk(SRC),
            div:  mk(SRWC), p:    mk(SRWC),
            uniDiff:  mkU(16, BU.UNIFORM | BU.COPY_DST),
            uniAdvect:mkU(16, BU.UNIFORM | BU.COPY_DST),
            uniProj:  mkU(16, BU.UNIFORM | BU.COPY_DST),
        };
        this._bufs = bufs;

        // Initialize velocity with a gentle vortex
        const vxInit = new Float32Array(size);
        const vyInit = new Float32Array(size);
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                const idx = i + (N + 2) * j;
                vxInit[idx] =  Math.sin(j / N * Math.PI * 2) * 3;
                vyInit[idx] =  Math.cos(i / N * Math.PI * 2) * 3;
            }
        }
        device.queue.writeBuffer(bufs.vx, 0, vxInit);
        device.queue.writeBuffer(bufs.vy, 0, vyInit);

        // Seed initial dye
        const dyeR = new Float32Array(size);
        const dyeG = new Float32Array(size);
        const dyeB = new Float32Array(size);
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                const idx = i + (N + 2) * j;
                const ni = i / N, nj = j / N;
                const v = Math.sin(ni * Math.PI * 3) * Math.cos(nj * Math.PI * 3) * 0.5 + 0.5;
                if (v > 0.4) {
                    const hue = (this.hueBase + v * 120) % 360;
                    const rgb = hslToRgb(hue, 80, 55);
                    const intensity = (v - 0.4) * 1.6;
                    dyeR[idx] = rgb[0] / 255 * intensity;
                    dyeG[idx] = rgb[1] / 255 * intensity;
                    dyeB[idx] = rgb[2] / 255 * intensity;
                }
            }
        }
        device.queue.writeBuffer(bufs.dyeR, 0, dyeR);
        device.queue.writeBuffer(bufs.dyeG, 0, dyeG);
        device.queue.writeBuffer(bufs.dyeB, 0, dyeB);

        // Build pipelines
        const makePipe = (shader, entries) => webgpuCompute.createComputePipeline(shader, entries);
        const uniformEntry = (binding) => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } });
        const storageROEntry = (binding) => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } });
        const storageRWEntry = (binding) => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } });

        const pDiff   = makePipe(DIFFUSE_SHADER,    [uniformEntry(0), storageROEntry(1), storageRWEntry(2)]);
        const pAdvect = makePipe(ADVECT_SHADER,     [uniformEntry(0), storageROEntry(1), storageROEntry(2), storageROEntry(3), storageRWEntry(4)]);
        const pProjD  = makePipe(PROJECT_DIV_SHADER,[uniformEntry(0), storageROEntry(1), storageROEntry(2), storageRWEntry(3), storageRWEntry(4)]);
        const pProjG  = makePipe(PROJECT_GRAD_SHADER,[uniformEntry(0), storageROEntry(1), storageRWEntry(2), storageRWEntry(3)]);

        if (!pDiff || !pAdvect || !pProjD || !pProjG) {
            this._initCPU(system);
            return;
        }

        this._pipelines = { diff: pDiff, advect: pAdvect, projDiv: pProjD, projGrad: pProjG };

        // Staging buffer for dye readback (3 channels × size floats)
        this._stagingBuf = webgpuCompute.createBuffer(
            bytes * 3,
            GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        );
        this._gpuDye = null;
        this._stagingMapped = false;
        this._dev = device;
        this.useGPU = true;
        this._gpuReady = true;
        this.N = GPU_N;
    }

    // -------------------------------------------------------------------------
    // CPU setup
    // -------------------------------------------------------------------------
    _initCPU(system) {
        this.useGPU = false;
        const N = CPU_N;
        const size = (N + 2) * (N + 2);
        this.N = N;

        this._vx   = new Float32Array(size); this._vy   = new Float32Array(size);
        this._vxP  = new Float32Array(size); this._vyP  = new Float32Array(size);
        this._dyeR = new Float32Array(size); this._dyeG = new Float32Array(size); this._dyeB = new Float32Array(size);
        this._dyeRP= new Float32Array(size); this._dyeGP= new Float32Array(size); this._dyeBP= new Float32Array(size);

        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                const idx = i + (N + 2) * j;
                this._vx[idx] =  Math.sin(j / N * Math.PI * 2) * 2;
                this._vy[idx] =  Math.cos(i / N * Math.PI * 2) * 2;
                const v = Math.sin(i / N * Math.PI * 3) * Math.cos(j / N * Math.PI * 3) * 0.5 + 0.5;
                if (v > 0.4) {
                    const hue = (this.hueBase + v * 120) % 360;
                    const rgb = hslToRgb(hue, 80, 55);
                    const intensity = (v - 0.4) * 1.6;
                    this._dyeR[idx] = rgb[0] / 255 * intensity;
                    this._dyeG[idx] = rgb[1] / 255 * intensity;
                    this._dyeB[idx] = rgb[2] / 255 * intensity;
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // update
    // -------------------------------------------------------------------------
    update(system) {
        this.tick++;
        const N = this.N;
        const mx = Math.floor(mouse.x / system.width  * N) + 1;
        const my = Math.floor(mouse.y / system.height * N) + 1;
        const pmx = Math.floor(this.prevMx / system.width  * N) + 1;
        const pmy = Math.floor(this.prevMy / system.height * N) + 1;
        const dvx = (mouse.x - this.prevMx) * 0.4;
        const dvy = (mouse.y - this.prevMy) * 0.4;
        this.prevMx = mouse.x;
        this.prevMy = mouse.y;

        if (this.useGPU && this._gpuReady) {
            this._updateGPU(system, mx, my, dvx, dvy);
        } else {
            this._updateCPU(system, mx, my, dvx, dvy);
        }
    }

    // --- GPU update ---
    _updateGPU(system, mx, my, dvx, dvy) {
        const device = this._dev;
        const N = GPU_N;
        const size = (N + 2) * (N + 2);
        const bytes = size * 4;
        const bufs = this._bufs;
        const pipes = this._pipelines;
        const workgroups = Math.ceil(N / 8);

        // Inject mouse velocity and dye (CPU-side patch written to GPU)
        if (mx >= 1 && mx <= N && my >= 1 && my <= N) {
            const patchSize = 5;
            const patchCells = [];
            const vxPatch = new Float32Array(size);
            const vyPatch = new Float32Array(size);
            const drPatch = new Float32Array(size);
            const dgPatch = new Float32Array(size);
            const dbPatch = new Float32Array(size);
            const hue = (this.hueBase + this.tick * 1.5) % 360;
            const rgb = hslToRgb(hue, 90, 60);
            for (let dy = -patchSize; dy <= patchSize; dy++) {
                for (let dx = -patchSize; dx <= patchSize; dx++) {
                    const ii = mx + dx, jj = my + dy;
                    if (ii < 1 || ii > N || jj < 1 || jj > N) continue;
                    const idx = ii + (N + 2) * jj;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const w = Math.max(0, 1 - dist / patchSize);
                    vxPatch[idx] = dvx * w;
                    vyPatch[idx] = dvy * w;
                    drPatch[idx] = rgb[0] / 255 * 0.4 * w;
                    dgPatch[idx] = rgb[1] / 255 * 0.4 * w;
                    dbPatch[idx] = rgb[2] / 255 * 0.4 * w;
                }
            }
            device.queue.writeBuffer(bufs.vxP,  0, vxPatch);
            device.queue.writeBuffer(bufs.vyP,  0, vyPatch);
            device.queue.writeBuffer(bufs.dyeRP,0, drPatch);
            device.queue.writeBuffer(bufs.dyeGP,0, dgPatch);
            device.queue.writeBuffer(bufs.dyeBP,0, dbPatch);
        }

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();

        const diffUni  = new Float32Array(4);
        const advectUni = new Uint32Array(4);
        const projUni  = new Uint32Array(4);

        const dt = 0.15 * (system.speedMultiplier || 1);
        const viscosity = 0.00001;
        const diffusion = 0.00008;

        // Helper: dispatch a compute pass for a given pipeline + bind group
        const dispatch = (pipeResult, bindGroupEntries) => {
            const bg = device.createBindGroup({
                layout: pipeResult.bindGroupLayout,
                entries: bindGroupEntries
            });
            pass.setPipeline(pipeResult.pipeline);
            pass.setBindGroup(0, bg);
            pass.dispatchWorkgroups(workgroups, workgroups);
        };

        const buf = (b) => ({ buffer: b });

        // Velocity diffuse
        const va = dt * viscosity * N * N;
        diffUni.set([0, va, 1 + 4 * va, 0]);
        new Uint32Array(diffUni.buffer)[0] = N;
        device.queue.writeBuffer(bufs.uniDiff, 0, diffUni);
        for (let k = 0; k < 4; k++) {
            dispatch(pipes.diff, [{binding:0,resource:buf(bufs.uniDiff)},{binding:1,resource:buf(bufs.vx)},{binding:2,resource:buf(bufs.vxP)}]);
            dispatch(pipes.diff, [{binding:0,resource:buf(bufs.uniDiff)},{binding:1,resource:buf(bufs.vy)},{binding:2,resource:buf(bufs.vyP)}]);
        }

        // Project after diffuse
        projUni[0] = N;
        device.queue.writeBuffer(bufs.uniProj, 0, projUni);
        dispatch(pipes.projDiv,[{binding:0,resource:buf(bufs.uniProj)},{binding:1,resource:buf(bufs.vxP)},{binding:2,resource:buf(bufs.vyP)},{binding:3,resource:buf(bufs.div)},{binding:4,resource:buf(bufs.p)}]);
        for (let k = 0; k < 4; k++) {
            dispatch(pipes.diff,[{binding:0,resource:buf(bufs.uniDiff)},{binding:1,resource:buf(bufs.div)},{binding:2,resource:buf(bufs.p)}]);
        }
        dispatch(pipes.projGrad,[{binding:0,resource:buf(bufs.uniProj)},{binding:1,resource:buf(bufs.p)},{binding:2,resource:buf(bufs.vxP)},{binding:3,resource:buf(bufs.vyP)}]);

        // Advect velocity
        advectUni[0] = N;
        const fAdvect = new Float32Array(advectUni.buffer);
        fAdvect[1] = dt * N;
        device.queue.writeBuffer(bufs.uniAdvect, 0, advectUni);
        dispatch(pipes.advect,[{binding:0,resource:buf(bufs.uniAdvect)},{binding:1,resource:buf(bufs.vxP)},{binding:2,resource:buf(bufs.vxP)},{binding:3,resource:buf(bufs.vyP)},{binding:4,resource:buf(bufs.vx)}]);
        dispatch(pipes.advect,[{binding:0,resource:buf(bufs.uniAdvect)},{binding:1,resource:buf(bufs.vyP)},{binding:2,resource:buf(bufs.vxP)},{binding:3,resource:buf(bufs.vyP)},{binding:4,resource:buf(bufs.vy)}]);

        // Project after advect
        dispatch(pipes.projDiv,[{binding:0,resource:buf(bufs.uniProj)},{binding:1,resource:buf(bufs.vx)},{binding:2,resource:buf(bufs.vy)},{binding:3,resource:buf(bufs.div)},{binding:4,resource:buf(bufs.p)}]);
        for (let k = 0; k < 4; k++) {
            dispatch(pipes.diff,[{binding:0,resource:buf(bufs.uniDiff)},{binding:1,resource:buf(bufs.div)},{binding:2,resource:buf(bufs.p)}]);
        }
        dispatch(pipes.projGrad,[{binding:0,resource:buf(bufs.uniProj)},{binding:1,resource:buf(bufs.p)},{binding:2,resource:buf(bufs.vx)},{binding:3,resource:buf(bufs.vy)}]);

        // Dye diffuse + advect
        const da = dt * diffusion * N * N;
        diffUni.set([0, da, 1 + 4 * da, 0]);
        new Uint32Array(diffUni.buffer)[0] = N;
        device.queue.writeBuffer(bufs.uniDiff, 0, diffUni);
        for (const [cur, prev] of [[bufs.dyeR, bufs.dyeRP],[bufs.dyeG, bufs.dyeGP],[bufs.dyeB, bufs.dyeBP]]) {
            for (let k = 0; k < 2; k++) {
                dispatch(pipes.diff,[{binding:0,resource:buf(bufs.uniDiff)},{binding:1,resource:buf(cur)},{binding:2,resource:buf(prev)}]);
            }
            dispatch(pipes.advect,[{binding:0,resource:buf(bufs.uniAdvect)},{binding:1,resource:buf(prev)},{binding:2,resource:buf(bufs.vx)},{binding:3,resource:buf(bufs.vy)},{binding:4,resource:buf(cur)}]);
        }

        // Readback dye (non-blocking)
        if (!this._stagingMapped) {
            encoder.copyBufferToBuffer(bufs.dyeR, 0, this._stagingBuf, 0,          bytes);
            encoder.copyBufferToBuffer(bufs.dyeG, 0, this._stagingBuf, bytes,      bytes);
            encoder.copyBufferToBuffer(bufs.dyeB, 0, this._stagingBuf, bytes * 2,  bytes);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);

        if (!this._stagingMapped) {
            this._stagingMapped = true;
            this._stagingBuf.mapAsync(GPUMapMode.READ).then(() => {
                const raw = this._stagingBuf.getMappedRange();
                this._gpuDye = new Float32Array(raw.slice(0));
                this._stagingBuf.unmap();
                this._stagingMapped = false;
            }).catch(() => { this._stagingMapped = false; });
        }
    }

    // --- CPU update ---
    _updateCPU(system, mx, my, dvx, dvy) {
        const N = this.N;
        const dt = 0.15 * (system.speedMultiplier || 1);
        const viscosity = 0.00001;
        const diffusion = 0.00008;

        // Inject mouse
        if (mx >= 1 && mx <= N && my >= 1 && my <= N) {
            const r = 3;
            const hue = (this.hueBase + this.tick * 1.5) % 360;
            const rgb = hslToRgb(hue, 90, 60);
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const ii = mx + dx, jj = my + dy;
                    if (ii < 1 || ii > N || jj < 1 || jj > N) continue;
                    const idx = ii + (N + 2) * jj;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const w = Math.max(0, 1 - dist / r);
                    this._vx[idx]   += dvx * w;
                    this._vy[idx]   += dvy * w;
                    this._dyeR[idx] += rgb[0] / 255 * 0.4 * w;
                    this._dyeG[idx] += rgb[1] / 255 * 0.4 * w;
                    this._dyeB[idx] += rgb[2] / 255 * 0.4 * w;
                }
            }
        }

        // Auto-inject small dye pulses to keep it alive
        if (this.tick % 90 === 0) {
            const pi = Math.floor(Math.random() * N) + 1;
            const pj = Math.floor(Math.random() * N) + 1;
            const idx = pi + (N + 2) * pj;
            const hue = (this.hueBase + Math.random() * 180) % 360;
            const rgb = hslToRgb(hue, 90, 60);
            this._dyeR[idx] += rgb[0] / 255 * 0.6;
            this._dyeG[idx] += rgb[1] / 255 * 0.6;
            this._dyeB[idx] += rgb[2] / 255 * 0.6;
        }

        // Velocity step
        this._diffuseCPU(1, this._vxP, this._vx, viscosity, dt);
        this._diffuseCPU(2, this._vyP, this._vy, viscosity, dt);
        this._projectCPU(this._vxP, this._vyP, this._vx, this._vy);
        this._advectCPU(1, this._vx, this._vxP, this._vxP, this._vyP, dt);
        this._advectCPU(2, this._vy, this._vyP, this._vxP, this._vyP, dt);
        this._projectCPU(this._vx, this._vy, this._vxP, this._vyP);

        // Dye step
        for (const [cur, prev] of [
            [this._dyeR, this._dyeRP], [this._dyeG, this._dyeGP], [this._dyeB, this._dyeBP]
        ]) {
            this._diffuseCPU(0, prev, cur, diffusion, dt);
            this._advectCPU(0, cur, prev, this._vx, this._vy, dt);
        }
    }

    _IX(i, j) { return i + (this.N + 2) * j; }

    _setBoundaryCPU(b, x) {
        const N = this.N;
        for (let i = 1; i <= N; i++) {
            x[this._IX(0,i)]   = b===1 ? -x[this._IX(1,i)]   : x[this._IX(1,i)];
            x[this._IX(N+1,i)] = b===1 ? -x[this._IX(N,i)]   : x[this._IX(N,i)];
            x[this._IX(i,0)]   = b===2 ? -x[this._IX(i,1)]   : x[this._IX(i,1)];
            x[this._IX(i,N+1)] = b===2 ? -x[this._IX(i,N)]   : x[this._IX(i,N)];
        }
        x[this._IX(0,0)]     = 0.5*(x[this._IX(1,0)]   + x[this._IX(0,1)]);
        x[this._IX(0,N+1)]   = 0.5*(x[this._IX(1,N+1)] + x[this._IX(0,N)]);
        x[this._IX(N+1,0)]   = 0.5*(x[this._IX(N,0)]   + x[this._IX(N+1,1)]);
        x[this._IX(N+1,N+1)] = 0.5*(x[this._IX(N,N+1)] + x[this._IX(N+1,N)]);
    }

    _diffuseCPU(b, x, x0, diff, dt) {
        const N = this.N;
        const a = dt * diff * N * N;
        const c = 1 + 4 * a;
        for (let k = 0; k < 4; k++) {
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    const idx = this._IX(i,j);
                    x[idx] = (x0[idx] + a*(x[this._IX(i-1,j)]+x[this._IX(i+1,j)]+x[this._IX(i,j-1)]+x[this._IX(i,j+1)]))/c;
                }
            }
            this._setBoundaryCPU(b, x);
        }
    }

    _advectCPU(b, d, d0, u, v, dt) {
        const N = this.N;
        const dt0 = dt * N;
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                let px = i - dt0 * u[this._IX(i,j)];
                let py = j - dt0 * v[this._IX(i,j)];
                px = Math.max(0.5, Math.min(N + 0.5, px));
                py = Math.max(0.5, Math.min(N + 0.5, py));
                const i0 = Math.floor(px), i1 = i0+1;
                const j0 = Math.floor(py), j1 = j0+1;
                const s1 = px-i0, s0 = 1-s1, t1 = py-j0, t0 = 1-t1;
                d[this._IX(i,j)] = s0*(t0*d0[this._IX(i0,j0)]+t1*d0[this._IX(i0,j1)])
                                 + s1*(t0*d0[this._IX(i1,j0)]+t1*d0[this._IX(i1,j1)]);
            }
        }
        this._setBoundaryCPU(b, d);
    }

    _projectCPU(vx, vy, p, div) {
        const N = this.N;
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                div[this._IX(i,j)] = -0.5/N*(vx[this._IX(i+1,j)]-vx[this._IX(i-1,j)]+vy[this._IX(i,j+1)]-vy[this._IX(i,j-1)]);
                p[this._IX(i,j)] = 0;
            }
        }
        this._setBoundaryCPU(0, div);
        this._setBoundaryCPU(0, p);
        for (let k = 0; k < 4; k++) {
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    p[this._IX(i,j)] = (div[this._IX(i,j)]+p[this._IX(i-1,j)]+p[this._IX(i+1,j)]+p[this._IX(i,j-1)]+p[this._IX(i,j+1)])/4;
                }
            }
            this._setBoundaryCPU(0, p);
        }
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                vx[this._IX(i,j)] -= 0.5*N*(p[this._IX(i+1,j)]-p[this._IX(i-1,j)]);
                vy[this._IX(i,j)] -= 0.5*N*(p[this._IX(i,j+1)]-p[this._IX(i,j-1)]);
            }
        }
        this._setBoundaryCPU(1, vx);
        this._setBoundaryCPU(2, vy);
    }

    // -------------------------------------------------------------------------
    // draw
    // -------------------------------------------------------------------------
    draw(system) {
        const N = this.N;
        const pixels = this._imageData.data;

        if (this.useGPU && this._gpuDye) {
            const size = (N + 2) * (N + 2);
            const rBuf = this._gpuDye;
            const gBuf = this._gpuDye.subarray(size, size * 2);
            const bBuf = this._gpuDye.subarray(size * 2, size * 3);
            let p = 0;
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    const idx = i + (N + 2) * j;
                    pixels[p]     = Math.min(255, rBuf[idx] * 255 * 2);
                    pixels[p + 1] = Math.min(255, gBuf[idx] * 255 * 2);
                    pixels[p + 2] = Math.min(255, bBuf[idx] * 255 * 2);
                    pixels[p + 3] = 220;
                    p += 4;
                }
            }
        } else if (!this.useGPU) {
            let p = 0;
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    const idx = i + (N + 2) * j;
                    pixels[p]     = Math.min(255, this._dyeR[idx] * 255 * 2);
                    pixels[p + 1] = Math.min(255, this._dyeG[idx] * 255 * 2);
                    pixels[p + 2] = Math.min(255, this._dyeB[idx] * 255 * 2);
                    pixels[p + 3] = 220;
                    p += 4;
                }
            }
        } else {
            return; // no data yet
        }

        this._offCtx.putImageData(this._imageData, 0, 0);

        const ctx = system.ctx;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this._offscreen, 0, 0, system.width, system.height);
        ctx.restore();
    }
}
