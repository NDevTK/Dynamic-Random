/**
 * @file reaction_diffusion_architecture.js
 * @description Turing pattern reaction-diffusion system that generates organic,
 * biological patterns in real-time. Uses Gray-Scott model with seed-driven parameters
 * producing spots, stripes, labyrinthine, and coral-like patterns.
 * Interactive: mouse repels/attracts chemicals, clicks seed new reaction zones.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class ReactionDiffusionArchitecture extends Architecture {
    constructor() {
        super();
        this.gridA = null;
        this.gridB = null;
        this.nextA = null;
        this.nextB = null;
        this.cols = 0;
        this.rows = 0;
        this.scale = 3; // pixel scale for performance
        this.imageData = null;
        this.offscreen = null;
        this.offCtx = null;
        this.feed = 0.055;
        this.kill = 0.062;
        this.dA = 1.0;
        this.dB = 0.5;
        this.colorMode = 0;
        this.hueBase = 0;
        this.tick = 0;
        this.presetName = '';
    }

    init(system) {
        const rng = system.rng;
        this.scale = 3;
        this.cols = Math.ceil(system.width / this.scale);
        this.rows = Math.ceil(system.height / this.scale);
        const size = this.cols * this.rows;

        this.gridA = new Float32Array(size).fill(1);
        this.gridB = new Float32Array(size).fill(0);
        this.nextA = new Float32Array(size);
        this.nextB = new Float32Array(size);

        // Create offscreen canvas for pixel manipulation
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.cols;
        this.offscreen.height = this.rows;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.cols, this.rows);

        // Seed-driven parameter presets producing drastically different patterns
        const presets = [
            { name: 'Mitosis', feed: 0.0367, kill: 0.0649, dA: 1.0, dB: 0.5 },      // Dividing cells
            { name: 'Coral', feed: 0.0545, kill: 0.062, dA: 1.0, dB: 0.5 },          // Coral growth
            { name: 'Maze', feed: 0.029, kill: 0.057, dA: 1.0, dB: 0.5 },            // Labyrinthine
            { name: 'Spots', feed: 0.025, kill: 0.06, dA: 1.0, dB: 0.5 },            // Spot pattern
            { name: 'Worms', feed: 0.078, kill: 0.061, dA: 1.0, dB: 0.5 },           // Worm-like
            { name: 'Bubbles', feed: 0.012, kill: 0.05, dA: 1.0, dB: 0.5 },          // Bubbling
            { name: 'Spirals', feed: 0.014, kill: 0.054, dA: 1.0, dB: 0.5 },         // Spiral waves
            { name: 'Fingerprint', feed: 0.06, kill: 0.062, dA: 1.0, dB: 0.5 },      // Fingerprint
            { name: 'Pulsating', feed: 0.026, kill: 0.051, dA: 1.0, dB: 0.5 },       // Pulsing blobs
            { name: 'Solitons', feed: 0.03, kill: 0.062, dA: 1.0, dB: 0.5 },         // Moving solitons
        ];

        const preset = presets[Math.floor(rng() * presets.length)];
        this.feed = preset.feed + (rng() - 0.5) * 0.004;
        this.kill = preset.kill + (rng() - 0.5) * 0.003;
        this.dA = preset.dA;
        this.dB = preset.dB;
        this.presetName = preset.name;

        // Color theming
        this.hueBase = system.hue || rng() * 360;
        this.colorMode = Math.floor(rng() * 5);

        // Seed initial reaction zones
        const seedCount = 3 + Math.floor(rng() * 8);
        for (let s = 0; s < seedCount; s++) {
            const cx = Math.floor(rng() * this.cols);
            const cy = Math.floor(rng() * this.rows);
            const radius = 3 + Math.floor(rng() * 8);
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy <= radius * radius) {
                        const nx = (cx + dx + this.cols) % this.cols;
                        const ny = (cy + dy + this.rows) % this.rows;
                        const idx = ny * this.cols + nx;
                        this.gridB[idx] = 1;
                    }
                }
            }
        }
    }

    update(system) {
        this.tick++;
        const cols = this.cols;
        const rows = this.rows;
        const f = this.feed;
        const k = this.kill;
        const dA = this.dA;
        const dB = this.dB;

        // Mouse interaction: inject chemical B near cursor
        const mx = Math.floor(mouse.x / this.scale);
        const my = Math.floor(mouse.y / this.scale);
        const mouseR = system.isGravityWell ? 12 : 4;
        for (let dy = -mouseR; dy <= mouseR; dy++) {
            for (let dx = -mouseR; dx <= mouseR; dx++) {
                if (dx * dx + dy * dy <= mouseR * mouseR) {
                    const nx = (mx + dx + cols) % cols;
                    const ny = (my + dy + rows) % rows;
                    const idx = ny * cols + nx;
                    this.gridB[idx] = Math.min(1, this.gridB[idx] + 0.15);
                }
            }
        }

        // Multi-step simulation per frame for speed
        const steps = 4;
        for (let step = 0; step < steps; step++) {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    const a = this.gridA[idx];
                    const b = this.gridB[idx];

                    // 5-point Laplacian stencil with wrapping
                    const xp = (x + 1) % cols;
                    const xm = (x - 1 + cols) % cols;
                    const yp = (y + 1) % rows;
                    const ym = (y - 1 + rows) % rows;

                    const lapA = this.gridA[y * cols + xp] + this.gridA[y * cols + xm]
                        + this.gridA[yp * cols + x] + this.gridA[ym * cols + x]
                        - 4 * a;
                    const lapB = this.gridB[y * cols + xp] + this.gridB[y * cols + xm]
                        + this.gridB[yp * cols + x] + this.gridB[ym * cols + x]
                        - 4 * b;

                    const reaction = a * b * b;
                    this.nextA[idx] = a + (dA * lapA - reaction + f * (1 - a));
                    this.nextB[idx] = b + (dB * lapB + reaction - (k + f) * b);

                    // Clamp
                    if (this.nextA[idx] < 0) this.nextA[idx] = 0;
                    if (this.nextA[idx] > 1) this.nextA[idx] = 1;
                    if (this.nextB[idx] < 0) this.nextB[idx] = 0;
                    if (this.nextB[idx] > 1) this.nextB[idx] = 1;
                }
            }

            // Swap buffers
            const tmpA = this.gridA;
            const tmpB = this.gridB;
            this.gridA = this.nextA;
            this.gridB = this.nextB;
            this.nextA = tmpA;
            this.nextB = tmpB;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const data = this.imageData.data;
        const cols = this.cols;
        const rows = this.rows;
        const t = this.tick * 0.01;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                const pi = idx * 4;
                const a = this.gridA[idx];
                const b = this.gridB[idx];
                const v = Math.max(0, Math.min(1, a - b));

                let r, g, bl;

                switch (this.colorMode) {
                    case 0: // Deep ocean blues
                        r = (1 - v) * 10;
                        g = (1 - v) * 50 + v * 20;
                        bl = (1 - v) * 140 + v * 30;
                        break;
                    case 1: // Bio-luminescent green
                        r = (1 - v) * 5;
                        g = (1 - v) * 200 + v * 10;
                        bl = (1 - v) * 80;
                        break;
                    case 2: // Volcanic ember
                        r = (1 - v) * 220 + v * 20;
                        g = (1 - v) * 80;
                        bl = (1 - v) * 20;
                        break;
                    case 3: // Phantom purple
                        r = (1 - v) * 130 + v * 5;
                        g = (1 - v) * 30;
                        bl = (1 - v) * 200 + v * 20;
                        break;
                    case 4: // Hue-shifting based on seed
                    default: {
                        const hue = (this.hueBase + (1 - v) * 60 + Math.sin(t) * 20) % 360;
                        const sat = 0.7 + v * 0.3;
                        const light = (1 - v) * 0.5;
                        // Quick HSL to RGB
                        const c = (1 - Math.abs(2 * light - 1)) * sat;
                        const xx = c * (1 - Math.abs((hue / 60) % 2 - 1));
                        const m = light - c / 2;
                        let r1, g1, b1;
                        if (hue < 60) { r1 = c; g1 = xx; b1 = 0; }
                        else if (hue < 120) { r1 = xx; g1 = c; b1 = 0; }
                        else if (hue < 180) { r1 = 0; g1 = c; b1 = xx; }
                        else if (hue < 240) { r1 = 0; g1 = xx; b1 = c; }
                        else if (hue < 300) { r1 = xx; g1 = 0; b1 = c; }
                        else { r1 = c; g1 = 0; b1 = xx; }
                        r = (r1 + m) * 255;
                        g = (g1 + m) * 255;
                        bl = (b1 + m) * 255;
                        break;
                    }
                }

                data[pi] = r;
                data[pi + 1] = g;
                data[pi + 2] = bl;
                data[pi + 3] = 255;
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);

        // Draw scaled up to fill screen
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.offscreen, 0, 0, system.width, system.height);
    }
}
