/**
 * @file truchet_architecture.js
 * @description Background architecture combining Truchet tiling and Moiré
 * interference patterns. Three modes: classic Truchet tiles with animated
 * transitions, layered Moiré fields with mouse-shifted centers, and conformal
 * map warping with local mouse distortion.
 */

import { Architecture } from './background_architectures.js';
import { truchetTiling, moirePattern, conformalMap, seededPalette } from './math_patterns.js';
import { mouse } from './state.js';

const TAU = Math.PI * 2;
const CELL = 40;

export class TruchetArchitecture extends Architecture {
    constructor() {
        super();
        this.mode = 0;
        this.palette = [];
        // Mode 0
        this.tiles = [];
        this.cols = 0;
        this.rows = 0;
        // Mode 1
        this.moire1 = null;
        this.moire2 = null;
        this.mouseOffX = 0;
        this.mouseOffY = 0;
        // Mode 2
        this.conformal = null;
        this.gridPts = [];
        this.gridCols = 0;
        this.gridRows = 0;
    }

    init(system) {
        const rng = system.rng;
        this.mode = Math.floor(rng() * 3);
        this.palette = seededPalette(rng);

        if (this.mode === 0) {
            this.cols = Math.ceil(system.width / CELL) + 1;
            this.rows = Math.ceil(system.height / CELL) + 1;
            this.tiles = truchetTiling(this.cols, this.rows, rng);
            // Add transition state to each tile
            for (const t of this.tiles) {
                t.targetRotation = t.rotation;
                t.displayRotation = t.rotation;
                t.transitioning = false;
                t.transitionSpeed = 0.08 + rng() * 0.06;
            }
        } else if (this.mode === 1) {
            this.moire1 = moirePattern(rng);
            this.moire2 = moirePattern(rng);
            this.mouseOffX = 0;
            this.mouseOffY = 0;
        } else {
            this.conformal = conformalMap(rng);
            // Pre-compute grid of mapped coordinates
            const spacing = 28;
            this.gridCols = Math.ceil(system.width / spacing) + 1;
            this.gridRows = Math.ceil(system.height / spacing) + 1;
            this.gridPts = [];
            for (let r = 0; r < this.gridRows; r++) {
                for (let c = 0; c < this.gridCols; c++) {
                    // Normalize to roughly [-2, 2] for interesting conformal behaviour
                    const nx = (c / this.gridCols) * 4 - 2;
                    const ny = (r / this.gridRows) * 4 - 2;
                    const mapped = this.conformal(nx, ny);
                    this.gridPts.push({
                        ox: c * spacing, oy: r * spacing,
                        nx, ny,
                        mx: mapped.x, my: mapped.y
                    });
                }
            }
        }
    }

    update(system) {
        if (this.mode === 0) {
            // Randomly flip 1-2 tiles per frame
            const flips = 1 + Math.floor(system.rng() * 2);
            for (let i = 0; i < flips; i++) {
                const idx = Math.floor(system.rng() * this.tiles.length);
                const t = this.tiles[idx];
                if (!t.transitioning) {
                    t.targetRotation = (t.targetRotation + 1) % 4;
                    t.transitioning = true;
                }
            }

            // Mouse proximity flips nearby tiles
            const mx = mouse.x, my = mouse.y;
            for (const t of this.tiles) {
                const tx = t.col * CELL + CELL / 2;
                const ty = t.row * CELL + CELL / 2;
                const dx = tx - mx, dy = ty - my;
                if (dx * dx + dy * dy < 6400 && !t.transitioning) { // 80px radius
                    t.targetRotation = (t.targetRotation + 1) % 4;
                    t.transitioning = true;
                }
                // Animate toward target rotation (in steps of 0.25 turn = 90°)
                if (t.transitioning) {
                    const diff = t.targetRotation - t.displayRotation;
                    const step = diff > 0 ? t.transitionSpeed : (diff < 0 ? -t.transitionSpeed : 0);
                    if (Math.abs(diff) < t.transitionSpeed + 0.01) {
                        t.displayRotation = t.targetRotation;
                        t.transitioning = false;
                    } else {
                        t.displayRotation += step;
                    }
                }
            }
        } else if (this.mode === 1) {
            // Smoothly shift pattern center toward mouse
            const cx = mouse.x - system.width / 2;
            const cy = mouse.y - system.height / 2;
            this.mouseOffX += (cx * 0.004 - this.mouseOffX) * 0.06;
            this.mouseOffY += (cy * 0.004 - this.mouseOffY) * 0.06;
        }
        // Mode 2: no per-frame state needed; animation is driven by tick in draw
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        if (this.mode === 0) {
            this._drawTruchet(ctx);
        } else if (this.mode === 1) {
            this._drawMoire(ctx, system.width, system.height, tick);
        } else {
            this._drawConformal(ctx, system.width, system.height, tick);
        }
    }

    // ── Mode 0: Truchet tiles ────────────────────────────────────────────────

    _drawTruchet(ctx) {
        const p = this.palette;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        for (const t of this.tiles) {
            const x = t.col * CELL;
            const y = t.row * CELL;
            const cx = x + CELL / 2;
            const cy = y + CELL / 2;
            const color = p[t.variant % p.length];

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(t.displayRotation * Math.PI / 2);
            ctx.strokeStyle = color;
            ctx.beginPath();

            if (t.variant === 0) {
                // Classic Truchet: two quarter-circle arcs
                ctx.arc(-CELL / 2, -CELL / 2, CELL / 2, 0, Math.PI / 2);
                ctx.moveTo(CELL / 2, CELL / 2);
                ctx.arc(CELL / 2, CELL / 2, CELL / 2, Math.PI, Math.PI * 1.5);
            } else if (t.variant === 1) {
                // Diagonal line
                ctx.moveTo(-CELL / 2, -CELL / 2);
                ctx.lineTo(CELL / 2, CELL / 2);
            } else {
                // Triangle fill (stroked)
                ctx.moveTo(-CELL / 2, -CELL / 2);
                ctx.lineTo(CELL / 2, -CELL / 2);
                ctx.lineTo(-CELL / 2, CELL / 2);
                ctx.closePath();
            }

            ctx.stroke();
            ctx.restore();
        }
    }

    // ── Mode 1: Moiré interference field ────────────────────────────────────

    _drawMoire(ctx, width, height, tick) {
        const p = this.palette;
        const t = tick * 0.02;
        const offX = this.mouseOffX;
        const offY = this.mouseOffY;

        // Parse palette HSL colors into a simple brightness-mapped band
        // Render as vertical strips of 2px for performance
        for (let px = 0; px < width; px += 2) {
            // Sample a few vertical points to get an average value for this column
            // and draw a gradient strip. Using canvas fillRect per row is too slow,
            // so we draw full-height rect per column with a linear gradient.
            const normX = (px / width) * 2 - 1 + offX;

            // Build gradient stops from vertical samples
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            const steps = 12;
            for (let s = 0; s <= steps; s++) {
                const normY = (s / steps) * 2 - 1 + offY;
                const v1 = this.moire1(normX * 60, normY * 60, t);
                const v2 = this.moire2(normX * 60 + 10, normY * 60 + 10, t + 0.5);
                const combined = (v1 * v2 + 1) * 0.5; // 0..1
                const palIdx = Math.floor(combined * (p.length - 1));
                const alpha = 0.6 + combined * 0.4;
                grad.addColorStop(s / steps, this._withAlpha(p[palIdx], alpha));
            }

            ctx.fillStyle = grad;
            ctx.fillRect(px, 0, 2, height);
        }
    }

    // ── Mode 2: Conformal map dot grid ──────────────────────────────────────

    _drawConformal(ctx, width, height, tick) {
        const p = this.palette;
        const t = tick * 0.008;
        const mx = mouse.x, my = mouse.y;
        const mouseDistortRadius = 120;
        const cols = this.gridCols;
        const pts = this.gridPts;
        const n = pts.length;

        // First pass: compute screen positions for all grid points
        const sx = new Float32Array(n);
        const sy = new Float32Array(n);
        const disp = new Float32Array(n);

        for (let i = 0; i < n; i++) {
            const pt = pts[i];
            const animNx = pt.nx + Math.sin(t + pt.ny * 0.5) * 0.15;
            const animNy = pt.ny + Math.cos(t + pt.nx * 0.5) * 0.15;
            const mapped = this.conformal(animNx, animNy);

            let x = pt.ox + mapped.x * 18;
            let y = pt.oy + mapped.y * 18;

            // Local mouse distortion
            const ddx = x - mx, ddy = y - my;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < mouseDistortRadius && d > 0.5) {
                const push = (mouseDistortRadius - d) / mouseDistortRadius;
                x += (ddx / d) * push * 30;
                y += (ddy / d) * push * 30;
            }

            sx[i] = x;
            sy[i] = y;
            const ex = x - pt.ox, ey = y - pt.oy;
            disp[i] = Math.sqrt(ex * ex + ey * ey);
        }

        // Second pass: draw connecting lines between grid neighbors
        ctx.save();
        ctx.lineWidth = 0.5;
        for (let i = 0; i < n; i++) {
            if (disp[i] > 80) continue;
            const col = i % cols;
            // Right neighbor
            if (col < cols - 1) {
                const j = i + 1;
                if (disp[j] < 80) {
                    const colorT = Math.min(1, disp[i] / 60);
                    const palIdx = Math.min(p.length - 1, Math.floor(colorT * p.length));
                    ctx.strokeStyle = this._withAlpha(p[palIdx], 0.2);
                    ctx.beginPath();
                    ctx.moveTo(sx[i], sy[i]);
                    ctx.lineTo(sx[j], sy[j]);
                    ctx.stroke();
                }
            }
            // Down neighbor
            const j = i + cols;
            if (j < n && disp[j] < 80) {
                const colorT = Math.min(1, disp[i] / 60);
                const palIdx = Math.min(p.length - 1, Math.floor(colorT * p.length));
                ctx.strokeStyle = this._withAlpha(p[palIdx], 0.2);
                ctx.beginPath();
                ctx.moveTo(sx[i], sy[i]);
                ctx.lineTo(sx[j], sy[j]);
                ctx.stroke();
            }
        }

        // Third pass: draw dots on top
        for (let i = 0; i < n; i++) {
            const colorT = Math.min(1, disp[i] / 60);
            const palIdx = Math.min(p.length - 1, Math.floor(colorT * p.length));
            const radius = 1.5 + colorT * 2;
            ctx.fillStyle = this._withAlpha(p[palIdx], 0.7 + colorT * 0.3);
            ctx.beginPath();
            ctx.arc(sx[i], sy[i], radius, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Returns an hsla(...) string with adjusted alpha.
     * Palette colors are hsl(...) strings; we inject an alpha channel.
     */
    _withAlpha(hslStr, alpha) {
        // hsl(h, s%, l%) → hsla(h, s%, l%, alpha)
        return hslStr.replace('hsl(', 'hsla(').replace(')', `, ${alpha.toFixed(2)})`);
    }
}
