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

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

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
        this._sourcePool = [];
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

        // Slits for mode 4 — cached barrier mask
        this._slits = [];
        this._barrierMask = null; // Uint8Array, 1 = blocked
        this._barrierY = 0;

        // Cymatics plate resonance frequency
        this._cymaticsFreq = 1;
        this._cymaticsPhase = 0;

        // Per-mode rendering style
        this._renderStyle = 0;

        // Spawn counter
        this._spawnIdx = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.5 + rng() * 0.5;
        this._sources = [];
        this._slits = [];
        this._barrierMask = null;
        this._spawnIdx = 0;

        this._wavelength = 15 + rng() * 40;
        this._speed = 1 + rng() * 3;
        this._damping = 0.995 + rng() * 0.004;

        // Per-mode visual differentiation
        this._renderStyle = Math.floor(rng() * 3);

        const W = window.innerWidth, H = window.innerHeight;

        this._cellSize = this.mode === 5 ? 4 : 6;
        this._hmW = Math.ceil(W / this._cellSize);
        this._hmH = Math.ceil(H / this._cellSize);
        this._heightMap = new Float32Array(this._hmW * this._hmH);

        switch (this.mode) {
            case 0:
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
            case 1:
                this._damping = 0.999;
                break;
            case 2:
                this._speed *= 1.5;
                break;
            case 3:
                this._frequencies = [1, 1.5 + rng() * 0.5, 2 + rng()];
                break;
            case 4: {
                const slitCount = 2 + Math.floor(rng() * 3);
                this._barrierY = Math.floor(this._hmH * 0.4);
                const gap = Math.floor(this._hmW / (slitCount + 1));
                for (let i = 0; i < slitCount; i++) {
                    this._slits.push({
                        x: Math.floor(gap * (i + 1)),
                        y: this._barrierY,
                        width: 2 + Math.floor(rng() * 3),
                    });
                }
                // Pre-compute barrier mask for O(w) lookup instead of O(w*slitCount) per frame
                this._barrierMask = new Uint8Array(this._hmW);
                for (let x = 0; x < this._hmW; x++) {
                    let blocked = true;
                    for (const slit of this._slits) {
                        if (Math.abs(x - slit.x) <= slit.width) {
                            blocked = false;
                            break;
                        }
                    }
                    this._barrierMask[x] = blocked ? 1 : 0;
                }
                this._sources.push({
                    x: W / 2, y: H * 0.15,
                    phase: 0, frequency: 1, amplitude: 1, decay: 1, life: Infinity,
                });
                break;
            }
            case 5:
                this._cymaticsFreq = 0.5 + rng() * 2;
                this._damping = 0.99;
                break;
        }
    }

    _pr() {
        return _prand(++this._spawnIdx * 97 + this.tick * 31);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx; this._pmy = this._my;
        this._mx = mx; this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Mouse as wave source
        if (this.tick % 3 === 0) {
            const hmx = Math.floor(mx / this._cellSize);
            const hmy = Math.floor(my / this._cellSize);
            if (hmx >= 0 && hmx < this._hmW && hmy >= 0 && hmy < this._hmH) {
                const idx = hmy * this._hmW + hmx;
                const amplitude = 0.3 + Math.min(0.7, this._mouseSpeed * 0.05);
                this._heightMap[idx] += amplitude;
                if (hmx > 0) this._heightMap[idx - 1] += amplitude * 0.5;
                if (hmx < this._hmW - 1) this._heightMap[idx + 1] += amplitude * 0.5;
                if (hmy > 0) this._heightMap[idx - this._hmW] += amplitude * 0.5;
                if (hmy < this._hmH - 1) this._heightMap[idx + this._hmW] += amplitude * 0.5;
            }
        }

        // Click to place persistent source — stronger burst on click
        if (isClicking && !this._wasClicking) {
            if (this._sources.length < this._maxSources) {
                const src = this._sourcePool.length > 0 ? this._sourcePool.pop() : {};
                src.x = mx; src.y = my;
                src.phase = 0;
                src.frequency = this.mode === 3
                    ? this._frequencies[Math.floor(this._pr() * this._frequencies.length)]
                    : 1;
                src.amplitude = 1;
                src.decay = 0.9998;
                src.life = 200 + Math.floor(this._pr() * 200);
                this._sources.push(src);
            }
            // Immediate burst at click point
            const hmx = Math.floor(mx / this._cellSize);
            const hmy = Math.floor(my / this._cellSize);
            if (hmx >= 1 && hmx < this._hmW - 1 && hmy >= 1 && hmy < this._hmH - 1) {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = hmx + dx, ny = hmy + dy;
                        if (nx >= 0 && nx < this._hmW && ny >= 0 && ny < this._hmH) {
                            const dist = Math.abs(dx) + Math.abs(dy);
                            this._heightMap[ny * this._hmW + nx] += (1 - dist * 0.2) * 0.8;
                        }
                    }
                }
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
                    if (this._sourcePool.length < 15) this._sourcePool.push(src);
                    this._sources[i] = this._sources[this._sources.length - 1];
                    this._sources.pop();
                    continue;
                }
            }

            const hmx = Math.floor(src.x / this._cellSize);
            const hmy = Math.floor(src.y / this._cellSize);
            if (hmx >= 0 && hmx < this._hmW && hmy >= 0 && hmy < this._hmH) {
                const wave = Math.sin(src.phase) * src.amplitude * 0.5;
                this._heightMap[hmy * this._hmW + hmx] += wave;

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
            for (let x = 0; x < this._hmW; x++) {
                this._heightMap[x] += edgeWave;
                this._heightMap[(this._hmH - 1) * this._hmW + x] += edgeWave;
            }
            for (let y = 0; y < this._hmH; y++) {
                this._heightMap[y * this._hmW] += edgeWave;
                this._heightMap[y * this._hmW + this._hmW - 1] += edgeWave;
            }
        }

        this._propagateWaves();
    }

    _propagateWaves() {
        const w = this._hmW, h = this._hmH;
        const hm = this._heightMap;
        const damp = this._damping;

        for (let y = 1; y < h - 1; y++) {
            const row = y * w;
            for (let x = 1; x < w - 1; x++) {
                const idx = row + x;
                const avg = (hm[idx - 1] + hm[idx + 1] + hm[idx - w] + hm[idx + w]) * 0.25;
                hm[idx] += (avg - hm[idx]) * 0.45;
                hm[idx] *= damp;
            }
        }

        // Mode 4: apply cached barrier mask (O(w) instead of O(w*slitCount))
        if (this.mode === 4 && this._barrierMask) {
            const by = this._barrierY;
            for (let x = 0; x < w; x++) {
                if (this._barrierMask[x]) {
                    hm[by * w + x] = 0;
                    if (by > 0) hm[(by - 1) * w + x] = 0;
                    if (by < h - 1) hm[(by + 1) * w + x] = 0;
                }
            }
        }

        // Boundary conditions
        if (this.mode === 1) {
            // Reflecting boundaries
            for (let x = 0; x < w; x++) {
                hm[x] = hm[w + x];
                hm[(h - 1) * w + x] = hm[(h - 2) * w + x];
            }
            for (let y = 0; y < h; y++) {
                hm[y * w] = hm[y * w + 1];
                hm[y * w + w - 1] = hm[y * w + w - 2];
            }
        } else {
            // Absorbing boundaries
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
        const style = this._renderStyle;

        ctx.globalCompositeOperation = 'lighter';

        // Per-mode visual differentiation through rendering style
        if (this.mode === 5 || style === 0) {
            // Standard: colored cells for positive/negative
            this._drawHeightmapCells(ctx, hm, w, h, cs);
        } else if (style === 1) {
            // Contour lines: draw only at threshold crossings
            this._drawContourLines(ctx, hm, w, h, cs);
        } else {
            // Radial gradient dots: each active cell draws a small glow
            this._drawGlowDots(ctx, hm, w, h, cs);
        }

        // Source indicators
        for (const src of this._sources) {
            const pulse = (Math.sin(src.phase) + 1) / 2;
            const alpha = src.amplitude * 0.15 * this.intensity;
            ctx.fillStyle = `hsla(${this.hue},80%,80%,${alpha})`;
            ctx.beginPath(); ctx.arc(src.x, src.y, 3 + pulse * 3, 0, TAU); ctx.fill();
            if (src.amplitude > 0.3) {
                ctx.strokeStyle = `hsla(${this.hue},60%,70%,${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.arc(src.x, src.y, 10 + pulse * 8, 0, TAU); ctx.stroke();
            }
        }

        // Mode 4: draw barrier
        if (this.mode === 4 && this._slits.length > 0) {
            ctx.globalCompositeOperation = 'source-over';
            const barrierY = this._barrierY * cs;
            ctx.fillStyle = `hsla(${this.hue + 60},30%,30%,0.08)`;
            ctx.fillRect(0, barrierY - cs, system.width, cs * 3);
            for (const slit of this._slits) {
                ctx.fillStyle = `hsla(${this.hue},60%,70%,0.1)`;
                ctx.fillRect((slit.x - slit.width) * cs, barrierY - cs, slit.width * 2 * cs, cs * 3);
            }
        }

        ctx.restore();
    }

    _drawHeightmapCells(ctx, hm, w, h, cs) {
        // Positive interference
        for (let y = 0; y < h; y++) {
            const row = y * w, py = y * cs;
            for (let x = 0; x < w; x++) {
                const val = hm[row + x];
                if (val < 0.02) continue;
                const clamped = Math.min(1, val);
                const alpha = clamped * 0.15 * this.intensity;
                const hueShift = this.mode === 2 ? clamped * 60 : clamped * 20;
                ctx.fillStyle = `hsla(${(this.hue + hueShift + 360) % 360},70%,${45 + Math.floor(clamped * 35)}%,${alpha})`;
                ctx.fillRect(x * cs, py, cs, cs);
            }
        }
        // Negative interference
        const negHue = (this.hue + 180) % 360;
        for (let y = 0; y < h; y++) {
            const row = y * w, py = y * cs;
            for (let x = 0; x < w; x++) {
                const val = hm[row + x];
                if (val > -0.02) continue;
                const clamped = Math.min(1, -val);
                const alpha = clamped * 0.08 * this.intensity;
                ctx.fillStyle = `hsla(${negHue},50%,${35 + Math.floor(clamped * 25)}%,${alpha})`;
                ctx.fillRect(x * cs, py, cs, cs);
            }
        }
    }

    _drawContourLines(ctx, hm, w, h, cs) {
        // Draw lines where height crosses threshold values
        const thresholds = [0.1, 0.3, 0.5, 0.7];
        for (let t = 0; t < thresholds.length; t++) {
            const threshold = thresholds[t];
            const alpha = (0.06 + t * 0.03) * this.intensity;
            const hue = (this.hue + t * 30) % 360;
            ctx.strokeStyle = `hsla(${hue},70%,65%,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let y = 1; y < h - 1; y++) {
                const row = y * w;
                for (let x = 1; x < w - 1; x++) {
                    const val = hm[row + x];
                    // Check if this cell crosses the threshold with any neighbor
                    if (val >= threshold) {
                        const left = hm[row + x - 1];
                        const up = hm[row - w + x];
                        if (left < threshold) {
                            ctx.moveTo(x * cs, y * cs);
                            ctx.lineTo(x * cs, (y + 1) * cs);
                        }
                        if (up < threshold) {
                            ctx.moveTo(x * cs, y * cs);
                            ctx.lineTo((x + 1) * cs, y * cs);
                        }
                    }
                }
            }
            ctx.stroke();
        }
        // Also show negative contours in complementary color
        const negHue = (this.hue + 180) % 360;
        ctx.strokeStyle = `hsla(${negHue},50%,55%,${0.04 * this.intensity})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let y = 1; y < h - 1; y++) {
            const row = y * w;
            for (let x = 1; x < w - 1; x++) {
                const val = hm[row + x];
                if (val <= -0.15) {
                    const left = hm[row + x - 1];
                    if (left > -0.15) {
                        ctx.moveTo(x * cs, y * cs);
                        ctx.lineTo(x * cs, (y + 1) * cs);
                    }
                }
            }
        }
        ctx.stroke();
    }

    _drawGlowDots(ctx, hm, w, h, cs) {
        // Each active cell is a small glowing circle instead of a rectangle
        for (let y = 0; y < h; y += 2) {
            const row = y * w;
            for (let x = 0; x < w; x += 2) {
                const val = hm[row + x];
                const absVal = val < 0 ? -val : val;
                if (absVal < 0.03) continue;
                const clamped = Math.min(1, absVal);
                const alpha = clamped * 0.12 * this.intensity;
                const hue = val > 0
                    ? (this.hue + clamped * 30) % 360
                    : (this.hue + 180) % 360;
                const radius = cs * 0.5 + clamped * cs * 0.8;
                ctx.fillStyle = `hsla(${hue},70%,${50 + Math.floor(clamped * 30)}%,${alpha})`;
                ctx.beginPath();
                ctx.arc(x * cs + cs, y * cs + cs, radius, 0, TAU);
                ctx.fill();
            }
        }
    }
}
