/**
 * @file wave_interference_effects.js
 * @description Interactive wave interference patterns. Wave sources emit expanding rings
 * that constructively/destructively interfere, creating moiré-like visual patterns.
 * Mouse is a wave source; clicking drops persistent wave emitters. Seed controls wave
 * properties, color, and behavior for dramatically different visual results.
 *
 * Modes:
 * 0 - Ripple Pool: Classic circular wave interference like stones in water
 * 1 - Standing Waves: Waves bounce off edges creating standing wave nodes
 * 2 - Doppler Shift: Moving wave source creates compressed/stretched wave fronts
 * 3 - Harmonic Overtones: Multiple frequency waves from each source create complex patterns
 * 4 - Quantum Slit: Waves pass through slit barriers creating diffraction patterns
 * 5 - Cymatics: Vibration patterns form geometric nodal structures on a flat plane
 */

const TAU = Math.PI * 2;

export class WaveInterference {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Wave sources
        this._sources = [];
        this._maxSources = 12;

        // Wave rendering via low-res heightmap
        this._heightMap = null;
        this._hmW = 0;
        this._hmH = 0;
        this._cellSize = 6;

        // Wave params
        this._wavelength = 30;
        this._speed = 2;
        this._damping = 0.998;
        this._frequencies = [1];

        // Slits for mode 4
        this._slits = [];

        // Cymatics plate resonance frequency
        this._cymaticsFreq = 1;
        this._cymaticsPhase = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.5 + rng() * 0.5;
        this._sources = [];
        this._slits = [];

        // Wave parameters from seed - these dramatically change appearance
        this._wavelength = 15 + rng() * 40;
        this._speed = 1 + rng() * 3;
        this._damping = 0.995 + rng() * 0.004;

        const W = window.innerWidth, H = window.innerHeight;

        // Heightmap for wave computation
        this._cellSize = this.mode === 5 ? 4 : 6;
        this._hmW = Math.ceil(W / this._cellSize);
        this._hmH = Math.ceil(H / this._cellSize);
        this._heightMap = new Float32Array(this._hmW * this._hmH);

        switch (this.mode) {
            case 0: // Ripple Pool
                // Start with a couple initial sources
                for (let i = 0; i < 2; i++) {
                    this._sources.push({
                        x: W * (0.3 + rng() * 0.4),
                        y: H * (0.3 + rng() * 0.4),
                        phase: 0, frequency: 1,
                        amplitude: 1, decay: 0.9995,
                        life: 300 + Math.floor(rng() * 200),
                    });
                }
                break;
            case 1: // Standing Waves
                this._damping = 0.999; // Less damping for standing waves
                break;
            case 2: // Doppler
                this._speed *= 1.5;
                break;
            case 3: // Harmonic Overtones
                this._frequencies = [1, 1.5 + rng() * 0.5, 2 + rng()];
                break;
            case 4: // Quantum Slit
                // Create barrier with slits
                const slitCount = 2 + Math.floor(rng() * 3);
                const barrierY = Math.floor(this._hmH * 0.4);
                const gap = Math.floor(this._hmW / (slitCount + 1));
                for (let i = 0; i < slitCount; i++) {
                    this._slits.push({
                        x: Math.floor(gap * (i + 1)),
                        y: barrierY,
                        width: 2 + Math.floor(rng() * 3),
                    });
                }
                // Place source above barrier
                this._sources.push({
                    x: W / 2, y: H * 0.15,
                    phase: 0, frequency: 1, amplitude: 1, decay: 1, life: Infinity,
                });
                break;
            case 5: // Cymatics
                this._cymaticsFreq = 0.5 + rng() * 2;
                this._damping = 0.99;
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx; this._pmy = this._my;
        this._mx = mx; this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Mouse as wave source (continuous emission)
        if (this.tick % 3 === 0) {
            const hmx = Math.floor(mx / this._cellSize);
            const hmy = Math.floor(my / this._cellSize);
            if (hmx >= 0 && hmx < this._hmW && hmy >= 0 && hmy < this._hmH) {
                const idx = hmy * this._hmW + hmx;
                const amplitude = 0.3 + Math.min(0.7, this._mouseSpeed * 0.05);
                this._heightMap[idx] += amplitude;
                // Spread to neighbors
                if (hmx > 0) this._heightMap[idx - 1] += amplitude * 0.5;
                if (hmx < this._hmW - 1) this._heightMap[idx + 1] += amplitude * 0.5;
                if (hmy > 0) this._heightMap[idx - this._hmW] += amplitude * 0.5;
                if (hmy < this._hmH - 1) this._heightMap[idx + this._hmW] += amplitude * 0.5;
            }
        }

        // Click to place persistent source
        if (isClicking && !this._wasClicking) {
            if (this._sources.length < this._maxSources) {
                this._sources.push({
                    x: mx, y: my,
                    phase: 0,
                    frequency: this.mode === 3
                        ? this._frequencies[Math.floor(Math.random() * this._frequencies.length)]
                        : 1,
                    amplitude: 1,
                    decay: 0.9998,
                    life: 200 + Math.floor(Math.random() * 200),
                });
            }
        }
        this._wasClicking = isClicking;

        // Emit waves from sources
        for (let i = this._sources.length - 1; i >= 0; i--) {
            const src = this._sources[i];
            src.phase += 0.1 * src.frequency;
            src.amplitude *= src.decay;

            if (src.life !== Infinity) {
                src.life--;
                if (src.life <= 0 || src.amplitude < 0.01) {
                    this._sources[i] = this._sources[this._sources.length - 1];
                    this._sources.pop();
                    continue;
                }
            }

            // Emit wave at source position
            const hmx = Math.floor(src.x / this._cellSize);
            const hmy = Math.floor(src.y / this._cellSize);
            if (hmx >= 0 && hmx < this._hmW && hmy >= 0 && hmy < this._hmH) {
                const wave = Math.sin(src.phase) * src.amplitude * 0.5;
                this._heightMap[hmy * this._hmW + hmx] += wave;

                // Harmonic mode: add overtones
                if (this.mode === 3) {
                    for (let f = 1; f < this._frequencies.length; f++) {
                        const overtone = Math.sin(src.phase * this._frequencies[f]) * src.amplitude * 0.3 / (f + 1);
                        this._heightMap[hmy * this._hmW + hmx] += overtone;
                    }
                }
            }
        }

        // Cymatics: edge excitation
        if (this.mode === 5) {
            this._cymaticsPhase += 0.05 * this._cymaticsFreq;
            const edgeWave = Math.sin(this._cymaticsPhase) * 0.3;
            // Excite all edges
            for (let x = 0; x < this._hmW; x++) {
                this._heightMap[x] += edgeWave;
                this._heightMap[(this._hmH - 1) * this._hmW + x] += edgeWave;
            }
            for (let y = 0; y < this._hmH; y++) {
                this._heightMap[y * this._hmW] += edgeWave;
                this._heightMap[y * this._hmW + this._hmW - 1] += edgeWave;
            }
        }

        // Propagate waves using simple 2D wave equation
        // We use the heightmap as current state and compute updates in-place
        // with boundary conditions
        this._propagateWaves();
    }

    _propagateWaves() {
        const w = this._hmW, h = this._hmH;
        const hm = this._heightMap;
        const damp = this._damping;

        // Simple diffusion-based wave propagation
        // Instead of a full wave equation (needs 2 buffers), we use a fast blur + decay
        // This produces convincing visual results with half the memory
        for (let y = 1; y < h - 1; y++) {
            const row = y * w;
            for (let x = 1; x < w - 1; x++) {
                const idx = row + x;
                const avg = (hm[idx - 1] + hm[idx + 1] + hm[idx - w] + hm[idx + w]) * 0.25;
                hm[idx] += (avg - hm[idx]) * 0.45;
                hm[idx] *= damp;
            }
        }

        // Quantum slit barrier (mode 4): zero out heightmap along barrier except at slits
        if (this.mode === 4 && this._slits.length > 0) {
            const barrierY = this._slits[0].y;
            for (let x = 0; x < w; x++) {
                let inSlit = false;
                for (const slit of this._slits) {
                    if (Math.abs(x - slit.x) <= slit.width) {
                        inSlit = true;
                        break;
                    }
                }
                if (!inSlit) {
                    hm[barrierY * w + x] = 0;
                    if (barrierY > 0) hm[(barrierY - 1) * w + x] = 0;
                    if (barrierY < h - 1) hm[(barrierY + 1) * w + x] = 0;
                }
            }
        }

        // Standing waves (mode 1): reflect at boundaries
        if (this.mode === 1) {
            for (let x = 0; x < w; x++) {
                hm[x] = hm[w + x]; // top
                hm[(h - 1) * w + x] = hm[(h - 2) * w + x]; // bottom
            }
            for (let y = 0; y < h; y++) {
                hm[y * w] = hm[y * w + 1]; // left
                hm[y * w + w - 1] = hm[y * w + w - 2]; // right
            }
        } else {
            // Absorbing boundaries (zero)
            for (let x = 0; x < w; x++) {
                hm[x] *= 0.9;
                hm[(h - 1) * w + x] *= 0.9;
            }
            for (let y = 0; y < h; y++) {
                hm[y * w] *= 0.9;
                hm[y * w + w - 1] *= 0.9;
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        const w = this._hmW, h = this._hmH;
        const hm = this._heightMap;
        const cs = this._cellSize;

        // Render heightmap as colored cells
        // Batch into positive (constructive) and negative (destructive) passes
        ctx.globalCompositeOperation = 'lighter';

        // Positive interference (bright)
        for (let y = 0; y < h; y++) {
            const row = y * w;
            const py = y * cs;
            for (let x = 0; x < w; x++) {
                const val = hm[row + x];
                if (val < 0.02) continue;

                const clamped = Math.min(1, val);
                const alpha = clamped * 0.15 * this.intensity;
                const hueShift = this.mode === 2
                    ? clamped * 60 // Doppler: red/blue shift
                    : clamped * 20;
                const hue = (this.hue + hueShift + 360) % 360;
                const lightness = 45 + clamped * 35;

                ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;
                ctx.fillRect(x * cs, py, cs, cs);
            }
        }

        // Negative interference (complementary color)
        for (let y = 0; y < h; y++) {
            const row = y * w;
            const py = y * cs;
            for (let x = 0; x < w; x++) {
                const val = hm[row + x];
                if (val > -0.02) continue;

                const clamped = Math.min(1, -val);
                const alpha = clamped * 0.08 * this.intensity;
                const hue = (this.hue + 180) % 360; // Complementary
                const lightness = 35 + clamped * 25;

                ctx.fillStyle = `hsla(${hue}, 50%, ${lightness}%, ${alpha})`;
                ctx.fillRect(x * cs, py, cs, cs);
            }
        }

        // Draw source indicators
        for (const src of this._sources) {
            const pulse = (Math.sin(src.phase) + 1) / 2;
            const alpha = src.amplitude * 0.15 * this.intensity;
            ctx.fillStyle = `hsla(${this.hue}, 80%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(src.x, src.y, 3 + pulse * 3, 0, TAU);
            ctx.fill();

            // Expanding ring indicator
            if (src.amplitude > 0.3) {
                ctx.strokeStyle = `hsla(${this.hue}, 60%, 70%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(src.x, src.y, 10 + pulse * 8, 0, TAU);
                ctx.stroke();
            }
        }

        // Mode 4: draw barrier
        if (this.mode === 4 && this._slits.length > 0) {
            const barrierY = this._slits[0].y * cs;
            ctx.fillStyle = `hsla(${this.hue + 60}, 30%, 30%, 0.08)`;
            ctx.fillRect(0, barrierY - cs, system.width, cs * 3);

            // Highlight slits
            for (const slit of this._slits) {
                ctx.fillStyle = `hsla(${this.hue}, 60%, 70%, 0.1)`;
                ctx.fillRect((slit.x - slit.width) * cs, barrierY - cs, slit.width * 2 * cs, cs * 3);
            }
        }

        ctx.restore();
    }
}
