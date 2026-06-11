/**
 * @file alchemy_architecture.js
 * @description A living falling-sand world, simulated by a hand-forged
 * WebAssembly kernel (wasm_forge.js + alchemy_kernel.js — the binary is
 * emitted byte-by-byte at runtime; no toolchain, no .wasm files). Seeded
 * terrain — rock strata, dunes, ponds, plants, buried lava — runs a real
 * cellular chemistry whose RATES are seeded per universe: one world's fire
 * races through brush while another's smolders; lava may be syrup or water.
 *
 * The plain-JS reference kernel doubles as a seamless fallback: simulation
 * starts on it immediately and the WASM kernel takes over the moment it
 * compiles (they are proven cell-identical in tests/wasm_test.mjs).
 *
 * Interaction: the cursor trails the universe's seeded brush element (sand,
 * water, plant, or lava); holding right-click (the gravity well) excavates;
 * clicks (shockwaves) detonate a fire ring. Springs at the ceiling drip
 * their element forever, and the cursor familiar comes to watch them.
 */

import { mouse } from './state.js';
import { pointsOfInterest } from './points_of_interest.js';
import { stepRef, instantiateKernel, GRID_BASE, EL, PARAM } from './alchemy_kernel.js';

function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const abgr = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

export class AlchemyArchitecture {
    constructor() {
        this._g = null;
        this._step = null; // WASM step, once compiled
        this._stepCount = 0;
        this.tick = 0;
    }

    init(system) {
        const rng = system.rng;
        this.tick = 0;
        this._stepCount = 0;

        const hasWasm = typeof WebAssembly !== 'undefined';
        const scale = hasWasm ? 4 : 6; // JS fallback simulates a smaller world
        this.w = Math.max(64, Math.min(520, Math.ceil(system.width / scale)));
        this.h = Math.max(48, Math.min(300, Math.ceil(system.height / scale)));
        const size = GRID_BASE + this.w * this.h;

        if (hasWasm) {
            this._mem = new WebAssembly.Memory({ initial: Math.ceil(size / 65536) });
            this._g = new Uint8Array(this._mem.buffer);
            this._step = null;
            instantiateKernel(this._mem)
                .then((step) => { this._step = step; })
                .catch(() => { /* stay on the reference kernel */ });
        } else {
            this._g = new Uint8Array(size);
        }

        // ── Per-universe chemistry ──
        const g = this._g;
        g[PARAM.FIRE_SPREAD] = 40 + Math.floor(rng() * 130);
        g[PARAM.FIRE_RISE] = 60 + Math.floor(rng() * 140);
        g[PARAM.SMOKE_DECAY] = 6 + Math.floor(rng() * 22);
        g[PARAM.PLANT_GROW] = 2 + Math.floor(rng() * 12);
        g[PARAM.WATER_FLOW] = 120 + Math.floor(rng() * 120);
        g[PARAM.LAVA_FLOW] = 25 + Math.floor(rng() * 70);
        g[PARAM.LAVA_COOL] = 24 + Math.floor(rng() * 100);

        this._genWorld(rng);
        this._buildPalette(rng, system.hue);

        // Springs drip from the ceiling forever
        this._emitters = [];
        const springCount = 1 + Math.floor(rng() * 3);
        const springEls = [EL.WATER, EL.SAND, EL.WATER, EL.LAVA];
        for (let i = 0; i < springCount; i++) {
            this._emitters.push({
                x: Math.floor(this.w * (0.15 + rng() * 0.7)),
                el: springEls[Math.floor(rng() * springEls.length)],
                rate: 2 + Math.floor(rng() * 4),
            });
        }

        // The cursor's brush element, seeded
        const brushes = [EL.SAND, EL.WATER, EL.PLANT, EL.LAVA];
        this._brush = brushes[Math.floor(rng() * brushes.length)];
        this._crisp = rng() < 0.7; // chunky pixels vs softened

        this._off = document.createElement('canvas');
        this._off.width = this.w;
        this._off.height = this.h;
        this._offCtx = this._off.getContext('2d');
        this._img = this._offCtx.createImageData(this.w, this.h);

        this._prevShock = 0;
        this._prevGx = -1;
        this._prevGy = -1;
    }

    _genWorld(rng) {
        const g = this._g;
        const w = this.w;
        const h = this.h;
        const set = (x, y, el) => {
            if (x >= 0 && x < w && y >= 0 && y < h) g[GRID_BASE + y * w + x] = el;
        };

        // Rock strata via layered sine heightmap
        const a1 = h * (0.04 + rng() * 0.08);
        const a2 = h * (0.02 + rng() * 0.05);
        const k1 = 0.02 + rng() * 0.04;
        const k2 = 0.07 + rng() * 0.08;
        const p1 = rng() * 10;
        const p2 = rng() * 10;
        const base = h * (0.6 + rng() * 0.18);
        const floor = new Int16Array(w);
        for (let x = 0; x < w; x++) {
            floor[x] = Math.floor(base + Math.sin(x * k1 + p1) * a1 + Math.sin(x * k2 + p2) * a2);
            for (let y = floor[x]; y < h; y++) set(x, y, EL.ROCK);
        }

        // Containment walls
        for (let y = 0; y < h; y++) { set(0, y, EL.ROCK); set(w - 1, y, EL.ROCK); }
        for (let x = 0; x < w; x++) set(x, h - 1, EL.ROCK);

        // Caves (some flooded with lava at depth)
        const caves = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < caves; i++) {
            const cx = Math.floor(w * (0.15 + rng() * 0.7));
            const cy = Math.floor(h * (0.7 + rng() * 0.22));
            const rx = 4 + Math.floor(rng() * 10);
            const ry = 3 + Math.floor(rng() * 5);
            const fill = cy > h * 0.82 && rng() < 0.6 ? EL.LAVA : EL.EMPTY;
            for (let dy = -ry; dy <= ry; dy++) {
                for (let dx = -rx; dx <= rx; dx++) {
                    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) set(cx + dx, cy + dy, fill);
                }
            }
        }

        // A basin pond: dig a bowl into the surface and fill it with water
        if (rng() < 0.85) {
            const px = Math.floor(w * (0.2 + rng() * 0.6));
            const pr = 6 + Math.floor(rng() * 12);
            for (let dx = -pr; dx <= pr; dx++) {
                const x = px + dx;
                if (x <= 0 || x >= w - 1) continue;
                const depth = Math.floor(Math.sqrt(Math.max(0, pr * pr - dx * dx)) * 0.5);
                const rim = floor[x];
                for (let y = rim - 1; y < rim + depth; y++) set(x, y, EL.WATER);
                for (let y = rim + depth; y < rim + depth + 2; y++) set(x, y, EL.ROCK);
            }
        }

        // Dunes of loose sand on the surface
        const dunes = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < dunes; i++) {
            const dx0 = Math.floor(w * (0.1 + rng() * 0.7));
            const dw = 5 + Math.floor(rng() * 14);
            for (let dx = 0; dx < dw; dx++) {
                const x = dx0 + dx;
                if (x <= 0 || x >= w - 1) continue;
                const pile = Math.floor(Math.sin((dx / dw) * Math.PI) * (2 + rng() * 4));
                for (let k = 1; k <= pile; k++) set(x, floor[x] - k, EL.SAND);
            }
        }

        // Sprouts on the surface
        const sprouts = 4 + Math.floor(rng() * 6);
        for (let i = 0; i < sprouts; i++) {
            const x = 1 + Math.floor(rng() * (w - 2));
            const stalk = 1 + Math.floor(rng() * 3);
            for (let k = 1; k <= stalk; k++) set(x, floor[x] - k, EL.PLANT);
        }
    }

    _buildPalette(rng, sysHue) {
        const lut = new Uint32Array(128);
        const waterHue = ((sysHue || 200) + 190) % 360;
        const plantHue = 85 + rng() * 65;
        const sandHue = 32 + rng() * 16;
        const rockL = 14 + rng() * 8;
        for (let age = 0; age < 8; age++) {
            for (let el = 0; el < 16; el++) {
                const i = (age << 4) | el;
                let c = abgr(0, 0, 0, 0); // EMPTY: transparent, sky shows through
                if (el === EL.ROCK) {
                    const [r, g, b] = hslToRgb(250, 10, rockL);
                    c = abgr(r, g, b, 255);
                } else if (el === EL.SAND) {
                    const [r, g, b] = hslToRgb(sandHue, 55, 56);
                    c = abgr(r, g, b, 255);
                } else if (el === EL.WATER) {
                    const [r, g, b] = hslToRgb(waterHue, 70, 48);
                    c = abgr(r, g, b, 225);
                } else if (el === EL.FIRE) {
                    const [r, g, b] = hslToRgb(55 - age * 6, 95, 76 - age * 4);
                    c = abgr(r, g, b, 255);
                } else if (el === EL.PLANT) {
                    const [r, g, b] = hslToRgb(plantHue, 60, 42);
                    c = abgr(r, g, b, 255);
                } else if (el === EL.SMOKE) {
                    const [r, g, b] = hslToRgb(240, 6, 62);
                    c = abgr(r, g, b, Math.max(18, 130 - age * 16));
                } else if (el === EL.LAVA) {
                    const [r, g, b] = hslToRgb(16, 95, 52);
                    c = abgr(r, g, b, 255);
                }
                lut[i] = c;
            }
        }
        this._lut = lut;
    }

    _paint(gx, gy, radius, el, overwrite) {
        const g = this._g;
        const w = this.w;
        const h = this.h;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = gx + dx;
                const y = gy + dy;
                if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) continue;
                const i = GRID_BASE + y * w + x;
                const cur = g[i] & 15;
                if (overwrite || cur === EL.EMPTY || cur === EL.SMOKE) g[i] = el;
            }
        }
    }

    update(system) {
        if (!this._g) return;
        this.tick++;
        const g = this._g;
        const w = this.w;
        const h = this.h;

        // Springs
        for (const em of this._emitters) {
            if (this.tick % em.rate === 0) {
                const x = em.x + ((this.tick >> 2) % 3) - 1;
                const i = GRID_BASE + 1 * w + x;
                if (x > 0 && x < w - 1 && (g[i] & 15) === EL.EMPTY) g[i] = em.el;
            }
        }

        // Cursor: brush trickle while moving, excavation while right-held
        const gx = Math.floor((mouse.x / Math.max(1, system.width)) * w);
        const gy = Math.floor((mouse.y / Math.max(1, system.height)) * h);
        if (system.isGravityWell) {
            this._paint(gx, gy, 4, EL.EMPTY, true);
        } else if (gx !== this._prevGx || gy !== this._prevGy) {
            this._paint(gx, gy, 1, this._brush, false);
        }
        this._prevGx = gx;
        this._prevGy = gy;

        // Clicks (new shockwaves) detonate a fire ring
        if (system.shockwaves.length > this._prevShock) {
            const sw = system.shockwaves[system.shockwaves.length - 1];
            const cx = Math.floor((sw.x / Math.max(1, system.width)) * w);
            const cy = Math.floor((sw.y / Math.max(1, system.height)) * h);
            for (let a = 0; a < 24; a++) {
                const ang = (a / 24) * Math.PI * 2;
                this._paint(cx + Math.round(Math.cos(ang) * 5), cy + Math.round(Math.sin(ang) * 5), 1, EL.FIRE, false);
            }
        }
        this._prevShock = system.shockwaves.length;

        // Simulate (WASM once compiled; the reference kernel until then)
        const steps = (system.qualityScale || 1) >= 0.5 ? 2 : 1;
        for (let s = 0; s < steps; s++) {
            if (this._step) this._step(w, h, this._stepCount++);
            else stepRef(g, w, h, this._stepCount++);
        }

        // The first spring is worth a visit from the familiar
        if (this._emitters.length > 0) {
            const em = this._emitters[0];
            pointsOfInterest.publish(
                (em.x / w) * system.width,
                0.06 * system.height,
                'spring', 1.1
            );
        }
    }

    draw(system) {
        if (!this._g) return;
        const ctx = system.ctx;
        const px = new Uint32Array(this._img.data.buffer);
        const g = this._g;
        const lut = this._lut;
        const n = this.w * this.h;
        for (let i = 0; i < n; i++) {
            px[i] = lut[g[GRID_BASE + i] & 0x7f];
        }
        this._offCtx.putImageData(this._img, 0, 0);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = !this._crisp;
        ctx.drawImage(this._off, 0, 0, system.width, system.height);
        ctx.imageSmoothingEnabled = prevSmooth;
    }
}
