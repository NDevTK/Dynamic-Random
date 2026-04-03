/**
 * @file dimensional_fabric_effects.js
 * @description The screen is a sheet of dimensional fabric that responds to the mouse.
 * Seed determines fabric type, weave pattern, elasticity, and tear behavior.
 * Mouse pushes/pulls the fabric, clicks create tears that stitch back together.
 * Each seed produces dramatically different textures: silk ripples, chain mail,
 * rubber membrane, patchwork quilt, or crystalline lattice.
 *
 * Modes (seed-selected):
 * 0 - Silk Veil: ultra-smooth flowing waves, iridescent sheen
 * 1 - Chain Mail: rigid interconnected rings that clank and shift
 * 2 - Rubber Membrane: bouncy elastic surface with snap-back physics
 * 3 - Patchwork: colorful irregular patches that shuffle when disturbed
 * 4 - Crystalline Web: brittle fracture patterns that heal with prismatic light
 */

const TAU = Math.PI * 2;

export class DimensionalFabric {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 240;
        this.saturation = 70;
        this._rng = Math.random;

        this.cols = 0;
        this.rows = 0;
        this.spacing = 20;
        this.points = null; // Float32Array for positions
        this.restX = null;
        this.restY = null;
        this.velX = null;
        this.velY = null;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        this._stiffness = 0.03;
        this._damping = 0.95;
        this._mouseRadius = 120;
        this._mouseForce = 5;
        this._waveSpeed = 0.02;

        // Tears
        this._tears = [];
        this._maxTears = 8;

        // Patch colors (mode 3)
        this._patchColors = null;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 5);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this._tears = [];

        // Mode-specific physics
        switch (this.mode) {
            case 0: // Silk
                this.spacing = 15 + Math.floor(rng() * 8);
                this._stiffness = 0.01 + rng() * 0.02;
                this._damping = 0.97;
                this._mouseRadius = 150;
                this._mouseForce = 3 + rng() * 3;
                break;
            case 1: // Chain mail
                this.spacing = 20 + Math.floor(rng() * 10);
                this._stiffness = 0.08 + rng() * 0.05;
                this._damping = 0.85;
                this._mouseRadius = 100;
                this._mouseForce = 8 + rng() * 5;
                break;
            case 2: // Rubber
                this.spacing = 18 + Math.floor(rng() * 6);
                this._stiffness = 0.04 + rng() * 0.04;
                this._damping = 0.92;
                this._mouseRadius = 130;
                this._mouseForce = 6 + rng() * 4;
                break;
            case 3: // Patchwork
                this.spacing = 30 + Math.floor(rng() * 15);
                this._stiffness = 0.02 + rng() * 0.02;
                this._damping = 0.94;
                this._mouseRadius = 120;
                this._mouseForce = 4 + rng() * 3;
                break;
            case 4: // Crystalline
                this.spacing = 25 + Math.floor(rng() * 10);
                this._stiffness = 0.12 + rng() * 0.06;
                this._damping = 0.88;
                this._mouseRadius = 100;
                this._mouseForce = 10 + rng() * 5;
                break;
        }

        this._waveSpeed = 0.01 + rng() * 0.03;

        const W = window.innerWidth, H = window.innerHeight;
        this.cols = Math.ceil(W / this.spacing) + 1;
        this.rows = Math.ceil(H / this.spacing) + 1;
        const n = this.cols * this.rows;

        this.points = new Float32Array(n * 2);
        this.restX = new Float32Array(n);
        this.restY = new Float32Array(n);
        this.velX = new Float32Array(n);
        this.velY = new Float32Array(n);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const i = r * this.cols + c;
                const x = c * this.spacing;
                const y = r * this.spacing;
                this.points[i * 2] = x;
                this.points[i * 2 + 1] = y;
                this.restX[i] = x;
                this.restY[i] = y;
            }
        }

        // Patchwork colors
        if (this.mode === 3) {
            this._patchColors = new Uint16Array(n);
            for (let i = 0; i < n; i++) {
                this._patchColors[i] = (this.hue + Math.floor(rng() * 120) - 60 + 360) % 360;
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        if (isClicking && !this._wasClicking && this._tears.length < this._maxTears) {
            this._tears.push({ x: mx, y: my, radius: 0, maxRadius: 60 + Math.random() * 40, life: 120 });
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        if (!this.points) return;

        const n = this.cols * this.rows;
        const cols = this.cols;
        const stiffness = this._stiffness;
        const damping = this._damping;
        const mRadiusSq = this._mouseRadius * this._mouseRadius;
        const mForce = this._mouseForce * (1 + this._mouseSpeed * 0.02);

        // Mouse interaction
        for (let i = 0; i < n; i++) {
            const px = this.points[i * 2];
            const py = this.points[i * 2 + 1];
            const pdx = px - mx;
            const pdy = py - my;
            const distSq = pdx * pdx + pdy * pdy;

            if (distSq < mRadiusSq && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / this._mouseRadius) * mForce;
                this.velX[i] += (pdx / dist) * force;
                this.velY[i] += (pdy / dist) * force;
            }
        }

        // Tear influence
        for (let t = this._tears.length - 1; t >= 0; t--) {
            const tear = this._tears[t];
            tear.radius = Math.min(tear.maxRadius, tear.radius + 2);
            tear.life--;

            if (tear.life > 60) {
                // Expanding phase: push points away
                for (let i = 0; i < n; i++) {
                    const px = this.points[i * 2], py = this.points[i * 2 + 1];
                    const tdx = px - tear.x, tdy = py - tear.y;
                    const td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
                    if (td < tear.radius) {
                        const f = (1 - td / tear.radius) * 2;
                        this.velX[i] += (tdx / td) * f;
                        this.velY[i] += (tdy / td) * f;
                    }
                }
            }

            if (tear.life <= 0) {
                this._tears[t] = this._tears[this._tears.length - 1];
                this._tears.pop();
            }
        }

        // Spring physics: each point springs back to rest position
        // Also constrained by neighbors
        for (let i = 0; i < n; i++) {
            const rx = this.restX[i];
            const ry = this.restY[i];
            const px = this.points[i * 2];
            const py = this.points[i * 2 + 1];

            // Spring to rest
            this.velX[i] += (rx - px) * stiffness;
            this.velY[i] += (ry - py) * stiffness;

            // Neighbor coupling (propagate waves)
            const row = Math.floor(i / cols);
            const col = i % cols;
            let neighborForceX = 0, neighborForceY = 0;
            let nc = 0;

            if (col > 0) { const j = i - 1; neighborForceX += this.points[j * 2] - px; neighborForceY += this.points[j * 2 + 1] - py; nc++; }
            if (col < cols - 1) { const j = i + 1; neighborForceX += this.points[j * 2] - px; neighborForceY += this.points[j * 2 + 1] - py; nc++; }
            if (row > 0) { const j = i - cols; neighborForceX += this.points[j * 2] - px; neighborForceY += this.points[j * 2 + 1] - py; nc++; }
            if (row < this.rows - 1) { const j = i + cols; neighborForceX += this.points[j * 2] - px; neighborForceY += this.points[j * 2 + 1] - py; nc++; }

            if (nc > 0) {
                this.velX[i] += (neighborForceX / nc) * this._waveSpeed;
                this.velY[i] += (neighborForceY / nc) * this._waveSpeed;
            }

            // Apply velocity
            this.velX[i] *= damping;
            this.velY[i] *= damping;
            this.points[i * 2] += this.velX[i];
            this.points[i * 2 + 1] += this.velY[i];
        }
    }

    draw(ctx, system) {
        if (!this.points) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const cols = this.cols;
        const rows = this.rows;

        switch (this.mode) {
            case 0: this._drawSilk(ctx); break;
            case 1: this._drawChainMail(ctx); break;
            case 2: this._drawRubber(ctx); break;
            case 3: this._drawPatchwork(ctx); break;
            case 4: this._drawCrystalline(ctx); break;
        }

        // Draw tear effects
        for (const tear of this._tears) {
            const alpha = tear.life > 60
                ? (1 - (tear.life - 60) / 60) * 0.3
                : (tear.life / 60) * 0.3;
            ctx.strokeStyle = `hsla(${(this.hue + 180) % 360}, 80%, 70%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(tear.x, tear.y, tear.radius, 0, TAU);
            ctx.stroke();

            // Healing particles
            if (tear.life < 60 && tear.life > 10) {
                const healAlpha = (1 - tear.life / 60) * 0.2;
                ctx.fillStyle = `hsla(${this.hue}, 70%, 80%, ${healAlpha})`;
                for (let a = 0; a < TAU; a += TAU / 8) {
                    const r = tear.radius * (tear.life / 60);
                    ctx.beginPath();
                    ctx.arc(
                        tear.x + Math.cos(a + this.tick * 0.05) * r,
                        tear.y + Math.sin(a + this.tick * 0.05) * r,
                        2, 0, TAU
                    );
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    _drawSilk(ctx) {
        const cols = this.cols, rows = this.rows;

        // Flowing mesh lines with iridescent color shifts
        ctx.lineWidth = 0.5;
        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            const displacement = this._getRowDisplacement(r);
            const hueShift = displacement * 30;
            ctx.strokeStyle = `hsla(${(this.hue + hueShift + 360) % 360}, ${this.saturation}%, 55%, ${0.12 + displacement * 0.08})`;

            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const x = this.points[i * 2];
                const y = this.points[i * 2 + 1];
                if (c === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Vertical lines
        for (let c = 0; c < cols; c += 2) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${(this.hue + 40) % 360}, ${this.saturation}%, 50%, 0.06)`;
            for (let r = 0; r < rows; r++) {
                const i = r * cols + c;
                const x = this.points[i * 2];
                const y = this.points[i * 2 + 1];
                if (r === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    _drawChainMail(ctx) {
        const cols = this.cols, rows = this.rows;
        ctx.lineWidth = 1;

        // Draw interlocking rings at each grid point
        for (let r = 0; r < rows; r += 2) {
            for (let c = 0; c < cols; c += 2) {
                const i = r * cols + c;
                const x = this.points[i * 2];
                const y = this.points[i * 2 + 1];
                const displacement = Math.abs(x - this.restX[i]) + Math.abs(y - this.restY[i]);
                const alpha = 0.08 + Math.min(0.15, displacement * 0.02);

                ctx.strokeStyle = `hsla(${this.hue}, 20%, 65%, ${alpha})`;
                ctx.beginPath();
                ctx.ellipse(x, y, this.spacing * 0.6, this.spacing * 0.4,
                    Math.atan2(this.velY[i], this.velX[i]), 0, TAU);
                ctx.stroke();
            }
        }
    }

    _drawRubber(ctx) {
        const cols = this.cols, rows = this.rows;

        // Draw filled quads with displacement-based coloring
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const i00 = r * cols + c;
                const i10 = r * cols + c + 1;
                const i01 = (r + 1) * cols + c;

                const x0 = this.points[i00 * 2], y0 = this.points[i00 * 2 + 1];
                const x1 = this.points[i10 * 2], y1 = this.points[i10 * 2 + 1];
                const x2 = this.points[i01 * 2], y2 = this.points[i01 * 2 + 1];

                const stretch = Math.sqrt(
                    (x1 - x0 - this.spacing) ** 2 + (y1 - y0) ** 2 +
                    (x2 - x0) ** 2 + (y2 - y0 - this.spacing) ** 2
                );

                const alpha = 0.03 + Math.min(0.12, stretch * 0.01);
                const lightness = 40 + Math.min(30, stretch * 3);
                ctx.fillStyle = `hsla(${(this.hue + stretch * 5) % 360}, ${this.saturation}%, ${lightness}%, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.fill();
            }
        }

        // Highlight lines
        ctx.lineWidth = 0.3;
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, 0.06)`;
        for (let r = 0; r < rows; r += 3) {
            ctx.beginPath();
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                if (c === 0) ctx.moveTo(this.points[i * 2], this.points[i * 2 + 1]);
                else ctx.lineTo(this.points[i * 2], this.points[i * 2 + 1]);
            }
            ctx.stroke();
        }
    }

    _drawPatchwork(ctx) {
        const cols = this.cols, rows = this.rows;

        // Draw colored patches
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const i00 = r * cols + c;
                const i10 = r * cols + c + 1;
                const i01 = (r + 1) * cols + c;
                const i11 = (r + 1) * cols + c + 1;

                const x0 = this.points[i00 * 2], y0 = this.points[i00 * 2 + 1];
                const x1 = this.points[i10 * 2], y1 = this.points[i10 * 2 + 1];
                const x2 = this.points[i11 * 2], y2 = this.points[i11 * 2 + 1];
                const x3 = this.points[i01 * 2], y3 = this.points[i01 * 2 + 1];

                const patchHue = this._patchColors ? this._patchColors[i00] : this.hue;
                ctx.fillStyle = `hsla(${patchHue}, ${this.saturation}%, 50%, 0.06)`;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x3, y3);
                ctx.closePath();
                ctx.fill();

                // Stitch lines
                ctx.strokeStyle = `hsla(${(patchHue + 30) % 360}, 40%, 70%, 0.08)`;
                ctx.lineWidth = 0.5;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    _drawCrystalline(ctx) {
        const cols = this.cols, rows = this.rows;

        // Draw crystalline fracture lines
        ctx.lineWidth = 0.8;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const x = this.points[i * 2], y = this.points[i * 2 + 1];
                const displacement = Math.sqrt(
                    (x - this.restX[i]) ** 2 + (y - this.restY[i]) ** 2
                );

                // Brighter when displaced (fracturing)
                const alpha = 0.03 + Math.min(0.2, displacement * 0.03);
                const hueShift = displacement * 10;

                // Connect to right and bottom neighbors
                if (c < cols - 1) {
                    const j = i + 1;
                    ctx.strokeStyle = `hsla(${(this.hue + hueShift) % 360}, ${this.saturation}%, 65%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(this.points[j * 2], this.points[j * 2 + 1]);
                    ctx.stroke();
                }
                if (r < rows - 1) {
                    const j = i + cols;
                    ctx.strokeStyle = `hsla(${(this.hue + hueShift + 60) % 360}, ${this.saturation}%, 60%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(this.points[j * 2], this.points[j * 2 + 1]);
                    ctx.stroke();
                }

                // Node glow at fracture points
                if (displacement > 3) {
                    ctx.fillStyle = `hsla(${(this.hue + hueShift * 2) % 360}, 80%, 80%, ${alpha * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, TAU);
                    ctx.fill();
                }
            }
        }
    }

    _getRowDisplacement(row) {
        let total = 0;
        for (let c = 0; c < this.cols; c++) {
            const i = row * this.cols + c;
            const dx = this.points[i * 2] - this.restX[i];
            const dy = this.points[i * 2 + 1] - this.restY[i];
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total / this.cols;
    }
}
