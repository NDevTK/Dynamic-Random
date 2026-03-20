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
            // Pre-compute a grid of mapped coordinates for the visible area
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
            // Pick 1-2 tiles per frame to transition
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
                // Animate toward target rotation
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
            // Mouse position shifts the pattern center
            const cx = mouse.x - system.width / 2;
            const cy = mouse.y - system.height / 2;
            this.mouseOffX += (cx * 0.004 - this.mouseOffX) * 0.06;
            this.mouseOffY += (cy * 0.004 - this.mouseOffY) * 0.06;
        }
        // Mode 2: animation is driven entirely by tick in draw
    }

    draw(system) {
        const ctx = system.ctx;
        if (this.mode === 0) {
            this._drawTruchet(ctx);
        } else if (this.mode === 1) {
            this._drawMoire(ctx, system.width, system.height, system.tick);
        } else {
            this._drawConformal(ctx, system.width, system.height, system.tick);
        }
    }

    // ── Mode 0: Truchet tiles ────────────────────────────────────────────────

    _drawTruchet(ctx) {
        const p = this.palette;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        for (const t of this.tiles) {
            const cx = t.col * CELL + CELL / 2;
            const cy = t.row * CELL + CELL / 2;
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
                // Triangle fill + stroke
                ctx.moveTo(-CELL / 2, -CELL / 2);
                ctx.lineTo(CELL / 2, -CELL / 2);
                ctx.lineTo(-CELL / 2, CELL / 2);
                ctx.closePath();
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = color;
                ctx.fill();
                ctx.globalAlpha = 1;
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

        // Render as vertical strips of 2px: for each pixel column, compute the
        // moiré value and draw a full-height gradient strip with palette colors.
        for (let px = 0; px < width; px += 2) {
            const normX = (px / width) * 2 - 1 + offX;
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            const steps = 10;
            for (let s = 0; s <= steps; s++) {
                const normY = (s / steps) * 2 - 1 + offY;
                const v1 = this.moire1(normX * 60, normY * 60, t);
                const v2 = this.moire2(normX * 60 + 10, normY * 60 + 10, t + 0.5);
                // Both moire functions return 0..1; combine as interference product
                const combined = (v1 * v2 + 1) * 0.5;
                const palIdx = Math.min(p.length - 1, Math.floor(combined * p.length));
                grad.addColorStop(s / steps, this._withAlpha(p[palIdx], 0.6 + combined * 0.4));
            }
            ctx.fillStyle = grad;
            ctx.fillRect(px, 0, 2, height);
        }
    }

    // ── Mode 2: Conformal map dot/line grid ──────────────────────────────────

    _drawConformal(ctx, width, height, tick) {
        const p = this.palette;
        const t = tick * 0.008;
        const mx = mouse.x, my = mouse.y;
        const distortRadius = 120;
        const cols = this.gridCols;
        const pts = this.gridPts;
        const n = pts.length;

        // First pass: compute warped screen positions for all grid points.
        // Slowly animate by shifting conformal input coordinates with time.
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

            // Mouse creates a local distortion bubble
            const ddx = x - mx, ddy = y - my;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < distortRadius && d > 0.5) {
                const push = (distortRadius - d) / distortRadius;
                x += (ddx / d) * push * 30;
                y += (ddy / d) * push * 30;
            }

            sx[i] = x;
            sy[i] = y;
            // Displacement from original grid position → used for color-by-distance
            const ex = x - pt.ox, ey = y - pt.oy;
            disp[i] = Math.sqrt(ex * ex + ey * ey);
        }

        ctx.save();
        ctx.lineWidth = 0.5;

        // Second pass: draw lines between neighboring grid points (original grid
        // is regular, mapped positions create mesmerizing distortions)
        for (let i = 0; i < n; i++) {
            if (disp[i] > 80) continue;
            const col = i % cols;
            const palIdx = Math.min(p.length - 1, Math.floor(Math.min(1, disp[i] / 60) * p.length));
            ctx.strokeStyle = this._withAlpha(p[palIdx], 0.2);

            // Right neighbor
            if (col < cols - 1 && disp[i + 1] < 80) {
                ctx.beginPath();
                ctx.moveTo(sx[i], sy[i]);
                ctx.lineTo(sx[i + 1], sy[i + 1]);
                ctx.stroke();
            }
            // Down neighbor
            const j = i + cols;
            if (j < n && disp[j] < 80) {
                ctx.beginPath();
                ctx.moveTo(sx[i], sy[i]);
                ctx.lineTo(sx[j], sy[j]);
                ctx.stroke();
            }
        }

        // Third pass: draw dots at mapped grid vertices colored by displacement
        for (let i = 0; i < n; i++) {
            const colorT = Math.min(1, disp[i] / 60);
            const palIdx = Math.min(p.length - 1, Math.floor(colorT * p.length));
            ctx.fillStyle = this._withAlpha(p[palIdx], 0.7 + colorT * 0.3);
            ctx.beginPath();
            ctx.arc(sx[i], sy[i], 1.5 + colorT * 1.5, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Converts an hsl(...) palette string to hsla(...) with the given alpha.
     */
    _withAlpha(hslStr, alpha) {
        return hslStr.replace('hsl(', 'hsla(').replace(')', `, ${alpha.toFixed(2)})`);
    }
}
