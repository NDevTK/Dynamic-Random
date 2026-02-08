/**
 * @file lava_architecture.js
 * @description Lava lamp metaball architecture with organic blobs that merge, split,
 * rise and fall. Seed controls colors, gravity direction, viscosity, blob behavior.
 * Mouse interaction pushes/pulls blobs. Each seed produces dramatically different
 * color palettes, blob sizes, and movement patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class LavaArchitecture extends Architecture {
    constructor() {
        super();
        this.blobs = [];
        this.metaCanvas = null;
        this.metaCtx = null;
        this.imageData = null;
        this.palette = [];
        this.gravityAngle = 0;
        this.gravityStrength = 0;
        this.viscosity = 0;
        this.heatWave = 0;
        this.colorStyle = 0;
        this.bgColor = { r: 0, g: 0, b: 0 };
        this.resolution = 4; // Downscale factor for metaball computation
    }

    init(system) {
        const rng = system.rng;

        // Resolution scales with screen size for performance
        this.resolution = Math.max(3, Math.min(6, Math.floor(Math.max(system.width, system.height) / 300)));

        // Create offscreen canvas at reduced resolution
        this.metaCanvas = document.createElement('canvas');
        this.metaCanvas.width = Math.ceil(system.width / this.resolution);
        this.metaCanvas.height = Math.ceil(system.height / this.resolution);
        this.metaCtx = this.metaCanvas.getContext('2d', { willReadFrequently: true });
        this.imageData = this.metaCtx.createImageData(this.metaCanvas.width, this.metaCanvas.height);

        // Seed-driven color style (6 distinct palettes)
        this.colorStyle = Math.floor(rng() * 6);
        this.palette = this._generatePalette(rng);

        // Background color matches palette mood
        const bgStyles = [
            { r: 15, g: 5, b: 25 },   // Deep purple
            { r: 5, g: 15, b: 25 },    // Deep ocean
            { r: 25, g: 10, b: 5 },    // Warm dark
            { r: 5, g: 20, b: 10 },    // Forest dark
            { r: 20, g: 5, b: 15 },    // Magenta dark
            { r: 10, g: 10, b: 20 }    // Midnight
        ];
        this.bgColor = bgStyles[this.colorStyle];

        // Seed-driven physics
        this.gravityAngle = rng() * Math.PI * 2;
        this.gravityStrength = 0.02 + rng() * 0.06;
        this.viscosity = 0.92 + rng() * 0.06; // 0.92 to 0.98
        this.heatWave = 0;

        // Generate blobs
        const blobCount = 8 + Math.floor(rng() * 8);
        this.blobs = [];
        for (let i = 0; i < blobCount; i++) {
            const radius = 30 + rng() * 60;
            this.blobs.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                radius: radius,
                baseRadius: radius,
                colorIndex: Math.floor(rng() * this.palette.length),
                phase: rng() * Math.PI * 2,
                phaseSpeed: 0.01 + rng() * 0.03,
                wobble: 0.5 + rng() * 1.5,
                heat: 0
            });
        }
    }

    _generatePalette(rng) {
        switch (this.colorStyle) {
            case 0: // Psychedelic lava
                return [
                    { r: 255, g: 50, b: 100 },
                    { r: 255, g: 150, b: 0 },
                    { r: 200, g: 0, b: 255 },
                    { r: 255, g: 220, b: 50 }
                ];
            case 1: // Deep ocean
                return [
                    { r: 0, g: 100, b: 255 },
                    { r: 0, g: 200, b: 200 },
                    { r: 50, g: 50, b: 200 },
                    { r: 0, g: 255, b: 150 }
                ];
            case 2: // Molten core
                return [
                    { r: 255, g: 80, b: 0 },
                    { r: 255, g: 200, b: 0 },
                    { r: 200, g: 30, b: 0 },
                    { r: 255, g: 130, b: 50 }
                ];
            case 3: // Toxic swamp
                return [
                    { r: 50, g: 255, b: 50 },
                    { r: 0, g: 180, b: 100 },
                    { r: 200, g: 255, b: 0 },
                    { r: 0, g: 150, b: 50 }
                ];
            case 4: // Neon fever
                return [
                    { r: 255, g: 0, b: 200 },
                    { r: 0, g: 255, b: 255 },
                    { r: 255, g: 255, b: 0 },
                    { r: 100, g: 0, b: 255 }
                ];
            case 5: // Ghost plasma
                return [
                    { r: 180, g: 180, b: 255 },
                    { r: 100, g: 150, b: 255 },
                    { r: 200, g: 200, b: 240 },
                    { r: 150, g: 100, b: 200 }
                ];
            default:
                return [
                    { r: 255, g: 100, b: 50 },
                    { r: 50, g: 100, b: 255 },
                    { r: 255, g: 200, b: 50 },
                    { r: 200, g: 50, b: 200 }
                ];
        }
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        this.heatWave += 0.02;

        for (const blob of this.blobs) {
            // Oscillating radius
            blob.phase += blob.phaseSpeed;
            blob.radius = blob.baseRadius + Math.sin(blob.phase) * blob.wobble * 10;

            // Gravity (direction varies by seed)
            blob.vx += Math.cos(this.gravityAngle) * this.gravityStrength;
            blob.vy += Math.sin(this.gravityAngle) * this.gravityStrength;

            // Heat rises effect - perpendicular to gravity
            const heatDir = this.gravityAngle + Math.PI / 2;
            blob.heat = Math.sin(blob.phase * 2) * 0.5 + 0.5;
            blob.vx += Math.cos(heatDir) * blob.heat * 0.01;
            blob.vy += Math.sin(heatDir) * blob.heat * 0.01;

            // Mouse interaction
            const dx = mx - blob.x;
            const dy = my - blob.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 300) {
                const force = (300 - dist) / 300;
                if (system.isGravityWell) {
                    // Pull toward mouse
                    blob.vx += (dx / dist) * force * 1.5;
                    blob.vy += (dy / dist) * force * 1.5;
                } else if (system.speedMultiplier > 2) {
                    // Push away on left click
                    blob.vx -= (dx / dist) * force * 2;
                    blob.vy -= (dy / dist) * force * 2;
                } else {
                    // Gentle warp
                    blob.vx += (dx / dist) * force * 0.2;
                    blob.vy += (dy / dist) * force * 0.2;
                }
            }

            // Viscosity (drag)
            blob.vx *= this.viscosity;
            blob.vy *= this.viscosity;

            blob.x += blob.vx * system.speedMultiplier;
            blob.y += blob.vy * system.speedMultiplier;

            // Bounce off walls with padding
            const pad = blob.radius;
            if (blob.x < -pad) { blob.x = -pad; blob.vx = Math.abs(blob.vx) * 0.5; }
            if (blob.x > system.width + pad) { blob.x = system.width + pad; blob.vx = -Math.abs(blob.vx) * 0.5; }
            if (blob.y < -pad) { blob.y = -pad; blob.vy = Math.abs(blob.vy) * 0.5; }
            if (blob.y > system.height + pad) { blob.y = system.height + pad; blob.vy = -Math.abs(blob.vy) * 0.5; }
        }
    }

    draw(system) {
        const w = this.metaCanvas.width;
        const h = this.metaCanvas.height;
        const data = this.imageData.data;
        const res = this.resolution;
        const blobs = this.blobs;
        const palette = this.palette;
        const bg = this.bgColor;
        const blobCount = blobs.length;

        // Precompute blob positions in downscaled coordinates
        const bx = new Float32Array(blobCount);
        const by = new Float32Array(blobCount);
        const br = new Float32Array(blobCount);
        const bc = new Uint8Array(blobCount);
        for (let i = 0; i < blobCount; i++) {
            bx[i] = blobs[i].x / res;
            by[i] = blobs[i].y / res;
            br[i] = blobs[i].radius / res;
            bc[i] = blobs[i].colorIndex;
        }

        // Metaball field computation
        const threshold = 1.0;
        for (let py = 0; py < h; py++) {
            const rowOffset = py * w;
            for (let px = 0; px < w; px++) {
                let totalField = 0;
                let totalR = 0, totalG = 0, totalB = 0;
                let totalWeight = 0;

                for (let i = 0; i < blobCount; i++) {
                    const dx = px - bx[i];
                    const dy = py - by[i];
                    const distSq = dx * dx + dy * dy;
                    const r = br[i];
                    const rSq = r * r;

                    // Field contribution: r^2 / distSq
                    const field = rSq / (distSq + 1);
                    totalField += field;

                    if (field > 0.01) {
                        const c = palette[bc[i]];
                        totalR += c.r * field;
                        totalG += c.g * field;
                        totalB += c.b * field;
                        totalWeight += field;
                    }
                }

                const idx = (rowOffset + px) * 4;
                if (totalField > threshold && totalWeight > 0) {
                    // Inside a metaball: blend colors by field contribution
                    const invWeight = 1 / totalWeight;
                    const edgeFactor = Math.min(1, (totalField - threshold) * 2);
                    const glow = 1 + Math.max(0, (totalField - threshold * 2)) * 0.3;

                    data[idx] = Math.min(255, (totalR * invWeight * glow) * edgeFactor + bg.r * (1 - edgeFactor));
                    data[idx + 1] = Math.min(255, (totalG * invWeight * glow) * edgeFactor + bg.g * (1 - edgeFactor));
                    data[idx + 2] = Math.min(255, (totalB * invWeight * glow) * edgeFactor + bg.b * (1 - edgeFactor));
                    data[idx + 3] = 255;
                } else if (totalField > threshold * 0.4) {
                    // Glow around edges
                    const glowFactor = (totalField - threshold * 0.4) / (threshold * 0.6);
                    const invWeight = totalWeight > 0 ? 1 / totalWeight : 0;
                    data[idx] = bg.r + (totalR * invWeight - bg.r) * glowFactor * 0.3;
                    data[idx + 1] = bg.g + (totalG * invWeight - bg.g) * glowFactor * 0.3;
                    data[idx + 2] = bg.b + (totalB * invWeight - bg.b) * glowFactor * 0.3;
                    data[idx + 3] = 255;
                } else {
                    data[idx] = bg.r;
                    data[idx + 1] = bg.g;
                    data[idx + 2] = bg.b;
                    data[idx + 3] = 255;
                }
            }
        }

        // Put computed metaball image to offscreen canvas
        this.metaCtx.putImageData(this.imageData, 0, 0);

        // Draw upscaled to main canvas
        system.ctx.imageSmoothingEnabled = true;
        system.ctx.imageSmoothingQuality = 'low';
        system.ctx.drawImage(this.metaCanvas, 0, 0, system.width, system.height);

        // Overlay: glass-like reflections on bright spots
        system.ctx.save();
        system.ctx.globalCompositeOperation = 'lighter';
        for (const blob of this.blobs) {
            if (blob.heat > 0.3) {
                const grad = system.ctx.createRadialGradient(
                    blob.x - blob.radius * 0.3, blob.y - blob.radius * 0.3, 0,
                    blob.x, blob.y, blob.radius * 1.2
                );
                grad.addColorStop(0, `rgba(255, 255, 255, ${blob.heat * 0.08})`);
                grad.addColorStop(1, 'transparent');
                system.ctx.fillStyle = grad;
                system.ctx.beginPath();
                system.ctx.arc(blob.x, blob.y, blob.radius * 1.2, 0, Math.PI * 2);
                system.ctx.fill();
            }
        }
        system.ctx.restore();
    }
}
