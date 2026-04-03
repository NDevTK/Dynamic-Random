/**
 * @file underwater_caustics_architecture.js
 * @description Simulates the mesmerizing dancing light patterns seen at the bottom
 * of a swimming pool (caustics). Multiple overlapping wave sources create interference
 * patterns that produce brilliant shifting networks of bright lines. Mouse acts as a
 * disturbance in the water surface, and clicking creates splash ripples.
 *
 * Seeds dramatically change: wave count, frequencies, colors, water depth simulation,
 * surface turbulence, and light source angle. Each seed produces a distinctly different
 * underwater atmosphere.
 *
 * Modes:
 * 0 - Shallow Pool: Bright, high-contrast caustic lines, warm light
 * 1 - Deep Ocean: Dim, slow-moving patterns with bioluminescent accents
 * 2 - Coral Reef: Colorful with dappled sunlight and fish-shadow silhouettes
 * 3 - Frozen Lake: Icy blue caustics seen through transparent ice, slow & crystalline
 * 4 - Lava Tube: Red-orange caustics from molten material, intense & dramatic
 * 5 - Alien Sea: Non-euclidean caustic patterns with impossible colors
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;

export class UnderwaterCausticsArchitecture extends Architecture {
    constructor() {
        super();
        this.mode = 0;
        this.tick = 0;

        // Wave sources
        this._waves = [];

        // Splash ripples from clicks
        this._splashes = [];
        this._splashPool = [];

        // Fish shadows (coral reef mode)
        this._fishShadows = [];

        // Light rays
        this._lightRays = [];

        // Rendering config
        this._resolution = 4; // Pixel grid size (perf vs quality)
        this._baseHue = 200;
        this._saturation = 60;
        this._brightness = 50;
        this._contrast = 1;
        this._waveSpeed = 1;
        this._depthFade = 0;

        // Cached ImageData for pixel manipulation
        this._imgData = null;
        this._imgW = 0;
        this._imgH = 0;

        // Last click tracking
        this._lastClickX = 0;
        this._lastClickY = 0;
        this._clickRegistered = false;
    }

    init(system) {
        const rng = system.rng;

        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this._waves = [];
        this._splashes = [];
        this._fishShadows = [];
        this._lightRays = [];

        // Resolution based on quality scale (higher = fewer pixels = faster)
        this._resolution = system.qualityScale > 0.7 ? 5 : system.qualityScale > 0.4 ? 8 : 12;

        // Mode-specific theming
        switch (this.mode) {
            case 0: // Shallow Pool
                this._baseHue = 180 + rng() * 30;
                this._saturation = 40 + rng() * 30;
                this._brightness = 50 + rng() * 20;
                this._contrast = 1.2 + rng() * 0.5;
                this._waveSpeed = 1 + rng() * 0.5;
                this._depthFade = 0.1;
                break;
            case 1: // Deep Ocean
                this._baseHue = 200 + rng() * 40;
                this._saturation = 50 + rng() * 30;
                this._brightness = 20 + rng() * 15;
                this._contrast = 0.8 + rng() * 0.3;
                this._waveSpeed = 0.3 + rng() * 0.4;
                this._depthFade = 0.4;
                break;
            case 2: // Coral Reef
                this._baseHue = 160 + rng() * 60;
                this._saturation = 60 + rng() * 30;
                this._brightness = 40 + rng() * 20;
                this._contrast = 1.0 + rng() * 0.4;
                this._waveSpeed = 0.6 + rng() * 0.6;
                this._depthFade = 0.2;
                break;
            case 3: // Frozen Lake
                this._baseHue = 190 + rng() * 20;
                this._saturation = 20 + rng() * 30;
                this._brightness = 45 + rng() * 20;
                this._contrast = 0.6 + rng() * 0.4;
                this._waveSpeed = 0.2 + rng() * 0.2;
                this._depthFade = 0.15;
                break;
            case 4: // Lava Tube
                this._baseHue = rng() * 30; // Red-orange
                this._saturation = 80 + rng() * 20;
                this._brightness = 30 + rng() * 25;
                this._contrast = 1.5 + rng() * 0.5;
                this._waveSpeed = 0.4 + rng() * 0.5;
                this._depthFade = 0.3;
                break;
            case 5: // Alien Sea
                this._baseHue = rng() * 360;
                this._saturation = 70 + rng() * 30;
                this._brightness = 35 + rng() * 25;
                this._contrast = 1.0 + rng() * 0.8;
                this._waveSpeed = 0.5 + rng() * 1.0;
                this._depthFade = 0.05 + rng() * 0.3;
                break;
        }

        // Generate wave sources
        const waveCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < waveCount; i++) {
            this._waves.push({
                x: rng() * system.width,
                y: rng() * system.height,
                freq: 0.01 + rng() * 0.03,
                amplitude: 0.3 + rng() * 0.7,
                phase: rng() * TAU,
                phaseSpeed: (0.01 + rng() * 0.03) * this._waveSpeed,
                drift: {
                    vx: (rng() - 0.5) * 0.5,
                    vy: (rng() - 0.5) * 0.5,
                },
            });
        }

        // Light rays for all modes
        const rayCount = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < rayCount; i++) {
            this._lightRays.push({
                x: rng() * system.width,
                width: 20 + rng() * 60,
                angle: -0.3 + rng() * 0.6,
                brightness: 0.02 + rng() * 0.04,
                speed: (rng() - 0.5) * 0.3,
                phase: rng() * TAU,
            });
        }

        // Fish shadows for coral reef mode
        if (this.mode === 2) {
            const fishCount = 3 + Math.floor(rng() * 5);
            for (let i = 0; i < fishCount; i++) {
                this._fishShadows.push({
                    x: rng() * system.width,
                    y: rng() * system.height,
                    vx: (rng() - 0.5) * 2 + 0.5,
                    vy: (rng() - 0.5) * 0.5,
                    size: 15 + rng() * 30,
                    tailPhase: rng() * TAU,
                    tailSpeed: 0.1 + rng() * 0.1,
                });
            }
        }

        // Register click handler
        if (!this._clickHandler) {
            this._clickHandler = (e) => {
                this._lastClickX = e.clientX;
                this._lastClickY = e.clientY;
                this._clickRegistered = true;
            };
            window.addEventListener('click', this._clickHandler);
        }

        this._imgData = null;
    }

    update(system) {
        this.tick++;

        const W = system.width, H = system.height;

        // Handle clicks - create splash
        if (this._clickRegistered) {
            this._clickRegistered = false;
            if (this._splashes.length < 5) {
                const splash = this._splashPool.length > 0 ? this._splashPool.pop() : {};
                splash.x = this._lastClickX;
                splash.y = this._lastClickY;
                splash.time = 0;
                splash.maxTime = 120;
                splash.freq = 0.05 + Math.random() * 0.05;
                splash.amplitude = 1.5 + Math.random();
                this._splashes.push(splash);
            }
        }

        // Update splashes
        for (let i = this._splashes.length - 1; i >= 0; i--) {
            this._splashes[i].time++;
            if (this._splashes[i].time > this._splashes[i].maxTime) {
                this._splashPool.push(this._splashes[i]);
                this._splashes[i] = this._splashes[this._splashes.length - 1];
                this._splashes.pop();
            }
        }

        // Drift wave sources
        for (const w of this._waves) {
            w.x += w.drift.vx;
            w.y += w.drift.vy;
            w.phase += w.phaseSpeed;

            // Wrap around
            if (w.x < -100) w.x = W + 100;
            if (w.x > W + 100) w.x = -100;
            if (w.y < -100) w.y = H + 100;
            if (w.y > H + 100) w.y = -100;
        }

        // Mouse disturbance: push nearby waves
        for (const w of this._waves) {
            const dx = w.x - mouse.x;
            const dy = w.y - mouse.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000 && distSq > 1) { // 200px radius
                const dist = Math.sqrt(distSq);
                w.drift.vx += (dx / dist) * 0.05;
                w.drift.vy += (dy / dist) * 0.05;
            }
            // Dampen drift
            w.drift.vx *= 0.999;
            w.drift.vy *= 0.999;
        }

        // Update fish shadows
        for (const fish of this._fishShadows) {
            fish.x += fish.vx;
            fish.y += fish.vy;
            fish.tailPhase += fish.tailSpeed;

            // Wrap
            if (fish.x > W + fish.size * 2) fish.x = -fish.size * 2;
            if (fish.x < -fish.size * 2) fish.x = W + fish.size * 2;
            if (fish.y < 0) fish.vy = Math.abs(fish.vy);
            if (fish.y > H) fish.vy = -Math.abs(fish.vy);
        }

        // Drift light rays
        for (const ray of this._lightRays) {
            ray.x += ray.speed;
            ray.phase += 0.01;
            if (ray.x < -ray.width * 2) ray.x = W + ray.width;
            if (ray.x > W + ray.width * 2) ray.x = -ray.width;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const W = system.width;
        const H = system.height;
        const res = this._resolution;
        const gridW = Math.ceil(W / res);
        const gridH = Math.ceil(H / res);

        // Compute caustic pattern
        ctx.save();

        for (let gx = 0; gx < gridW; gx++) {
            for (let gy = 0; gy < gridH; gy++) {
                const px = gx * res;
                const py = gy * res;

                // Sum wave contributions (use fast inv-sqrt approx for distance)
                let value = 0;
                for (const w of this._waves) {
                    const dx = px - w.x;
                    const dy = py - w.y;
                    const distSq = dx * dx + dy * dy;
                    // Fast distance approximation: avoid sqrt for distant cells
                    const dist = Math.sqrt(distSq);
                    value += Math.sin(dist * w.freq + w.phase) * w.amplitude;
                }

                // Add splash contributions (skip if no splashes)
                if (this._splashes.length > 0) {
                    for (const s of this._splashes) {
                        const dx = px - s.x;
                        const dy = py - s.y;
                        const distSq = dx * dx + dy * dy;
                        // Skip distant cells for splash (envelope falls off fast)
                        if (distSq > 250000) continue; // 500px radius
                        const dist = Math.sqrt(distSq);
                        const decay = 1 - s.time / s.maxTime;
                        const splashWave = Math.sin(dist * s.freq - s.time * 0.15) * s.amplitude * decay;
                        const envelope = Math.exp(-dist * 0.005) * Math.exp(-Math.max(0, (dist - s.time * 3)) * 0.01);
                        value += splashWave * envelope;
                    }
                }

                // Mouse proximity disturbance (use distSq early-exit)
                const mdx = px - mouse.x;
                const mdy = py - mouse.y;
                const mDistSq = mdx * mdx + mdy * mdy;
                if (mDistSq < 40000) { // 200px radius
                    const mDist = Math.sqrt(mDistSq);
                    const mouseWave = Math.sin(mDist * 0.05 - this.tick * 0.1) * (1 - mDist / 200) * 0.8;
                    value += mouseWave;
                }

                // Caustic function: abs of sum creates bright lines at interference peaks
                let caustic = Math.abs(value);
                // Sharpen the caustic lines
                caustic = Math.pow(caustic, this._contrast);

                // Depth fade from edges
                const edgeFade = Math.min(
                    px / (W * 0.1 + 1),
                    (W - px) / (W * 0.1 + 1),
                    py / (H * 0.1 + 1),
                    (H - py) / (H * 0.1 + 1),
                    1
                );

                const intensity = caustic * edgeFade;

                if (intensity < 0.05) continue; // Skip dark pixels

                // Hue shift based on caustic value for more visual interest
                const hue = (this._baseHue + value * 15) % 360;
                const sat = this._saturation;
                const light = this._brightness * intensity;
                const alpha = Math.min(0.3, intensity * 0.2);

                ctx.fillStyle = `hsla(${hue}, ${sat}%, ${Math.min(90, light)}%, ${alpha})`;
                ctx.fillRect(px, py, res, res);
            }
        }

        // Draw light rays
        ctx.globalCompositeOperation = 'lighter';
        for (const ray of this._lightRays) {
            const wobble = Math.sin(ray.phase) * 20;
            const x = ray.x + wobble;
            const brightness = ray.brightness * (0.7 + 0.3 * Math.sin(ray.phase * 2));

            ctx.save();
            ctx.translate(x, 0);
            ctx.rotate(ray.angle);

            const g = ctx.createLinearGradient(-ray.width / 2, 0, ray.width / 2, 0);
            g.addColorStop(0, 'transparent');
            g.addColorStop(0.3, `hsla(${this._baseHue}, ${this._saturation * 0.5}%, 80%, ${brightness})`);
            g.addColorStop(0.5, `hsla(${this._baseHue}, ${this._saturation * 0.3}%, 90%, ${brightness * 1.5})`);
            g.addColorStop(0.7, `hsla(${this._baseHue}, ${this._saturation * 0.5}%, 80%, ${brightness})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(-ray.width / 2, -50, ray.width, H + 100);

            ctx.restore();
        }

        // Draw fish shadows (coral reef mode)
        if (this.mode === 2) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            for (const fish of this._fishShadows) {
                ctx.save();
                ctx.translate(fish.x, fish.y);
                ctx.scale(fish.vx > 0 ? 1 : -1, 1);

                // Body
                ctx.beginPath();
                ctx.ellipse(0, 0, fish.size, fish.size * 0.4, 0, 0, TAU);
                ctx.fill();

                // Tail
                const tailSwing = Math.sin(fish.tailPhase) * 0.3;
                ctx.beginPath();
                ctx.moveTo(-fish.size * 0.7, 0);
                ctx.lineTo(-fish.size * 1.3, -fish.size * 0.4 + tailSwing * fish.size);
                ctx.lineTo(-fish.size * 1.3, fish.size * 0.4 + tailSwing * fish.size);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        }

        // Subtle overall water tint
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `hsla(${this._baseHue}, ${this._saturation}%, ${this._brightness * 0.3}%, ${this._depthFade * 0.3})`;
        ctx.fillRect(0, 0, W, H);

        ctx.restore();
    }
}
