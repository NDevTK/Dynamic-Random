/** Background architecture that uses webcam input as a living texture. */

import { Architecture } from './background_architectures.js';
import { cameraInput } from './camera_input.js';

const GRID_COLS = 16;
const GRID_ROWS = 12;
const MAX_PARTICLES = 500;

export class CameraTextureArchitecture extends Architecture {
    constructor() {
        super();
        this.mode = 0;
        this.tiles = [];
        this.particles = [];
        this.particlePool = [];
        this.colorField = [];
        this.tick = 0;
        this.pulsePhase = 0;
    }

    init(system) {
        this.mode = Math.floor(system.rng() * 4);
        this.tick = 0;
        this.pulsePhase = system.rng() * Math.PI * 2;

        // Pre-allocate particle pool
        this.particlePool = [];
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.particlePool.push({
                active: false,
                x: 0, y: 0, vx: 0, vy: 0,
                r: 128, g: 128, b: 128,
                alpha: 1, size: 3, life: 0, maxLife: 60,
                prevX: 0, prevY: 0,
            });
        }
        this.particles = this.particlePool; // alias

        // Mode 0: Pixel Mosaic tiles
        this.tiles = [];
        const tileW = system.width / GRID_COLS;
        const tileH = system.height / GRID_ROWS;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                this.tiles.push({
                    x: col * tileW + tileW * 0.5,
                    y: row * tileH + tileH * 0.5,
                    targetX: col * tileW + tileW * 0.5,
                    targetY: row * tileH + tileH * 0.5,
                    r: 30, g: 30, b: 50,
                    targetR: 30, targetG: 30, targetB: 50,
                    rotation: system.rng() * Math.PI * 2,
                    targetRotation: 0,
                    w: tileW, h: tileH,
                    offsetPhase: system.rng() * Math.PI * 2,
                });
            }
        }

        // Mode 2: Color bleed field (flat array of {r,g,b,a} per grid cell)
        this.colorField = [];
        for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
            this.colorField.push({ r: 0, g: 0, b: 0, a: 0 });
        }
    }

    _acquireParticle() {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            if (!this.particlePool[i].active) return this.particlePool[i];
        }
        return null;
    }

    _activeCount() {
        let n = 0;
        for (let i = 0; i < MAX_PARTICLES; i++) if (this.particlePool[i].active) n++;
        return n;
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    update(system) {
        this.tick++;
        cameraInput.update();

        if (!cameraInput.active) return;

        const grid = cameraInput.colorGrid;
        const cellW = system.width / GRID_COLS;
        const cellH = system.height / GRID_ROWS;

        if (this.mode === 0) {
            this._updateMosaic(system, grid, cellW, cellH);
        } else if (this.mode === 1) {
            this._updateSilhouette(system, grid, cellW, cellH);
        } else if (this.mode === 2) {
            this._updateColorBleed(system, grid);
        } else {
            this._updateMotionTrails(system, grid, cellW, cellH);
        }

        // Advance/expire all active particles
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const p = this.particlePool[i];
            if (!p.active) continue;
            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life--;
            p.alpha = Math.max(0, p.life / p.maxLife);
            if (p.life <= 0) p.active = false;
        }
    }

    _updateMosaic(system, grid, cellW, cellH) {
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            const cell = grid[i] || { r: 30, g: 30, b: 50 };
            const row = Math.floor(i / GRID_COLS);
            const col = i % GRID_COLS;
            const t = this.tick * 0.008 + tile.offsetPhase;

            // Target: grid position with gentle drift
            tile.targetX = col * cellW + cellW * 0.5 + Math.sin(t) * cellW * 0.15;
            tile.targetY = row * cellH + cellH * 0.5 + Math.cos(t * 0.7) * cellH * 0.15;
            tile.targetRotation = Math.sin(t * 0.5) * 0.35;
            tile.targetR = cell.r;
            tile.targetG = cell.g;
            tile.targetB = cell.b;

            // Smooth lerp toward targets
            const s = 0.07;
            tile.x      += (tile.targetX - tile.x) * s;
            tile.y      += (tile.targetY - tile.y) * s;
            tile.rotation += (tile.targetRotation - tile.rotation) * s;
            tile.r      += (tile.targetR - tile.r) * s;
            tile.g      += (tile.targetG - tile.g) * s;
            tile.b      += (tile.targetB - tile.b) * s;
        }
    }

    _updateSilhouette(system, grid, cellW, cellH) {
        const activeCount = this._activeCount();
        for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
            const cell = grid[i] || { r: 0, g: 0, b: 0, brightness: 0 };
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const cx = col * cellW + cellW * 0.5;
            const cy = row * cellH + cellH * 0.5;

            if (cell.brightness > 0.45 && activeCount < MAX_PARTICLES - 10) {
                const p = this._acquireParticle();
                if (p) {
                    p.active  = true;
                    p.x       = cx + (Math.random() - 0.5) * cellW;
                    p.y       = cy + (Math.random() - 0.5) * cellH;
                    p.prevX   = p.x;
                    p.prevY   = p.y;
                    p.vx      = (Math.random() - 0.5) * 1.2;
                    p.vy      = -Math.random() * 1.5 - 0.3;
                    p.r       = cell.r;
                    p.g       = cell.g;
                    p.b       = cell.b;
                    p.size    = 2 + Math.random() * 3;
                    p.maxLife = 50 + Math.floor(Math.random() * 60);
                    p.life    = p.maxLife;
                    p.alpha   = 1;
                }
            }
        }
    }

    _updateColorBleed(system, grid) {
        const field = this.colorField;
        for (let i = 0; i < grid.length; i++) {
            const cell = grid[i] || { r: 0, g: 0, b: 0 };
            field[i].r += (cell.r - field[i].r) * 0.12;
            field[i].g += (cell.g - field[i].g) * 0.12;
            field[i].b += (cell.b - field[i].b) * 0.12;
            field[i].a = Math.min(1, field[i].a + 0.04);
        }
        const next = field.map(c => ({ r: c.r, g: c.g, b: c.b, a: c.a }));
        const diffuse = 0.18;
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const idx = row * GRID_COLS + col;
                let rSum = 0, gSum = 0, bSum = 0, n = 0;
                for (const [dr, dc] of dirs) {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                        const ni = nr * GRID_COLS + nc;
                        rSum += field[ni].r; gSum += field[ni].g; bSum += field[ni].b; n++;
                    }
                }
                if (n > 0) {
                    next[idx].r = field[idx].r * (1 - diffuse) + (rSum / n) * diffuse;
                    next[idx].g = field[idx].g * (1 - diffuse) + (gSum / n) * diffuse;
                    next[idx].b = field[idx].b * (1 - diffuse) + (bSum / n) * diffuse;
                }
            }
        }
        this.colorField = next;
    }

    _updateMotionTrails(system, grid, cellW, cellH) {
        const motionLevel = cameraInput.motionLevel;
        if (motionLevel < 0.04) return;

        const activeCount = this._activeCount();
        const spawnBudget = Math.floor(motionLevel * 12);

        for (let i = 0; i < GRID_COLS * GRID_ROWS && activeCount < MAX_PARTICLES - 20; i++) {
            const cell = grid[i] || { r: 128, g: 128, b: 128, brightness: 0 };
            if (cell.brightness < 0.15) continue;
            if (Math.random() > spawnBudget / (GRID_COLS * GRID_ROWS)) continue;

            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const cx = col * cellW + cellW * 0.5;
            const cy = row * cellH + cellH * 0.5;

            // Velocity biased by dominant hue angle as a proxy for motion direction
            const hueRad = (cameraInput.dominantHue / 360) * Math.PI * 2;
            const speed = motionLevel * 4;
            const p = this._acquireParticle();
            if (!p) break;
            p.active  = true;
            p.x       = cx;
            p.y       = cy;
            p.prevX   = p.x;
            p.prevY   = p.y;
            p.vx      = Math.cos(hueRad) * speed + (Math.random() - 0.5) * 1.5;
            p.vy      = Math.sin(hueRad) * speed + (Math.random() - 0.5) * 1.5;
            p.r       = cell.r;
            p.g       = cell.g;
            p.b       = cell.b;
            p.size    = 1.5 + motionLevel * 3;
            p.maxLife = 30 + Math.floor(motionLevel * 40);
            p.life    = p.maxLife;
            p.alpha   = 1;
        }
    }

    // -------------------------------------------------------------------------
    // Draw
    // -------------------------------------------------------------------------

    draw(system) {
        const ctx = system.ctx;

        if (!cameraInput.active) {
            this._drawCameraOff(system);
            return;
        }

        if (this.mode === 0) {
            this._drawMosaic(ctx, system);
        } else if (this.mode === 1) {
            this._drawSilhouette(ctx);
        } else if (this.mode === 2) {
            this._drawColorBleed(ctx, system);
        } else {
            this._drawMotionTrails(ctx);
        }

        this._drawGridOverlay(ctx, system);
    }

    _drawCameraOff(system) {
        const ctx = system.ctx;
        const cellW = system.width / GRID_COLS;
        const cellH = system.height / GRID_ROWS;
        const pulse = Math.sin(this.tick * 0.04 + this.pulsePhase) * 0.5 + 0.5;
        ctx.beginPath();
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cx = col * cellW + cellW * 0.5;
                const cy = row * cellH + cellH * 0.5;
                const dist = Math.hypot(col - GRID_COLS * 0.5, row - GRID_ROWS * 0.5);
                const wavePulse = Math.sin(this.tick * 0.03 - dist * 0.5 + this.pulsePhase) * 0.5 + 0.5;
                const radius = 2 + wavePulse * 5;
                ctx.moveTo(cx + radius, cy);
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            }
        }
        ctx.fillStyle = `rgba(140,140,160,${(0.15 + pulse * 0.25).toFixed(3)})`;
        ctx.fill();
        ctx.save();
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = `rgba(180,180,200,${(0.3 + pulse * 0.4).toFixed(3)})`;
        ctx.textAlign = 'center';
        ctx.fillText('[ camera off ]', system.width * 0.5, system.height * 0.5);
        ctx.restore();
    }

    _drawMosaic(ctx, system) {
        const gap = 3;
        for (const tile of this.tiles) {
            ctx.save();
            ctx.translate(tile.x, tile.y);
            ctx.rotate(tile.rotation);
            const r = Math.round(tile.r), g = Math.round(tile.g), b = Math.round(tile.b);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.strokeStyle = `rgba(255,255,255,0.08)`;
            ctx.lineWidth = 1;
            const hw = tile.w * 0.5 - gap;
            const hh = tile.h * 0.5 - gap;
            const radius = 4;
            ctx.beginPath();
            ctx.moveTo(-hw + radius, -hh);
            ctx.lineTo( hw - radius, -hh);
            ctx.arcTo(  hw, -hh,  hw, -hh + radius, radius);
            ctx.lineTo( hw,  hh - radius);
            ctx.arcTo(  hw,  hh,  hw - radius,  hh, radius);
            ctx.lineTo(-hw + radius,  hh);
            ctx.arcTo( -hw,  hh, -hw,  hh - radius, radius);
            ctx.lineTo(-hw, -hh + radius);
            ctx.arcTo( -hw, -hh, -hw + radius, -hh, radius);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    _drawSilhouette(ctx) {
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const p = this.particlePool[i];
            if (!p.active) continue;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.alpha * 0.85})`;
            ctx.fill();
        }
    }

    _drawColorBleed(ctx, system) {
        const cellW = system.width / GRID_COLS;
        const cellH = system.height / GRID_ROWS;
        const blobR = Math.max(cellW, cellH) * 0.85;

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const idx = row * GRID_COLS + col;
                const c = this.colorField[idx];
                if (c.a < 0.01) continue;
                const cx = col * cellW + cellW * 0.5;
                const cy = row * cellH + cellH * 0.5;
                ctx.beginPath();
                ctx.arc(cx, cy, blobR, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${(c.a * 0.55).toFixed(3)})`;
                ctx.fill();
            }
        }
    }

    _drawMotionTrails(ctx) {
        ctx.lineCap = 'round';
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const p = this.particlePool[i];
            if (!p.active) continue;
            const alpha = p.alpha * 0.8;
            ctx.beginPath();
            ctx.moveTo(p.prevX, p.prevY);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
            ctx.lineWidth = p.size;
            ctx.stroke();
        }
    }

    _drawGridOverlay(ctx, system) {
        const cellW = system.width / GRID_COLS;
        const cellH = system.height / GRID_ROWS;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let col = 0; col <= GRID_COLS; col++) {
            const x = col * cellW;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, system.height);
        }
        for (let row = 0; row <= GRID_ROWS; row++) {
            const y = row * cellH;
            ctx.moveTo(0, y);
            ctx.lineTo(system.width, y);
        }
        ctx.stroke();
    }
}
