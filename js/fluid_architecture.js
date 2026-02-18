/**
 * @file fluid_architecture.js
 * @description Simplified Navier-Stokes fluid simulation rendered as a colorful
 * density field. Mouse drags inject velocity and dye; right-click creates vortices.
 * Seed controls viscosity, diffusion, color palette, and initial flow patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FluidArchitecture extends Architecture {
    constructor() {
        super();
        this.N = 0; // Grid size
        this.size = 0;
        this.dt = 0.1;
        this.diffusion = 0.0001;
        this.viscosity = 0.00001;
        // Fluid buffers
        this.density = null;
        this.densityPrev = null;
        this.vx = null;
        this.vy = null;
        this.vxPrev = null;
        this.vyPrev = null;
        // Render
        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;
        this.colorMode = 0;
        this.hueBase = 0;
        this.dyeR = null;
        this.dyeG = null;
        this.dyeB = null;
        this.dyeRPrev = null;
        this.dyeGPrev = null;
        this.dyeBPrev = null;
        this.prevMx = 0;
        this.prevMy = 0;
    }

    init(system) {
        const rng = system.rng;
        this.N = 128;
        this.size = (this.N + 2) * (this.N + 2);
        this.dt = 0.15;
        this.diffusion = 0.00005 + rng() * 0.0002;
        this.viscosity = 0.000005 + rng() * 0.00005;

        this.density = new Float32Array(this.size);
        this.densityPrev = new Float32Array(this.size);
        this.vx = new Float32Array(this.size);
        this.vy = new Float32Array(this.size);
        this.vxPrev = new Float32Array(this.size);
        this.vyPrev = new Float32Array(this.size);
        this.dyeR = new Float32Array(this.size);
        this.dyeG = new Float32Array(this.size);
        this.dyeB = new Float32Array(this.size);
        this.dyeRPrev = new Float32Array(this.size);
        this.dyeGPrev = new Float32Array(this.size);
        this.dyeBPrev = new Float32Array(this.size);

        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.N;
        this.offscreen.height = this.N;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.N, this.N);

        this.hueBase = system.hue || rng() * 360;
        this.colorMode = Math.floor(rng() * 4);
        this.prevMx = mouse.x;
        this.prevMy = mouse.y;

        // Initial velocity field based on seed
        const initStyle = Math.floor(rng() * 4);
        for (let j = 1; j <= this.N; j++) {
            for (let i = 1; i <= this.N; i++) {
                const idx = this._IX(i, j);
                switch (initStyle) {
                    case 0: // Vortex pair
                        this.vx[idx] = Math.sin(j / this.N * Math.PI * 2) * 5;
                        this.vy[idx] = Math.cos(i / this.N * Math.PI * 2) * 5;
                        break;
                    case 1: // Diagonal flow
                        this.vx[idx] = (rng() - 0.5) * 2;
                        this.vy[idx] = (rng() - 0.5) * 2;
                        break;
                    case 2: // Converging center
                        this.vx[idx] = (this.N / 2 - i) * 0.02;
                        this.vy[idx] = (this.N / 2 - j) * 0.02;
                        break;
                    case 3: // Shear layers
                        this.vx[idx] = j < this.N / 2 ? 3 : -3;
                        this.vy[idx] = (rng() - 0.5) * 0.5;
                        break;
                }

                // Seed initial dye
                const dist = Math.sqrt((i - this.N / 2) ** 2 + (j - this.N / 2) ** 2);
                if (dist < this.N * 0.2) {
                    const hue = (this.hueBase + dist * 5) % 360;
                    const rgb = this._hslToRgb(hue, 80, 50);
                    this.dyeR[idx] = rgb[0] / 255;
                    this.dyeG[idx] = rgb[1] / 255;
                    this.dyeB[idx] = rgb[2] / 255;
                }
            }
        }
    }

    _IX(i, j) {
        return i + (this.N + 2) * j;
    }

    _setBoundary(b, x) {
        const N = this.N;
        for (let i = 1; i <= N; i++) {
            x[this._IX(0, i)] = b === 1 ? -x[this._IX(1, i)] : x[this._IX(1, i)];
            x[this._IX(N + 1, i)] = b === 1 ? -x[this._IX(N, i)] : x[this._IX(N, i)];
            x[this._IX(i, 0)] = b === 2 ? -x[this._IX(i, 1)] : x[this._IX(i, 1)];
            x[this._IX(i, N + 1)] = b === 2 ? -x[this._IX(i, N)] : x[this._IX(i, N)];
        }
        x[this._IX(0, 0)] = 0.5 * (x[this._IX(1, 0)] + x[this._IX(0, 1)]);
        x[this._IX(0, N + 1)] = 0.5 * (x[this._IX(1, N + 1)] + x[this._IX(0, N)]);
        x[this._IX(N + 1, 0)] = 0.5 * (x[this._IX(N, 0)] + x[this._IX(N + 1, 1)]);
        x[this._IX(N + 1, N + 1)] = 0.5 * (x[this._IX(N, N + 1)] + x[this._IX(N + 1, N)]);
    }

    _diffuse(b, x, x0, diff) {
        const N = this.N;
        const a = this.dt * diff * N * N;
        const c = 1 + 4 * a;
        for (let k = 0; k < 4; k++) {
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    const idx = this._IX(i, j);
                    x[idx] = (x0[idx] + a * (
                        x[this._IX(i - 1, j)] + x[this._IX(i + 1, j)] +
                        x[this._IX(i, j - 1)] + x[this._IX(i, j + 1)]
                    )) / c;
                }
            }
            this._setBoundary(b, x);
        }
    }

    _advect(b, d, d0, u, v) {
        const N = this.N;
        const dt0 = this.dt * N;
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                let x = i - dt0 * u[this._IX(i, j)];
                let y = j - dt0 * v[this._IX(i, j)];
                if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
                if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
                const i0 = Math.floor(x); const i1 = i0 + 1;
                const j0 = Math.floor(y); const j1 = j0 + 1;
                const s1 = x - i0; const s0 = 1 - s1;
                const t1 = y - j0; const t0 = 1 - t1;
                d[this._IX(i, j)] = s0 * (t0 * d0[this._IX(i0, j0)] + t1 * d0[this._IX(i0, j1)])
                    + s1 * (t0 * d0[this._IX(i1, j0)] + t1 * d0[this._IX(i1, j1)]);
            }
        }
        this._setBoundary(b, d);
    }

    _project() {
        const N = this.N;
        const div = this.vxPrev;
        const p = this.vyPrev;
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                div[this._IX(i, j)] = -0.5 / N * (
                    this.vx[this._IX(i + 1, j)] - this.vx[this._IX(i - 1, j)] +
                    this.vy[this._IX(i, j + 1)] - this.vy[this._IX(i, j - 1)]
                );
                p[this._IX(i, j)] = 0;
            }
        }
        this._setBoundary(0, div);
        this._setBoundary(0, p);
        for (let k = 0; k < 4; k++) {
            for (let j = 1; j <= N; j++) {
                for (let i = 1; i <= N; i++) {
                    p[this._IX(i, j)] = (div[this._IX(i, j)] +
                        p[this._IX(i - 1, j)] + p[this._IX(i + 1, j)] +
                        p[this._IX(i, j - 1)] + p[this._IX(i, j + 1)]) / 4;
                }
            }
            this._setBoundary(0, p);
        }
        for (let j = 1; j <= N; j++) {
            for (let i = 1; i <= N; i++) {
                this.vx[this._IX(i, j)] -= 0.5 * N * (p[this._IX(i + 1, j)] - p[this._IX(i - 1, j)]);
                this.vy[this._IX(i, j)] -= 0.5 * N * (p[this._IX(i, j + 1)] - p[this._IX(i, j - 1)]);
            }
        }
        this._setBoundary(1, this.vx);
        this._setBoundary(2, this.vy);
    }

    update(system) {
        const N = this.N;
        // Mouse interaction: inject velocity and dye
        const mx = Math.floor(mouse.x / system.width * N) + 1;
        const my = Math.floor(mouse.y / system.height * N) + 1;
        const pmx = Math.floor(this.prevMx / system.width * N) + 1;
        const pmy = Math.floor(this.prevMy / system.height * N) + 1;

        if (mx >= 1 && mx <= N && my >= 1 && my <= N) {
            const dvx = (mouse.x - this.prevMx) * 0.5;
            const dvy = (mouse.y - this.prevMy) * 0.5;
            const r = 3;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const ii = mx + dx;
                    const jj = my + dy;
                    if (ii >= 1 && ii <= N && jj >= 1 && jj <= N) {
                        const idx = this._IX(ii, jj);
                        this.vx[idx] += dvx;
                        this.vy[idx] += dvy;

                        // Inject colored dye
                        const hue = (this.hueBase + system.tick * 2) % 360;
                        const rgb = this._hslToRgb(hue, 90, 55);
                        this.dyeR[idx] += rgb[0] / 255 * 0.5;
                        this.dyeG[idx] += rgb[1] / 255 * 0.5;
                        this.dyeB[idx] += rgb[2] / 255 * 0.5;
                    }
                }
            }

            // Right-click: create vortex
            if (system.isGravityWell) {
                for (let dy = -5; dy <= 5; dy++) {
                    for (let dx = -5; dx <= 5; dx++) {
                        const ii = mx + dx;
                        const jj = my + dy;
                        if (ii >= 1 && ii <= N && jj >= 1 && jj <= N) {
                            const idx = this._IX(ii, jj);
                            this.vx[idx] += dy * 2;
                            this.vy[idx] -= dx * 2;
                        }
                    }
                }
            }
        }
        this.prevMx = mouse.x;
        this.prevMy = mouse.y;

        // Velocity step
        this.vxPrev.set(this.vx);
        this.vyPrev.set(this.vy);
        this._diffuse(1, this.vx, this.vxPrev, this.viscosity);
        this._diffuse(2, this.vy, this.vyPrev, this.viscosity);
        this._project();
        this.vxPrev.set(this.vx);
        this.vyPrev.set(this.vy);
        this._advect(1, this.vx, this.vxPrev, this.vxPrev, this.vyPrev);
        this._advect(2, this.vy, this.vyPrev, this.vxPrev, this.vyPrev);
        this._project();

        // Dye step
        this.dyeRPrev.set(this.dyeR);
        this.dyeGPrev.set(this.dyeG);
        this.dyeBPrev.set(this.dyeB);
        this._diffuse(0, this.dyeR, this.dyeRPrev, this.diffusion);
        this._diffuse(0, this.dyeG, this.dyeGPrev, this.diffusion);
        this._diffuse(0, this.dyeB, this.dyeBPrev, this.diffusion);
        this.dyeRPrev.set(this.dyeR);
        this.dyeGPrev.set(this.dyeG);
        this.dyeBPrev.set(this.dyeB);
        this._advect(0, this.dyeR, this.dyeRPrev, this.vx, this.vy);
        this._advect(0, this.dyeG, this.dyeGPrev, this.vx, this.vy);
        this._advect(0, this.dyeB, this.dyeBPrev, this.vx, this.vy);

        // Slow dye decay
        for (let i = 0; i < this.size; i++) {
            this.dyeR[i] *= 0.999;
            this.dyeG[i] *= 0.999;
            this.dyeB[i] *= 0.999;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const N = this.N;
        const data = this.imageData.data;

        for (let j = 0; j < N; j++) {
            for (let i = 0; i < N; i++) {
                const idx = this._IX(i + 1, j + 1);
                const pi = (j * N + i) * 4;

                // Color from RGB dye channels
                let r = this.dyeR[idx] * 255;
                let g = this.dyeG[idx] * 255;
                let b = this.dyeB[idx] * 255;

                // Add velocity visualization
                if (this.colorMode >= 2) {
                    const speed = Math.sqrt(this.vx[idx] ** 2 + this.vy[idx] ** 2);
                    const boost = Math.min(1, speed * 0.3);
                    r += boost * 40;
                    g += boost * 20;
                    b += boost * 60;
                }

                data[pi] = Math.min(255, Math.max(0, r));
                data[pi + 1] = Math.min(255, Math.max(0, g));
                data[pi + 2] = Math.min(255, Math.max(0, b));
                data[pi + 3] = 255;
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.offscreen, 0, 0, system.width, system.height);
    }

    _hslToRgb(h, s, l) {
        h = h % 360; s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    }
}
