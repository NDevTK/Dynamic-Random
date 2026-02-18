/**
 * @file interference_architecture.js
 * @description Wave interference / moire pattern visualization. Multiple wave
 * sources emit concentric waves that create interference patterns through
 * superposition. Cursor adds temporary wave sources. Seed controls source
 * positions, frequencies, amplitudes, and rendering style. Creates hypnotic,
 * physics-accurate visual patterns.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;

export class InterferenceArchitecture extends Architecture {
    constructor() {
        super();
        this.sources = [];
        this.cursorSource = null;
        this.renderStyle = 0;
        this.hueBase = 0;
        this.hueRange = 0;
        this.resolution = 4;
        this.buffer = null;
        this.bufferW = 0;
        this.bufferH = 0;
        this.imageData = null;
        this.offscreen = null;
        this.offCtx = null;
        this.damping = 0;
        this.globalPhaseSpeed = 0;
        this.contrastMode = false;
        this.invertMode = false;
        this.colorChannelSplit = false;
        this.timeScale = 0;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        this.resolution = 3 + Math.floor(rng() * 3);
        this.bufferW = Math.ceil(w / this.resolution);
        this.bufferH = Math.ceil(h / this.resolution);

        // Create offscreen canvas for pixel manipulation
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = this.bufferW;
        this.offscreen.height = this.bufferH;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(this.bufferW, this.bufferH);

        // Rendering style
        this.renderStyle = Math.floor(rng() * 5);
        // 0 = grayscale interference, 1 = hue-mapped, 2 = contour lines
        // 3 = RGB channel split, 4 = neon on dark

        this.hueBase = rng() * 360;
        this.hueRange = 60 + rng() * 180;
        this.damping = 0.001 + rng() * 0.003;
        this.globalPhaseSpeed = 0.02 + rng() * 0.04;
        this.contrastMode = rng() > 0.6;
        this.invertMode = rng() > 0.7;
        this.colorChannelSplit = this.renderStyle === 3;
        this.timeScale = 0.5 + rng() * 1.5;

        // Wave sources: 2-7 permanent sources
        const sourceCount = 2 + Math.floor(rng() * 6);
        this.sources = [];

        const placementStyles = [
            // Random
            () => ({ x: rng() * w, y: rng() * h }),
            // Symmetric
            () => {
                const a = (TAU / sourceCount) * this.sources.length;
                const r = Math.min(w, h) * (0.2 + rng() * 0.2);
                return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r };
            },
            // Line arrangement
            () => ({
                x: w * (0.15 + this.sources.length / sourceCount * 0.7),
                y: h * (0.3 + rng() * 0.4)
            }),
            // Clustered pairs
            () => {
                const cx = rng() * w;
                const cy = rng() * h;
                return { x: cx + (rng() - 0.5) * 80, y: cy + (rng() - 0.5) * 80 };
            }
        ];
        const placement = placementStyles[Math.floor(rng() * placementStyles.length)];

        for (let i = 0; i < sourceCount; i++) {
            const pos = placement();
            this.sources.push({
                x: pos.x,
                y: pos.y,
                frequency: 0.02 + rng() * 0.06,
                amplitude: 0.5 + rng() * 0.5,
                phase: rng() * TAU,
                phaseSpeed: (rng() - 0.5) * 0.03,
                // Movement for dynamic patterns
                orbitRadius: rng() > 0.5 ? (20 + rng() * 60) : 0,
                orbitSpeed: (rng() - 0.5) * 0.005,
                orbitAngle: rng() * TAU,
                baseX: pos.x,
                baseY: pos.y,
                active: true
            });
        }

        // Cursor wave source
        this.cursorSource = {
            x: w / 2, y: h / 2,
            frequency: 0.03 + rng() * 0.04,
            amplitude: 0.8,
            phase: 0,
            active: true
        };
    }

    update(system) {
        const tick = system.tick;
        const isWarp = system.speedMultiplier > 2;
        const isGravity = system.isGravityWell;
        const speed = isWarp ? 3 : 1;

        // Update source positions (orbiting)
        for (const src of this.sources) {
            src.phase += src.phaseSpeed * speed;
            if (src.orbitRadius > 0) {
                src.orbitAngle += src.orbitSpeed * speed;
                src.x = src.baseX + Math.cos(src.orbitAngle) * src.orbitRadius;
                src.y = src.baseY + Math.sin(src.orbitAngle) * src.orbitRadius;
            }
        }

        // Cursor source follows mouse
        this.cursorSource.x = mouse.x;
        this.cursorSource.y = mouse.y;
        this.cursorSource.phase += this.globalPhaseSpeed * speed;
        this.cursorSource.amplitude = isGravity ? 2.0 : 0.8;

        // Resize offscreen if needed
        const w = system.width;
        const h = system.height;
        const newW = Math.ceil(w / this.resolution);
        const newH = Math.ceil(h / this.resolution);
        if (newW !== this.bufferW || newH !== this.bufferH) {
            this.bufferW = newW;
            this.bufferH = newH;
            this.offscreen.width = newW;
            this.offscreen.height = newH;
            this.imageData = this.offCtx.createImageData(newW, newH);
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const data = this.imageData.data;
        const w = this.bufferW;
        const h = this.bufferH;
        const res = this.resolution;
        const t = tick * this.globalPhaseSpeed * this.timeScale;

        // Calculate interference pattern
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const worldX = px * res;
                const worldY = py * res;
                let wave = 0;
                let waveR = 0, waveG = 0, waveB = 0;

                // Sum contributions from all sources
                const allSources = [...this.sources, this.cursorSource];
                for (let si = 0; si < allSources.length; si++) {
                    const src = allSources[si];
                    if (!src.active) continue;

                    const dx = worldX - src.x;
                    const dy = worldY - src.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Damped sinusoidal wave
                    const damping = Math.exp(-dist * this.damping);
                    const val = Math.sin(dist * src.frequency - t + src.phase) * src.amplitude * damping;

                    if (this.colorChannelSplit) {
                        // Each source contributes to a different RGB channel
                        const channel = si % 3;
                        if (channel === 0) waveR += val;
                        else if (channel === 1) waveG += val;
                        else waveB += val;
                    } else {
                        wave += val;
                    }
                }

                const pi = (py * w + px) * 4;

                if (this.colorChannelSplit) {
                    // RGB mode: each channel has its own interference pattern
                    data[pi] = Math.floor(((waveR + 1) / 2) * 255);
                    data[pi + 1] = Math.floor(((waveG + 1) / 2) * 255);
                    data[pi + 2] = Math.floor(((waveB + 1) / 2) * 255);
                    data[pi + 3] = 255;
                } else {
                    // Normalize wave to 0-1
                    let normalized = (wave / allSources.length + 1) * 0.5;
                    if (this.contrastMode) normalized = Math.pow(normalized, 2);
                    if (this.invertMode) normalized = 1 - normalized;

                    let r, g, b;
                    switch (this.renderStyle) {
                        case 0: // Grayscale
                            r = g = b = Math.floor(normalized * 255);
                            break;

                        case 1: { // Hue-mapped
                            const hue = (this.hueBase + normalized * this.hueRange) % 360;
                            const sat = 80;
                            const light = 10 + normalized * 50;
                            [r, g, b] = this.hslToRgb(hue, sat, light);
                            break;
                        }

                        case 2: { // Contour lines
                            const bands = 15;
                            const band = normalized * bands;
                            const edge = Math.abs(band - Math.round(band));
                            if (edge < 0.08) {
                                // Contour line
                                const hue = (this.hueBase + Math.round(band) / bands * this.hueRange) % 360;
                                [r, g, b] = this.hslToRgb(hue, 90, 55);
                            } else {
                                // Fill between contours
                                const level = Math.floor(band) / bands;
                                [r, g, b] = this.hslToRgb(this.hueBase, 20, level * 15);
                            }
                            break;
                        }

                        case 4: { // Neon on dark
                            if (normalized > 0.48 && normalized < 0.52) {
                                // Bright neon line at zero-crossing
                                const hue = (this.hueBase + tick * 0.2) % 360;
                                [r, g, b] = this.hslToRgb(hue, 100, 70);
                            } else if (normalized > 0.45 && normalized < 0.55) {
                                const hue = (this.hueBase + tick * 0.2) % 360;
                                [r, g, b] = this.hslToRgb(hue, 80, 25);
                            } else {
                                r = g = b = Math.floor(Math.abs(normalized - 0.5) * 20);
                            }
                            break;
                        }

                        default: // Fallback: blue-white
                            r = Math.floor(normalized * 100);
                            g = Math.floor(normalized * 150);
                            b = Math.floor(normalized * 255);
                    }

                    data[pi] = r;
                    data[pi + 1] = g;
                    data[pi + 2] = b;
                    data[pi + 3] = 255;
                }
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);

        // Draw to main canvas (scaled up)
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.offscreen, 0, 0, system.width, system.height);

        // Draw source indicators
        ctx.globalCompositeOperation = 'lighter';
        for (const src of this.sources) {
            const pulse = 0.5 + 0.5 * Math.sin(tick * 0.05 + src.phase);
            const g = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 8);
            g.addColorStop(0, `hsla(${this.hueBase}, 80%, 80%, ${0.3 + pulse * 0.3})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(src.x, src.y, 8, 0, TAU);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
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
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }
}
