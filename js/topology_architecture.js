/**
 * @file topology_architecture.js
 * @description Animated topographic contour map background. Uses layered noise
 * functions to generate living terrain with contour lines that shift, flow, and
 * respond to cursor interaction. The cursor acts as a terrain peak/valley.
 * Seed controls terrain features, color palette, and animation style.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

// Simple 2D noise implementation (value noise with smoothing)
function createNoise(rng) {
    const size = 256;
    const perm = new Uint8Array(size * 2);
    const grad = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        perm[i] = i;
        grad[i] = rng() * 2 - 1;
    }
    // Fisher-Yates shuffle
    for (let i = size - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (let i = 0; i < size; i++) perm[i + size] = perm[i];

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }

    return function noise2d(x, y) {
        const ix = Math.floor(x) & (size - 1);
        const iy = Math.floor(y) & (size - 1);
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const u = fade(fx);
        const v = fade(fy);

        const aa = grad[perm[ix + perm[iy]]];
        const ab = grad[perm[ix + perm[iy + 1]]];
        const ba = grad[perm[ix + 1 + perm[iy]]];
        const bb = grad[perm[ix + 1 + perm[iy + 1]]];

        return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
    };
}

function fbm(noise, x, y, octaves, lacunarity, gain) {
    let sum = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
        sum += noise(x * freq, y * freq) * amp;
        maxAmp += amp;
        amp *= gain;
        freq *= lacunarity;
    }
    return sum / maxAmp;
}

export class TopologyArchitecture extends Architecture {
    constructor() {
        super();
        this.noise = null;
        this.noise2 = null;
        this.resolution = 4;
        this.contourLevels = 12;
        this.animSpeed = 0;
        this.scale = 0;
        this.octaves = 0;
        this.colorMode = 0;
        this.palette = [];
        this.timeOffset = 0;
        this.cursorInfluence = 0;
        this.lineWidth = 0;
        this.fillMode = false;
        this.heightMap = null;
        this.mapW = 0;
        this.mapH = 0;
        this.labelPoints = [];
    }

    init(system) {
        const rng = system.rng;

        this.noise = createNoise(rng);
        this.noise2 = createNoise(rng);

        this.resolution = 3 + Math.floor(rng() * 3); // pixel step for sampling
        this.contourLevels = 8 + Math.floor(rng() * 12);
        this.animSpeed = 0.001 + rng() * 0.003;
        this.scale = 0.003 + rng() * 0.006;
        this.octaves = 3 + Math.floor(rng() * 3);
        this.cursorInfluence = 80 + rng() * 120;
        this.lineWidth = 0.5 + rng() * 1.5;
        this.fillMode = rng() > 0.5;

        // Color modes
        this.colorMode = Math.floor(rng() * 6);
        const hue1 = rng() * 360;
        const hue2 = (hue1 + 60 + rng() * 120) % 360;

        if (this.colorMode === 0) {
            // Ocean bathymetry: deep blue to cyan to sandy
            this.palette = this.generateGradientPalette(
                [210, 80, 15], [190, 90, 40], [170, 60, 55], [45, 50, 70],
                this.contourLevels
            );
        } else if (this.colorMode === 1) {
            // Infrared heat map: dark to hot
            this.palette = this.generateGradientPalette(
                [270, 80, 10], [300, 90, 30], [0, 100, 50], [50, 100, 65],
                this.contourLevels
            );
        } else if (this.colorMode === 2) {
            // Forest topography: brown to green to white
            this.palette = this.generateGradientPalette(
                [30, 40, 20], [120, 50, 30], [100, 40, 55], [0, 0, 85],
                this.contourLevels
            );
        } else if (this.colorMode === 3) {
            // Alien landscape: seed-driven hues
            this.palette = this.generateGradientPalette(
                [hue1, 80, 10], [hue1, 90, 35], [hue2, 80, 50], [hue2, 70, 70],
                this.contourLevels
            );
        } else if (this.colorMode === 4) {
            // Monochrome topo: like a real paper map
            this.palette = [];
            for (let i = 0; i < this.contourLevels; i++) {
                const t = i / this.contourLevels;
                this.palette.push(`hsla(${hue1}, ${20 + t * 10}%, ${10 + t * 50}%, 1)`);
            }
        } else {
            // Neon contours on dark
            this.palette = [];
            for (let i = 0; i < this.contourLevels; i++) {
                const t = i / this.contourLevels;
                const h = (hue1 + t * 180) % 360;
                this.palette.push(`hsla(${h}, 100%, ${50 + t * 20}%, 1)`);
            }
        }

        // Pre-calculate some "elevation label" positions
        this.labelPoints = [];
        for (let i = 0; i < 8 + Math.floor(rng() * 6); i++) {
            this.labelPoints.push({
                x: rng() * system.width,
                y: rng() * system.height,
                label: Math.floor(rng() * 9000 + 1000)
            });
        }

        this.mapW = Math.ceil(system.width / this.resolution);
        this.mapH = Math.ceil(system.height / this.resolution);
        this.heightMap = new Float32Array(this.mapW * this.mapH);
    }

    generateGradientPalette(c1, c2, c3, c4, steps) {
        const palette = [];
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            let h, s, l;
            if (t < 0.33) {
                const lt = t / 0.33;
                h = c1[0] + (c2[0] - c1[0]) * lt;
                s = c1[1] + (c2[1] - c1[1]) * lt;
                l = c1[2] + (c2[2] - c1[2]) * lt;
            } else if (t < 0.66) {
                const lt = (t - 0.33) / 0.33;
                h = c2[0] + (c3[0] - c2[0]) * lt;
                s = c2[1] + (c3[1] - c2[1]) * lt;
                l = c2[2] + (c3[2] - c2[2]) * lt;
            } else {
                const lt = (t - 0.66) / 0.34;
                h = c3[0] + (c4[0] - c3[0]) * lt;
                s = c3[1] + (c4[1] - c3[1]) * lt;
                l = c3[2] + (c4[2] - c3[2]) * lt;
            }
            palette.push(`hsla(${h}, ${s}%, ${l}%, 1)`);
        }
        return palette;
    }

    update(system) {
        this.timeOffset += this.animSpeed * system.speedMultiplier;

        const mx = mouse.x;
        const my = mouse.y;
        const influence = this.cursorInfluence;
        const isGravity = system.isGravityWell;

        // Build height map
        for (let gy = 0; gy < this.mapH; gy++) {
            for (let gx = 0; gx < this.mapW; gx++) {
                const wx = gx * this.resolution;
                const wy = gy * this.resolution;

                // Base terrain from fbm noise
                let elevation = fbm(this.noise, wx * this.scale + this.timeOffset,
                    wy * this.scale + this.timeOffset * 0.7, this.octaves, 2.0, 0.5);

                // Secondary layer for detail
                elevation += fbm(this.noise2,
                    wx * this.scale * 2 + this.timeOffset * 1.5,
                    wy * this.scale * 2 - this.timeOffset, 2, 2.0, 0.5) * 0.3;

                // Cursor as terrain feature
                const cdx = wx - mx;
                const cdy = wy - my;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cdist < influence) {
                    const cursorHeight = (1 - cdist / influence);
                    const bump = cursorHeight * cursorHeight * (isGravity ? -0.8 : 0.8);
                    elevation += bump;
                }

                this.heightMap[gy * this.mapW + gx] = elevation;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const res = this.resolution;
        const levels = this.contourLevels;

        if (this.fillMode) {
            // Fill-based rendering: color each cell by elevation band
            for (let gy = 0; gy < this.mapH; gy++) {
                for (let gx = 0; gx < this.mapW; gx++) {
                    const val = this.heightMap[gy * this.mapW + gx];
                    const normalized = (val + 1) * 0.5; // map -1..1 to 0..1
                    const band = Math.floor(Math.max(0, Math.min(levels - 1, normalized * levels)));
                    ctx.fillStyle = this.palette[band];
                    ctx.fillRect(gx * res, gy * res, res, res);
                }
            }
        }

        // Draw contour lines using marching squares
        ctx.globalCompositeOperation = this.fillMode ? 'source-over' : 'lighter';
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';

        for (let level = 0; level < levels; level++) {
            const threshold = -1 + (2 / levels) * (level + 0.5);
            const colorIdx = Math.min(level, this.palette.length - 1);

            if (this.fillMode) {
                // On fill mode, contour lines are subtle dark borders
                const t = level / levels;
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 + t * 0.1})`;
                ctx.lineWidth = level % 4 === 0 ? this.lineWidth * 1.5 : this.lineWidth * 0.5;
            } else {
                ctx.strokeStyle = this.palette[colorIdx];
                ctx.lineWidth = level % 4 === 0 ? this.lineWidth * 2 : this.lineWidth;
            }

            ctx.beginPath();

            // Simplified marching squares for contour extraction
            for (let gy = 0; gy < this.mapH - 1; gy++) {
                for (let gx = 0; gx < this.mapW - 1; gx++) {
                    const v00 = this.heightMap[gy * this.mapW + gx];
                    const v10 = this.heightMap[gy * this.mapW + gx + 1];
                    const v01 = this.heightMap[(gy + 1) * this.mapW + gx];
                    const v11 = this.heightMap[(gy + 1) * this.mapW + gx + 1];

                    const b00 = v00 > threshold ? 1 : 0;
                    const b10 = v10 > threshold ? 1 : 0;
                    const b01 = v01 > threshold ? 1 : 0;
                    const b11 = v11 > threshold ? 1 : 0;

                    const cell = b00 | (b10 << 1) | (b01 << 2) | (b11 << 3);
                    if (cell === 0 || cell === 15) continue;

                    const x = gx * res;
                    const y = gy * res;

                    // Interpolation helpers
                    const interpX = (a, b) => (threshold - a) / (b - a);
                    const top = x + interpX(v00, v10) * res;
                    const bottom = x + interpX(v01, v11) * res;
                    const left = y + interpX(v00, v01) * res;
                    const right = y + interpX(v10, v11) * res;

                    // Draw line segments for each marching squares case
                    switch (cell) {
                        case 1: case 14: ctx.moveTo(top, y); ctx.lineTo(x, left); break;
                        case 2: case 13: ctx.moveTo(top, y); ctx.lineTo(x + res, right); break;
                        case 3: case 12: ctx.moveTo(x, left); ctx.lineTo(x + res, right); break;
                        case 4: case 11: ctx.moveTo(x, left); ctx.lineTo(bottom, y + res); break;
                        case 5:
                            ctx.moveTo(top, y); ctx.lineTo(x + res, right);
                            ctx.moveTo(x, left); ctx.lineTo(bottom, y + res);
                            break;
                        case 6: case 9: ctx.moveTo(top, y); ctx.lineTo(bottom, y + res); break;
                        case 7: case 8: ctx.moveTo(x + res, right); ctx.lineTo(bottom, y + res); break;
                        case 10:
                            ctx.moveTo(top, y); ctx.lineTo(x, left);
                            ctx.moveTo(x + res, right); ctx.lineTo(bottom, y + res);
                            break;
                    }
                }
            }
            ctx.stroke();
        }

        // Draw elevation labels at key points (like a real topo map)
        if (!this.fillMode) {
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            for (const lp of this.labelPoints) {
                const gx = Math.floor(lp.x / res);
                const gy = Math.floor(lp.y / res);
                if (gx >= 0 && gx < this.mapW && gy >= 0 && gy < this.mapH) {
                    const val = this.heightMap[gy * this.mapW + gx];
                    const elev = Math.floor((val + 1) * 2500);
                    ctx.fillStyle = `rgba(200, 220, 255, 0.4)`;
                    ctx.fillText(`${elev}m`, lp.x, lp.y);
                }
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
