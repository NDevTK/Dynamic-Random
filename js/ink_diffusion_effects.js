/**
 * @file ink_diffusion_effects.js
 * @description Simulates ink drops diffusing through water with realistic fluid dynamics.
 * The cursor leaves ink trails that spread, mix, and create watercolor-like blending.
 * Seed controls ink viscosity, color palette, diffusion speed, and surface tension.
 *
 * Modes:
 * 0 - Watercolor: Soft pastel inks that blend and feather gently
 * 1 - Sumi-e: High contrast black ink with dramatic bleeding edges
 * 2 - Tie-Dye: Vibrant rainbow inks that spiral as they diffuse
 * 3 - Chemical Reaction: Two reactive inks that create patterns where they meet
 * 4 - Aurora Ink: Translucent glowing inks that shift color as they spread
 * 5 - Oil Slick: Iridescent thin-film interference colors on dark surface
 */

export class InkDiffusion {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this._rng = Math.random;

        // Diffusion grid (stores ink density per channel)
        this._cellSize = 4;
        this._cols = 0;
        this._rows = 0;
        // Two ink channels for mixing
        this._inkA = null;   // Float32Array - primary ink density
        this._inkB = null;   // Float32Array - secondary ink density
        this._velX = null;   // Float32Array - velocity field X
        this._velY = null;   // Float32Array - velocity field Y
        this._temp = null;   // Float32Array - scratch buffer

        // Offscreen rendering
        this._offCanvas = null;
        this._offCtx = null;
        this._imageData = null;

        // Ink properties
        this._diffusionRate = 0.12;
        this._viscosity = 0.98;
        this._evaporationRate = 0.001;
        this._inkDensity = 0.5;
        this._hueA = 0;
        this._hueB = 180;
        this._saturation = 70;

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Drop queue for deferred spawning
        this._dropQueue = [];
    }

    configure(rng, hues) {
        this._rng = rng;
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);

        this.mode = Math.floor(rng() * 6);

        // Cell size affects resolution/performance tradeoff
        this._cellSize = this.mode === 1 ? 3 : (4 + Math.floor(rng() * 3));

        const w = window.innerWidth;
        const h = window.innerHeight;
        this._cols = Math.ceil(w / this._cellSize);
        this._rows = Math.ceil(h / this._cellSize);
        const total = this._cols * this._rows;

        this._inkA = new Float32Array(total);
        this._inkB = new Float32Array(total);
        this._velX = new Float32Array(total);
        this._velY = new Float32Array(total);
        this._temp = new Float32Array(total);

        // Mode-specific tuning
        switch (this.mode) {
            case 0: // Watercolor
                this._diffusionRate = 0.08 + rng() * 0.08;
                this._viscosity = 0.96 + rng() * 0.03;
                this._evaporationRate = 0.0008 + rng() * 0.001;
                this._inkDensity = 0.3 + rng() * 0.3;
                this._saturation = 40 + rng() * 30;
                this._hueA = this.hue;
                this._hueB = (this.hue + 60 + rng() * 60) % 360;
                break;
            case 1: // Sumi-e
                this._diffusionRate = 0.05 + rng() * 0.06;
                this._viscosity = 0.94 + rng() * 0.04;
                this._evaporationRate = 0.0003 + rng() * 0.0005;
                this._inkDensity = 0.6 + rng() * 0.3;
                this._saturation = 5 + rng() * 10;
                this._hueA = 0;
                this._hueB = 0;
                break;
            case 2: // Tie-Dye
                this._diffusionRate = 0.1 + rng() * 0.1;
                this._viscosity = 0.97 + rng() * 0.02;
                this._evaporationRate = 0.001 + rng() * 0.001;
                this._inkDensity = 0.4 + rng() * 0.3;
                this._saturation = 80 + rng() * 20;
                this._hueA = this.hue;
                this._hueB = (this.hue + 120 + rng() * 120) % 360;
                break;
            case 3: // Chemical Reaction
                this._diffusionRate = 0.06 + rng() * 0.06;
                this._viscosity = 0.95 + rng() * 0.03;
                this._evaporationRate = 0.0005 + rng() * 0.0005;
                this._inkDensity = 0.5 + rng() * 0.3;
                this._saturation = 70 + rng() * 20;
                this._hueA = this.hue;
                this._hueB = (this.hue + 180) % 360;
                break;
            case 4: // Aurora Ink
                this._diffusionRate = 0.12 + rng() * 0.08;
                this._viscosity = 0.98 + rng() * 0.015;
                this._evaporationRate = 0.0015 + rng() * 0.001;
                this._inkDensity = 0.25 + rng() * 0.2;
                this._saturation = 60 + rng() * 30;
                this._hueA = this.hue;
                this._hueB = (this.hue + 90) % 360;
                break;
            case 5: // Oil Slick
                this._diffusionRate = 0.04 + rng() * 0.04;
                this._viscosity = 0.99;
                this._evaporationRate = 0.0002 + rng() * 0.0003;
                this._inkDensity = 0.15 + rng() * 0.15;
                this._saturation = 90;
                this._hueA = this.hue;
                this._hueB = (this.hue + 40) % 360;
                break;
        }

        this._offCanvas = null;
    }

    _ensureOffCanvas() {
        if (!this._offCanvas || this._offCanvas.width !== this._cols || this._offCanvas.height !== this._rows) {
            this._offCanvas = document.createElement('canvas');
            this._offCanvas.width = this._cols;
            this._offCanvas.height = this._rows;
            this._offCtx = this._offCanvas.getContext('2d', { alpha: true });
            this._imageData = this._offCtx.createImageData(this._cols, this._rows);
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        const cols = this._cols;
        const rows = this._rows;
        const cs = this._cellSize;
        const cx = Math.floor(mx / cs);
        const cy = Math.floor(my / cs);

        // Deposit ink under cursor (channel A for normal, B for click)
        const channel = isClicking ? this._inkB : this._inkA;
        const brushR = isClicking ? 4 : 2;
        const density = this._inkDensity * (isClicking ? 1.5 : 1);
        for (let bdy = -brushR; bdy <= brushR; bdy++) {
            for (let bdx = -brushR; bdx <= brushR; bdx++) {
                const dist = bdx * bdx + bdy * bdy;
                if (dist > brushR * brushR) continue;
                const nx = cx + bdx;
                const ny = cy + bdy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    const idx = ny * cols + nx;
                    const falloff = 1 - Math.sqrt(dist) / brushR;
                    channel[idx] = Math.min(1, channel[idx] + density * falloff);
                    // Add velocity from mouse movement
                    this._velX[idx] += dx * 0.02;
                    this._velY[idx] += dy * 0.02;
                }
            }
        }

        // Click burst
        if (isClicking && !this._wasClicking) {
            const burstR = 6;
            for (let bdy = -burstR; bdy <= burstR; bdy++) {
                for (let bdx = -burstR; bdx <= burstR; bdx++) {
                    const dist = bdx * bdx + bdy * bdy;
                    if (dist > burstR * burstR) continue;
                    const nx = cx + bdx;
                    const ny = cy + bdy;
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                        const idx = ny * cols + nx;
                        // Radial velocity outward
                        const d = Math.sqrt(dist) + 0.1;
                        this._velX[idx] += (bdx / d) * 0.5;
                        this._velY[idx] += (bdy / d) * 0.5;
                        this._inkB[idx] = Math.min(1, this._inkB[idx] + 0.8 * (1 - d / burstR));
                    }
                }
            }
        }

        // Fluid simulation step (simplified Navier-Stokes)
        this._diffuse();
        this._advect();
        this._evaporate();

        // Chemical reaction mode: where A and B overlap, create reaction patterns
        if (this.mode === 3) {
            const inkA = this._inkA;
            const inkB = this._inkB;
            for (let i = 0; i < cols * rows; i++) {
                const overlap = Math.min(inkA[i], inkB[i]);
                if (overlap > 0.05) {
                    // Reaction consumes both and creates turbulence
                    const react = overlap * 0.05;
                    inkA[i] -= react;
                    inkB[i] -= react;
                    // Create spiral velocity from reaction
                    const x = i % cols;
                    const y = (i / cols) | 0;
                    const angle = this.tick * 0.01 + (x + y) * 0.1;
                    this._velX[i] += Math.cos(angle) * react * 2;
                    this._velY[i] += Math.sin(angle) * react * 2;
                }
            }
        }

        // Tie-dye spiral
        if (this.mode === 2 && this.tick % 4 === 0) {
            const centerX = cols / 2;
            const centerY = rows / 2;
            for (let i = 0; i < cols * rows; i++) {
                if (this._inkA[i] > 0.01 || this._inkB[i] > 0.01) {
                    const x = i % cols;
                    const y = (i / cols) | 0;
                    const tdx = x - centerX;
                    const tdy = y - centerY;
                    const dist = Math.sqrt(tdx * tdx + tdy * tdy) + 1;
                    // Tangential velocity for spiral
                    this._velX[i] += (-tdy / dist) * 0.003;
                    this._velY[i] += (tdx / dist) * 0.003;
                }
            }
        }
    }

    _diffuse() {
        const cols = this._cols;
        const rows = this._rows;
        const rate = this._diffusionRate;
        const inkA = this._inkA;
        const inkB = this._inkB;

        // Single-pass diffusion for each ink channel
        const temp = this._temp;
        // Diffuse A
        for (let y = 1; y < rows - 1; y++) {
            const yOff = y * cols;
            for (let x = 1; x < cols - 1; x++) {
                const idx = yOff + x;
                temp[idx] = inkA[idx] + rate * (
                    inkA[idx - 1] + inkA[idx + 1] +
                    inkA[idx - cols] + inkA[idx + cols] -
                    4 * inkA[idx]
                );
            }
        }
        for (let y = 1; y < rows - 1; y++) {
            const yOff = y * cols;
            for (let x = 1; x < cols - 1; x++) {
                inkA[yOff + x] = Math.max(0, temp[yOff + x]);
            }
        }
        // Diffuse B
        for (let y = 1; y < rows - 1; y++) {
            const yOff = y * cols;
            for (let x = 1; x < cols - 1; x++) {
                const idx = yOff + x;
                temp[idx] = inkB[idx] + rate * (
                    inkB[idx - 1] + inkB[idx + 1] +
                    inkB[idx - cols] + inkB[idx + cols] -
                    4 * inkB[idx]
                );
            }
        }
        for (let y = 1; y < rows - 1; y++) {
            const yOff = y * cols;
            for (let x = 1; x < cols - 1; x++) {
                inkB[yOff + x] = Math.max(0, temp[yOff + x]);
            }
        }
    }

    _advect() {
        const cols = this._cols;
        const rows = this._rows;
        const velX = this._velX;
        const velY = this._velY;
        const inkA = this._inkA;
        const inkB = this._inkB;
        const visc = this._viscosity;

        // Move ink along velocity field (semi-Lagrangian)
        const tempA = this._temp;
        tempA.fill(0);

        for (let y = 1; y < rows - 1; y++) {
            const yOff = y * cols;
            for (let x = 1; x < cols - 1; x++) {
                const idx = yOff + x;
                const vx = velX[idx];
                const vy = velY[idx];

                // Source position (trace back)
                let srcX = x - vx;
                let srcY = y - vy;
                srcX = Math.max(0.5, Math.min(cols - 1.5, srcX));
                srcY = Math.max(0.5, Math.min(rows - 1.5, srcY));

                // Bilinear interpolation
                const ix = Math.floor(srcX);
                const iy = Math.floor(srcY);
                const fx = srcX - ix;
                const fy = srcY - iy;

                const i00 = iy * cols + ix;
                const i10 = i00 + 1;
                const i01 = i00 + cols;
                const i11 = i01 + 1;

                if (ix >= 0 && ix < cols - 1 && iy >= 0 && iy < rows - 1) {
                    tempA[idx] = (1 - fx) * (1 - fy) * inkA[i00] +
                                 fx * (1 - fy) * inkA[i10] +
                                 (1 - fx) * fy * inkA[i01] +
                                 fx * fy * inkA[i11];
                }

                // Dampen velocity
                velX[idx] *= visc;
                velY[idx] *= visc;
            }
        }

        // Copy back
        for (let i = 0; i < cols * rows; i++) {
            inkA[i] = tempA[i];
        }
    }

    _evaporate() {
        const rate = this._evaporationRate;
        const total = this._cols * this._rows;
        for (let i = 0; i < total; i++) {
            this._inkA[i] = Math.max(0, this._inkA[i] - rate);
            this._inkB[i] = Math.max(0, this._inkB[i] - rate);
        }
    }

    draw(ctx, system) {
        this._ensureOffCanvas();

        const cols = this._cols;
        const rows = this._rows;
        const inkA = this._inkA;
        const inkB = this._inkB;
        const data = this._imageData.data;

        for (let y = 0; y < rows; y++) {
            const yOff = y * cols;
            for (let x = 0; x < cols; x++) {
                const idx = yOff + x;
                const pIdx = idx * 4;
                const a = inkA[idx];
                const b = inkB[idx];
                const total = a + b;

                if (total < 0.005) {
                    data[pIdx] = 0;
                    data[pIdx + 1] = 0;
                    data[pIdx + 2] = 0;
                    data[pIdx + 3] = 0;
                    continue;
                }

                let r, g, bl;
                const clampedTotal = Math.min(1, total);

                if (this.mode === 1) {
                    // Sumi-e: grayscale with edge darkening
                    const v = Math.floor((1 - clampedTotal * 0.9) * 255);
                    r = v; g = v; bl = v;
                } else if (this.mode === 5) {
                    // Oil slick: thin-film interference (hue shifts with density)
                    const filmHue = (this._hueA + clampedTotal * 360) % 360;
                    const rgb = this._hslToRgb(filmHue / 360, 0.9, 0.3 + clampedTotal * 0.4);
                    r = rgb[0]; g = rgb[1]; bl = rgb[2];
                } else {
                    // Mix two ink colors based on ratio
                    const ratioA = total > 0.001 ? a / total : 0.5;
                    const mixHue = this._lerpAngle(this._hueA, this._hueB, 1 - ratioA);
                    const sat = this._saturation;
                    const light = 30 + clampedTotal * 40;
                    const rgb = this._hslToRgb(mixHue / 360, sat / 100, light / 100);
                    r = rgb[0]; g = rgb[1]; bl = rgb[2];
                }

                // Aurora mode: add shimmer
                if (this.mode === 4) {
                    const shimmer = Math.sin(this.tick * 0.05 + x * 0.1 + y * 0.1) * 20;
                    r = Math.min(255, Math.max(0, r + shimmer));
                    g = Math.min(255, Math.max(0, g + shimmer * 0.5));
                }

                data[pIdx] = r;
                data[pIdx + 1] = g;
                data[pIdx + 2] = bl;
                data[pIdx + 3] = Math.floor(clampedTotal * 180);
            }
        }

        this._offCtx.putImageData(this._imageData, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = this.mode === 1 ? 'multiply' : 'lighter';
        ctx.globalAlpha = this.mode === 1 ? 0.8 : 0.65;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this._offCanvas, 0, 0, window.innerWidth, window.innerHeight);
        ctx.restore();
    }

    _lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return (a + diff * t + 360) % 360;
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}
