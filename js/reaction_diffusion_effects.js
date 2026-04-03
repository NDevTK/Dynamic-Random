/**
 * @file reaction_diffusion_effects.js
 * @description Real-time reaction-diffusion (Gray-Scott model) creating Turing patterns
 * that evolve organically. Mouse proximity alters feed/kill rates, producing dramatic
 * morphogenesis. Click injects chemical B at the cursor location, seeding new growth.
 * Each seed produces different chemical parameters = different pattern types.
 *
 * Modes:
 * 0 - Mitosis: Spotted patterns that split and multiply (coral-like)
 * 1 - Worms: Writhing worm-like stripes that flow and merge
 * 2 - Maze: Labyrinthine patterns that slowly fill the screen
 * 3 - Pulse: Soliton-like pulses that propagate in waves
 * 4 - Fingerprint: Dense, fine-grained swirling patterns
 * 5 - Ecosystem: Mix of spots and stripes with predator-prey dynamics
 */

export class ReactionDiffusion {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this._rng = Math.random;

        // Grid (downscaled for performance)
        this._scale = 4; // Each cell = 4x4 pixels
        this._cols = 0;
        this._rows = 0;
        this._gridA = null; // Chemical A concentration
        this._gridB = null; // Chemical B concentration
        this._nextA = null;
        this._nextB = null;

        // Gray-Scott parameters (seed-dependent)
        this._feed = 0.055;
        this._kill = 0.062;
        this._diffA = 1.0;
        this._diffB = 0.5;

        // Rendering
        this._imgCanvas = null;
        this._imgCtx = null;
        this._imageData = null;

        // Mouse interaction
        this._mouseX = 0;
        this._mouseY = 0;

        // Click seeding
        this._clickSeeds = [];

        // Pre-computed row offsets for laplacian
        this._rowUp = null;
        this._rowDown = null;
        this._colLeft = null;
        this._colRight = null;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this._clickSeeds = [];

        // Mode-specific Gray-Scott parameters
        // These tiny parameter changes produce wildly different patterns
        switch (this.mode) {
            case 0: // Mitosis (spots)
                this._feed = 0.0367 + rng() * 0.003;
                this._kill = 0.0649 + rng() * 0.002;
                break;
            case 1: // Worms (stripes)
                this._feed = 0.058 + rng() * 0.004;
                this._kill = 0.065 + rng() * 0.002;
                break;
            case 2: // Maze (labyrinth)
                this._feed = 0.029 + rng() * 0.003;
                this._kill = 0.057 + rng() * 0.002;
                break;
            case 3: // Pulse (solitons)
                this._feed = 0.014 + rng() * 0.004;
                this._kill = 0.045 + rng() * 0.003;
                break;
            case 4: // Fingerprint
                this._feed = 0.042 + rng() * 0.003;
                this._kill = 0.063 + rng() * 0.002;
                break;
            case 5: // Ecosystem
                this._feed = 0.039 + rng() * 0.005;
                this._kill = 0.058 + rng() * 0.004;
                break;
        }

        this._diffA = 1.0;
        this._diffB = 0.5;

        // Additional seed variation
        this._diffA += (rng() - 0.5) * 0.1;
        this._diffB += (rng() - 0.5) * 0.05;

        // Reset grid
        this._gridA = null;
    }

    _initGrid(w, h) {
        this._cols = Math.ceil(w / this._scale);
        this._rows = Math.ceil(h / this._scale);
        const cols = this._cols;
        const rows = this._rows;
        const size = cols * rows;

        this._gridA = new Float32Array(size).fill(1);
        this._gridB = new Float32Array(size).fill(0);
        this._nextA = new Float32Array(size);
        this._nextB = new Float32Array(size);

        // Pre-compute neighbor offsets for wrapping (avoids modulo in hot loop)
        this._rowUp = new Int32Array(rows);
        this._rowDown = new Int32Array(rows);
        this._colLeft = new Int32Array(cols);
        this._colRight = new Int32Array(cols);
        for (let y = 0; y < rows; y++) {
            this._rowUp[y] = ((y - 1 + rows) % rows) * cols;
            this._rowDown[y] = ((y + 1) % rows) * cols;
        }
        for (let x = 0; x < cols; x++) {
            this._colLeft[x] = (x - 1 + cols) % cols;
            this._colRight[x] = (x + 1) % cols;
        }

        // Seed initial B chemical in random spots
        const rng = this._rng;
        const numSeeds = 5 + Math.floor(rng() * 10);
        for (let s = 0; s < numSeeds; s++) {
            const cx = Math.floor(rng() * cols);
            const cy = Math.floor(rng() * rows);
            const radius = 3 + Math.floor(rng() * 5);
            this._seedChemicalB(cx, cy, radius);
        }

        // Image canvas for rendering
        this._imgCanvas = document.createElement('canvas');
        this._imgCanvas.width = cols;
        this._imgCanvas.height = rows;
        this._imgCtx = this._imgCanvas.getContext('2d');
        this._imageData = this._imgCtx.createImageData(cols, rows);
    }

    _seedChemicalB(cx, cy, radius) {
        const cols = this._cols;
        const rows = this._rows;
        const r2 = radius * radius;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > r2) continue;
                const x = (cx + dx + cols) % cols;
                const y = (cy + dy + rows) % rows;
                this._gridB[y * cols + x] = 1;
            }
        }
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;

        if (!this._gridA || Math.ceil(w / this._scale) !== this._cols) {
            this._initGrid(w, h);
        }

        this._mouseX = (system.mouse ? system.mouse.x : w / 2) / this._scale;
        this._mouseY = (system.mouse ? system.mouse.y : h / 2) / this._scale;

        // Process click seeds
        for (const cs of this._clickSeeds) {
            const gx = (cs.x / this._scale) | 0;
            const gy = (cs.y / this._scale) | 0;
            this._seedChemicalB(gx, gy, 5);
        }
        this._clickSeeds.length = 0;

        const cols = this._cols;
        const rows = this._rows;
        const baseFeed = this._feed;
        const baseKill = this._kill;
        const dA = this._diffA;
        const dB = this._diffB;
        const mx = this._mouseX;
        const my = this._mouseY;
        const rowUp = this._rowUp;
        const rowDown = this._rowDown;
        const colLeft = this._colLeft;
        const colRight = this._colRight;

        // Run simulation steps (2 per frame for speed)
        // Use local refs that update after each swap to fix the double-step bug
        let A = this._gridA;
        let B = this._gridB;
        let nA = this._nextA;
        let nB = this._nextB;

        for (let step = 0; step < 2; step++) {
            for (let y = 0; y < rows; y++) {
                const yOff = y * cols;
                const yUp = rowUp[y];
                const yDn = rowDown[y];

                for (let x = 0; x < cols; x++) {
                    const idx = yOff + x;
                    const a = A[idx];
                    const b = B[idx];

                    // Inline laplacian using pre-computed offsets (avoids function call overhead)
                    const xL = colLeft[x];
                    const xR = colRight[x];
                    const lapA = A[yUp + x] * 0.2 + A[yDn + x] * 0.2 +
                                 A[yOff + xL] * 0.2 + A[yOff + xR] * 0.2 +
                                 A[yUp + xL] * 0.05 + A[yUp + xR] * 0.05 +
                                 A[yDn + xL] * 0.05 + A[yDn + xR] * 0.05 - a;
                    const lapB = B[yUp + x] * 0.2 + B[yDn + x] * 0.2 +
                                 B[yOff + xL] * 0.2 + B[yOff + xR] * 0.2 +
                                 B[yUp + xL] * 0.05 + B[yUp + xR] * 0.05 +
                                 B[yDn + xL] * 0.05 + B[yDn + xR] * 0.05 - b;

                    // Mouse proximity modulates feed rate (creates local pattern changes)
                    const ddx = x - mx;
                    const ddy = y - my;
                    const dist2 = ddx * ddx + ddy * ddy;
                    const feed = dist2 < 900 ? baseFeed + (1 - dist2 / 900) * 0.01 : baseFeed;

                    const abb = a * b * b;
                    let na = a + (dA * lapA - abb + feed * (1 - a));
                    let nb = b + (dB * lapB + abb - (baseKill + feed) * b);

                    // Clamp
                    if (na < 0) na = 0; else if (na > 1) na = 1;
                    if (nb < 0) nb = 0; else if (nb > 1) nb = 1;
                    nA[idx] = na;
                    nB[idx] = nb;
                }
            }

            // Swap buffers - update local refs so next step reads correct data
            const tmpA = A;
            const tmpB = B;
            A = nA;
            B = nB;
            nA = tmpA;
            nB = tmpB;
        }

        // Persist final state back
        this._gridA = A;
        this._gridB = B;
        this._nextA = nA;
        this._nextB = nB;
    }

    draw(ctx, system) {
        if (!this._gridA || !this._imageData) return;

        // Handle click events
        if (system._clickRegistered !== undefined && system._clickRegistered) {
            this._clickSeeds.push({ x: system._lastClickX || 0, y: system._lastClickY || 0 });
        }

        const cols = this._cols;
        const rows = this._rows;
        const B = this._gridB;
        const A = this._gridA;
        const data = this._imageData.data;
        const hue = this.hue;

        // Convert chemical concentrations to pixels
        for (let i = 0, len = cols * rows; i < len; i++) {
            const pi = i * 4;
            const b = B[i];
            const a = A[i];

            // Color based on B concentration with hue variation
            const contrast = (1 - a) * 0.5 + b * 0.5;

            // HSL to RGB approximation for speed
            const h = (hue + b * 60) % 360;
            const s = 0.7 + contrast * 0.3;
            const l = contrast * 0.6;

            // Fast HSL->RGB
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const hp = h / 60;
            const x2 = c * (1 - Math.abs(hp % 2 - 1));
            let r1 = 0, g1 = 0, b1 = 0;
            if (hp < 1) { r1 = c; g1 = x2; }
            else if (hp < 2) { r1 = x2; g1 = c; }
            else if (hp < 3) { g1 = c; b1 = x2; }
            else if (hp < 4) { g1 = x2; b1 = c; }
            else if (hp < 5) { r1 = x2; b1 = c; }
            else { r1 = c; b1 = x2; }
            const m = l - c / 2;

            data[pi]     = ((r1 + m) * 255) | 0;
            data[pi + 1] = ((g1 + m) * 255) | 0;
            data[pi + 2] = ((b1 + m) * 255) | 0;
            data[pi + 3] = (b > 0.01 ? 180 + b * 75 : 0) | 0;
        }

        this._imgCtx.putImageData(this._imageData, 0, 0);

        // Draw scaled up to main canvas
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(this._imgCanvas, 0, 0, system.width, system.height);
        ctx.restore();
    }
}
