/**
 * @file interference_architecture.js
 * @description Interference pattern architecture creating mesmerizing moiré effects
 * from overlapping wave sources. Mouse acts as a wave emitter, creating beautiful
 * constructive/destructive interference patterns. Dramatically different based on seed.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { createNoise2D } from './simplex_noise.js';
import { cliffordAttractor, deJongAttractor, normalizePoints } from './math_patterns.js';

export class InterferenceArchitecture extends Architecture {
    constructor() {
        super();
        this.sources = [];
        this.offscreen = null;
        this.offCtx = null;
        this.imageData = null;
        this.resolution = 3; // Pixel skip for performance
        this.palette = [];
        this.waveType = 0;
        this.colorMode = 0;
        this.baseFreq = 0;
        this.mouseInfluence = 0;
        this.timeScale = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.noise2D = null;
    }

    init(system) {
        const rng = system.rng;

        // Create offscreen canvas at reduced resolution
        this.resolution = 3 + Math.floor(rng() * 2); // 3-4 for performance
        const w = Math.ceil(system.width / this.resolution);
        const h = Math.ceil(system.height / this.resolution);
        this.offscreen = document.createElement('canvas');
        this.offscreen.width = w;
        this.offscreen.height = h;
        this.offCtx = this.offscreen.getContext('2d');
        this.imageData = this.offCtx.createImageData(w, h);

        this.noise2D = createNoise2D(Math.floor(rng() * 100000));

        // Seed-driven wave properties
        this.waveType = Math.floor(rng() * 4); // 0=circular, 1=linear, 2=spiral, 3=hyperbolic
        this.colorMode = Math.floor(rng() * 5); // Different color mapping strategies
        this.baseFreq = 0.02 + rng() * 0.06;
        this.mouseInfluence = 0.5 + rng() * 1.5;
        this.timeScale = 0.01 + rng() * 0.03;

        // Color palettes for interference
        const palettes = [
            // Ocean depth: blues and teals
            [{ r: 0, g: 20, b: 60 }, { r: 0, g: 80, b: 150 }, { r: 0, g: 200, b: 200 }, { r: 180, g: 255, b: 255 }],
            // Neon plasma: pinks and cyans
            [{ r: 30, g: 0, b: 30 }, { r: 200, g: 0, b: 120 }, { r: 0, g: 200, b: 255 }, { r: 255, g: 100, b: 255 }],
            // Fire: reds and yellows
            [{ r: 20, g: 0, b: 0 }, { r: 180, g: 30, b: 0 }, { r: 255, g: 150, b: 0 }, { r: 255, g: 255, b: 100 }],
            // Aurora: greens and purples
            [{ r: 0, g: 10, b: 20 }, { r: 0, g: 150, b: 50 }, { r: 100, g: 0, b: 200 }, { r: 50, g: 255, b: 100 }],
            // Monochrome: black to white with accent
            [{ r: 0, g: 0, b: 0 }, { r: 60, g: 60, b: 80 }, { r: 180, g: 180, b: 200 }, { r: 255, g: 255, b: 255 }]
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        // Generate wave sources
        this.sources = [];
        const sourceCount = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < sourceCount; i++) {
            this.sources.push({
                x: rng() * system.width,
                y: rng() * system.height,
                freq: this.baseFreq * (0.5 + rng() * 1.5),
                phase: rng() * Math.PI * 2,
                phaseSpeed: (rng() - 0.5) * 0.06,
                amplitude: 0.5 + rng() * 0.5,
                vx: (rng() - 0.5) * 0.3,
                vy: (rng() - 0.5) * 0.3,
                type: this.waveType === 3 ? Math.floor(rng() * 3) : this.waveType
            });
        }

        // Attractor-based movement paths (seed-dependent)
        if (rng() > 0.4) {
            for (let i = 0; i < this.sources.length; i++) {
                const s = this.sources[i];
                const points = rng() > 0.5
                    ? normalizePoints(cliffordAttractor(2000, rng))
                    : normalizePoints(deJongAttractor(2000, rng));
                s.attractorPath = points;
                s.pathIndex = Math.floor(rng() * points.length);
                s.useAttractor = true;
            }
        }

        this.lastMouseX = system.width / 2;
        this.lastMouseY = system.height / 2;
    }

    update(system) {
        const tick = system.tick;
        const mx = mouse.x || system.width / 2;
        const my = mouse.y || system.height / 2;

        // Smooth mouse tracking
        this.lastMouseX += (mx - this.lastMouseX) * 0.1;
        this.lastMouseY += (my - this.lastMouseY) * 0.1;

        // Update source positions
        for (let i = 0; i < this.sources.length; i++) {
            const s = this.sources[i];
            s.phase += s.phaseSpeed * system.speedMultiplier;

            if (s.useAttractor) {
                // Advance along the pre-computed attractor trajectory
                s.pathIndex = (s.pathIndex + 1) % s.attractorPath.length;
                const pt = s.attractorPath[s.pathIndex];
                // pt.x and pt.y are normalised to [-1, 1]; map to canvas coordinates
                s.x = (pt.x + 1) * 0.5 * system.width;
                s.y = (pt.y + 1) * 0.5 * system.height;
            } else {
                s.x += s.vx * system.speedMultiplier;
                s.y += s.vy * system.speedMultiplier;

                // Bounce off edges
                if (s.x < 0 || s.x > system.width) s.vx *= -1;
                if (s.y < 0 || s.y > system.height) s.vy *= -1;
                s.x = Math.max(0, Math.min(system.width, s.x));
                s.y = Math.max(0, Math.min(system.height, s.y));
            }

            // Noise-driven organic movement
            const t = tick * 0.005;
            s.vx += this.noise2D(t + i * 7.3, 0) * 0.05;
            s.vy += this.noise2D(0, t + i * 7.3) * 0.05;

            // Mouse attraction
            if (system.isGravityWell) {
                const dx = mx - s.x;
                const dy = my - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) {
                    s.vx += (dx / dist) * 0.3;
                    s.vy += (dy / dist) * 0.3;
                }
                s.freq = this.baseFreq * 2;
            } else {
                // Smooth frequency modulation via noise instead of Math.random()
                const freqNoise = this.noise2D(t * 0.5 + i * 13.7, i * 3.1);
                s.freq += (this.baseFreq * (1 + freqNoise * 0.5) - s.freq) * 0.01;
            }
        }

        // Shockwave creates temporary wave burst
        system.shockwaves.forEach(sw => {
            if (sw.radius < 20 && this.sources.length < 10) {
                this.sources.push({
                    x: sw.x, y: sw.y,
                    freq: this.baseFreq * 3,
                    phase: 0,
                    phaseSpeed: 0.1,
                    amplitude: 1.0,
                    vx: 0, vy: 0,
                    type: 0, // Circular burst
                    temporary: true,
                    life: 60
                });
            }
        });

        // Remove expired temporary sources
        for (let i = this.sources.length - 1; i >= 0; i--) {
            if (this.sources[i].temporary) {
                this.sources[i].life--;
                this.sources[i].amplitude *= 0.97;
                if (this.sources[i].life <= 0) {
                    this.sources.splice(i, 1);
                }
            }
        }
    }

    _getWaveValue(sx, sy, px, py, freq, phase, type, tick) {
        const dx = px - sx;
        const dy = py - sy;

        switch (type) {
            case 0: { // Circular waves
                const dist = Math.sqrt(dx * dx + dy * dy);
                return Math.sin(dist * freq + phase);
            }
            case 1: { // Linear waves (plane waves)
                const angle = Math.atan2(dy, dx);
                return Math.sin((dx * Math.cos(phase) + dy * Math.sin(phase)) * freq);
            }
            case 2: { // Spiral waves
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                return Math.sin(dist * freq + angle * 3 + phase);
            }
            default: { // Circular (default)
                const dist = Math.sqrt(dx * dx + dy * dy);
                return Math.sin(dist * freq + phase);
            }
        }
    }

    _mapColor(value, palette) {
        // Map -1..1 to color palette with smooth interpolation
        const t = (value + 1) * 0.5; // 0..1
        const idx = t * (palette.length - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(i0 + 1, palette.length - 1);
        const frac = idx - i0;

        return {
            r: palette[i0].r + (palette[i1].r - palette[i0].r) * frac,
            g: palette[i0].g + (palette[i1].g - palette[i0].g) * frac,
            b: palette[i0].b + (palette[i1].b - palette[i0].b) * frac
        };
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const w = this.offscreen.width;
        const h = this.offscreen.height;
        const data = this.imageData.data;
        const res = this.resolution;
        const mx = this.lastMouseX;
        const my = this.lastMouseY;

        // Compute interference pattern
        for (let py = 0; py < h; py++) {
            const worldY = py * res;
            for (let px = 0; px < w; px++) {
                const worldX = px * res;
                let value = 0;

                // Sum waves from all sources
                for (let si = 0; si < this.sources.length; si++) {
                    const s = this.sources[si];
                    const waveVal = this._getWaveValue(
                        s.x, s.y, worldX, worldY,
                        s.freq, s.phase + tick * this.timeScale,
                        s.type, tick
                    );
                    value += waveVal * s.amplitude;
                }

                // Mouse as additional wave source
                const mdx = worldX - mx;
                const mdy = worldY - my;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                value += Math.sin(mDist * this.baseFreq * 1.5 + tick * 0.05) * this.mouseInfluence;

                // Normalize
                const totalAmplitude = this.sources.reduce((sum, s) => sum + s.amplitude, 0) + this.mouseInfluence;
                value = value / totalAmplitude;

                // Apply color mode transformations
                let finalValue = value;
                switch (this.colorMode) {
                    case 1: // Absolute value (symmetrical patterns)
                        finalValue = Math.abs(value) * 2 - 1;
                        break;
                    case 2: // Squared (emphasizes peaks)
                        finalValue = value * Math.abs(value);
                        break;
                    case 3: // Stepped (posterized)
                        finalValue = Math.round(value * 4) / 4;
                        break;
                    case 4: // Edge detection (shows zero-crossings)
                        finalValue = 1 - Math.min(1, Math.abs(value) * 5);
                        finalValue = finalValue * 2 - 1;
                        break;
                }

                const color = this._mapColor(finalValue, this.palette);
                const pi = (py * w + px) * 4;

                // Mouse proximity brightening
                const mouseGlow = mDist < 200 ? (200 - mDist) / 200 * 30 : 0;

                data[pi] = Math.min(255, color.r + mouseGlow);
                data[pi + 1] = Math.min(255, color.g + mouseGlow);
                data[pi + 2] = Math.min(255, color.b + mouseGlow);
                data[pi + 3] = 255;
            }
        }

        this.offCtx.putImageData(this.imageData, 0, 0);

        // Draw scaled up with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        ctx.drawImage(this.offscreen, 0, 0, system.width, system.height);

        // Overlay: bright points at wave source locations
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.sources.length; i++) {
            const s = this.sources[i];
            const pulse = Math.sin(tick * 0.05 + i) * 0.3 + 0.7;
            const size = (s.temporary ? 15 : 8) * pulse * s.amplitude;
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size);
            grad.addColorStop(0, `rgba(255, 255, 255, ${0.3 * s.amplitude * pulse})`);
            grad.addColorStop(0.5, `rgba(${this.palette[2].r}, ${this.palette[2].g}, ${this.palette[2].b}, ${0.15 * s.amplitude})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
