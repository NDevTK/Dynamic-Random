/**
 * @file reactive_grid_effects.js
 * @description Seed-driven reactive grid system that creates mesmerizing patterns
 * around the cursor. Each seed selects a different grid behavior mode and visual style.
 *
 * Modes:
 * 0 - Wave Propagation: concentric ripples emanate from cursor, interfere with each other
 * 1 - Energy Cascade: cells light up in branching chain reactions from cursor position
 * 2 - Magnetic Topology: field lines and flux density visualize around cursor as a dipole
 * 3 - Cellular Automata: cursor seeds living cells that evolve via custom rule sets
 * 4 - Hex Pulse Network: hexagonal grid where energy pulses travel along edges
 * 5 - Gravity Warp: grid deforms as if cursor has mass, cells stretch toward it
 */

export class ReactiveGrid {
    constructor() {
        this.cols = 0;
        this.rows = 0;
        this.cellSize = 0;
        this.grid = null;
        this.prevGrid = null;
        this.automataBuffer = null; // Persistent buffer for automata (avoids per-frame alloc)
        this.mode = 0;
        this.hue = 0;
        this.saturation = 70;
        this.tick = 0;
        this.ruleSet = 0;

        // Wave mode
        this.waveSpeed = 0.3;
        this.waveDamping = 0.96;
        this.waveFrequency = 1;

        // Energy cascade
        this.cascadeChance = 0.15;
        this.cascadeDecay = 0.92;
        this.cascadeBranching = 3;

        // Hex pulse
        this.pulses = [];
        this.pulsePool = [];
        this.maxPulses = 60;
        this.hexRadius = 0;

        // Gravity warp
        this.warpStrength = 0;
        this.restPositions = null;

        // Cached hex skeleton path
        this._hexSkeletonPath = null;
        this._hexSkeletonW = 0;
        this._hexSkeletonH = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? (palette[0].h || Math.floor(rng() * 360)) : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this.pulses = [];
        this._hexSkeletonPath = null;

        // Mode-specific configuration
        switch (this.mode) {
            case 0: // Wave
                this.waveSpeed = 0.2 + rng() * 0.3;
                this.waveDamping = 0.93 + rng() * 0.05;
                this.waveFrequency = 1 + Math.floor(rng() * 3);
                this.cellSize = 8 + Math.floor(rng() * 8);
                break;
            case 1: // Energy cascade
                this.cascadeChance = 0.08 + rng() * 0.15;
                this.cascadeDecay = 0.88 + rng() * 0.08;
                this.cascadeBranching = 2 + Math.floor(rng() * 3);
                this.cellSize = 6 + Math.floor(rng() * 6);
                break;
            case 2: // Magnetic topology
                this.cellSize = 10 + Math.floor(rng() * 10);
                break;
            case 3: // Cellular automata
                this.ruleSet = Math.floor(rng() * 4);
                this.cellSize = 5 + Math.floor(rng() * 5);
                break;
            case 4: // Hex pulse
                this.hexRadius = 12 + Math.floor(rng() * 12);
                this.cellSize = this.hexRadius * 2;
                break;
            case 5: // Gravity warp
                this.warpStrength = 80 + rng() * 120;
                this.cellSize = 20 + Math.floor(rng() * 15);
                break;
        }

        this._initGrid(window.innerWidth, window.innerHeight);
    }

    _initGrid(w, h) {
        this.cols = Math.ceil(w / this.cellSize) + 1;
        this.rows = Math.ceil(h / this.cellSize) + 1;
        const len = this.cols * this.rows;
        this.grid = new Float32Array(len);
        this.prevGrid = new Float32Array(len);

        // Persistent automata buffer to avoid per-frame allocation
        if (this.mode === 3) {
            this.automataBuffer = new Float32Array(len);
        }

        if (this.mode === 5) {
            this.restPositions = new Float32Array(len * 2);
            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    const idx = (y * this.cols + x) * 2;
                    this.restPositions[idx] = x * this.cellSize;
                    this.restPositions[idx + 1] = y * this.cellSize;
                }
            }
        }
    }

    update(mx, my, isClicking, qualityScale) {
        this.tick++;
        if (!this.grid) return;

        const cs = this.cellSize;
        const cx = Math.floor(mx / cs);
        const cy = Math.floor(my / cs);

        switch (this.mode) {
            case 0: this._updateWave(cx, cy, isClicking); break;
            case 1: this._updateCascade(cx, cy, isClicking); break;
            case 2: this._updateMagnetic(mx, my); break;
            case 3: this._updateAutomata(cx, cy, isClicking); break;
            case 4: this._updateHexPulse(mx, my, isClicking); break;
            case 5: this._updateGravityWarp(mx, my); break;
        }
    }

    _updateWave(cx, cy, isClicking) {
        const cols = this.cols, rows = this.rows;
        const temp = this.prevGrid;
        this.prevGrid = this.grid;
        this.grid = temp;

        // Inject energy at cursor
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const amplitude = isClicking ? 1.5 : 0.4;
            for (let f = 0; f < this.waveFrequency; f++) {
                const ox = Math.floor(Math.sin(this.tick * 0.1 + f * 2.1) * 2);
                const oy = Math.floor(Math.cos(this.tick * 0.1 + f * 2.1) * 2);
                const nx = cx + ox, ny = cy + oy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                    this.prevGrid[ny * cols + nx] = amplitude * Math.sin(this.tick * 0.15 + f);
                }
            }
        }

        // Wave equation with proper boundary handling
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                const i = y * cols + x;
                const neighbors = this.prevGrid[i - 1] + this.prevGrid[i + 1] +
                    this.prevGrid[i - cols] + this.prevGrid[i + cols];
                this.grid[i] = (2 * this.prevGrid[i] - this.grid[i] +
                    this.waveSpeed * (neighbors - 4 * this.prevGrid[i])) * this.waveDamping;
            }
        }

        // Copy inner boundary values to edges so they don't create dead zones
        for (let x = 0; x < cols; x++) {
            this.grid[x] = this.grid[cols + x] * 0.5;                               // top edge
            this.grid[(rows - 1) * cols + x] = this.grid[(rows - 2) * cols + x] * 0.5; // bottom edge
        }
        for (let y = 0; y < rows; y++) {
            this.grid[y * cols] = this.grid[y * cols + 1] * 0.5;                    // left edge
            this.grid[y * cols + cols - 1] = this.grid[y * cols + cols - 2] * 0.5;  // right edge
        }
    }

    _updateCascade(cx, cy, isClicking) {
        const cols = this.cols, rows = this.rows;

        // Decay existing energy
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] *= this.cascadeDecay;
        }

        // Seed energy at cursor
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const energy = isClicking ? 1.0 : 0.5;
            this.grid[cy * cols + cx] = Math.max(this.grid[cy * cols + cx], energy);

            // Randomly seed neighbors for branching effect
            if (this.tick % 3 === 0) {
                const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
                for (let b = 0; b < this.cascadeBranching; b++) {
                    const d = dirs[Math.floor(Math.random() * dirs.length)];
                    const nx = cx + d[0], ny = cy + d[1];
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                        this.grid[ny * cols + nx] = Math.max(this.grid[ny * cols + nx], energy * 0.7);
                    }
                }
            }
        }

        // Cascade: energized cells can spread to neighbors
        if (this.tick % 2 === 0) {
            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    const i = y * cols + x;
                    if (this.grid[i] > 0.3 && Math.random() < this.cascadeChance) {
                        const dx = Math.random() > 0.5 ? 1 : -1;
                        const dy = Math.random() > 0.5 ? 1 : -1;
                        const ni = (y + dy) * cols + (x + dx);
                        if (this.grid[ni] < this.grid[i] * 0.5) {
                            this.grid[ni] = this.grid[i] * 0.6;
                        }
                    }
                }
            }
        }
    }

    _updateMagnetic(mx, my) {
        const cols = this.cols, rows = this.rows, cs = this.cellSize;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px = x * cs + cs / 2;
                const py = y * cs + cs / 2;
                const dx = px - mx;
                const dy = py - my;
                const distSq = dx * dx + dy * dy + 1;
                // Dipole field: strength ~ 1/r^2, capped at 1
                const field = Math.min(1, 20000 / distSq);
                // Direction angle for field lines
                const angle = Math.atan2(dy, dx);
                this.grid[y * cols + x] = field;
                this.prevGrid[y * cols + x] = angle;
            }
        }
    }

    _updateAutomata(cx, cy, isClicking) {
        const cols = this.cols, rows = this.rows;

        // Seed cells at cursor
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
            const radius = isClicking ? 3 : 1;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = cx + dx, ny = cy + dy;
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                        this.grid[ny * cols + nx] = 1.0;
                    }
                }
            }
        }

        // Run automata rules every 4 frames
        if (this.tick % 4 !== 0) return;

        // Copy current state into persistent buffer (no allocation)
        this.automataBuffer.set(this.grid);
        const src = this.automataBuffer;

        // Bitmask lookup for neighbor rules (faster than Array.includes)
        // ruleSet 2: Day&Night B3678/S34678 -> birth mask: (1<<3)|(1<<6)|(1<<7)|(1<<8), survive: (1<<3)|(1<<4)|(1<<6)|(1<<7)|(1<<8)
        // ruleSet 3: Diamoeba B35678/S5678 -> birth: (1<<3)|(1<<5)|(1<<6)|(1<<7)|(1<<8), survive: (1<<5)|(1<<6)|(1<<7)|(1<<8)
        const BIRTH_MASKS = [0, 0, (1 << 3) | (1 << 6) | (1 << 7) | (1 << 8), (1 << 3) | (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8)];
        const SURVIVE_MASKS = [0, 0, (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7) | (1 << 8), (1 << 5) | (1 << 6) | (1 << 7) | (1 << 8)];

        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (src[(y + dy) * cols + (x + dx)] > 0.5) neighbors++;
                    }
                }
                const alive = src[y * cols + x] > 0.5;
                const i = y * cols + x;
                const nBit = 1 << neighbors;
                switch (this.ruleSet) {
                    case 0: // Classic life B3/S23
                        this.grid[i] = (alive ? (neighbors === 2 || neighbors === 3) : neighbors === 3) ? 1.0 : this.grid[i] * 0.85;
                        break;
                    case 1: // Seeds B2/S
                        this.grid[i] = (!alive && neighbors === 2) ? 1.0 : (alive ? 0 : this.grid[i] * 0.9);
                        break;
                    case 2: // Day & Night
                        this.grid[i] = (alive ? (SURVIVE_MASKS[2] & nBit) : (BIRTH_MASKS[2] & nBit)) ? 1.0 : this.grid[i] * 0.88;
                        break;
                    case 3: // Diamoeba
                        this.grid[i] = (alive ? (SURVIVE_MASKS[3] & nBit) : (BIRTH_MASKS[3] & nBit)) ? 1.0 : this.grid[i] * 0.9;
                        break;
                }
            }
        }
    }

    _updateHexPulse(mx, my, isClicking) {
        // Spawn pulses at cursor
        if (this.tick % (isClicking ? 4 : 12) === 0 && this.pulses.length < this.maxPulses) {
            const pulse = this.pulsePool.length > 0 ? this.pulsePool.pop() : {};
            const angle = Math.random() * Math.PI * 2;
            pulse.x = mx;
            pulse.y = my;
            pulse.vx = Math.cos(angle) * (2 + Math.random() * 3);
            pulse.vy = Math.sin(angle) * (2 + Math.random() * 3);
            pulse.life = 1.0;
            pulse.decay = 0.008 + Math.random() * 0.01;
            pulse.size = 3 + Math.random() * 5;
            pulse.hueOffset = Math.random() * 60 - 30;
            this.pulses.push(pulse);
        }

        // Update pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            // Snap to hex grid nodes for visual effect
            if (this.tick % 8 === 0) {
                const hr = this.hexRadius;
                const sqrt3 = Math.sqrt(3);
                const col = Math.round(p.x / (hr * 1.5));
                const row = Math.round(p.y / (hr * sqrt3));
                const snapX = col * hr * 1.5;
                const snapY = row * hr * sqrt3 + (col % 2 ? hr * sqrt3 / 2 : 0);
                p.vx += (snapX - p.x) * 0.05;
                p.vy += (snapY - p.y) * 0.05;
            }

            if (p.life <= 0) {
                this.pulsePool.push(p);
                this.pulses[i] = this.pulses[this.pulses.length - 1];
                this.pulses.pop();
            }
        }

        // Decay grid glow gradually instead of hard-resetting
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] *= 0.92;
        }
        // Paint pulse energy into grid cells
        for (const p of this.pulses) {
            const gx = Math.floor(p.x / this.cellSize);
            const gy = Math.floor(p.y / this.cellSize);
            if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
                this.grid[gy * this.cols + gx] = Math.max(this.grid[gy * this.cols + gx], p.life);
            }
            // Also light up adjacent cells for wider glow
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = gx + dx, ny = gy + dy;
                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                        this.grid[ny * this.cols + nx] = Math.max(this.grid[ny * this.cols + nx], p.life * 0.3);
                    }
                }
            }
        }
    }

    _updateGravityWarp(mx, my) {
        if (!this.restPositions) return;
        const cols = this.cols, rows = this.rows;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const idx = (y * cols + x) * 2;
                const rx = this.restPositions[idx];
                const ry = this.restPositions[idx + 1];
                const dx = rx - mx;
                const dy = ry - my;
                const distSq = dx * dx + dy * dy + 1;
                const dist = Math.sqrt(distSq);
                const force = this.warpStrength / distSq;
                const pullX = -dx / dist * force;
                const pullY = -dy / dist * force;
                this.grid[y * cols + x] = Math.min(1, Math.sqrt(pullX * pullX + pullY * pullY) / 5);
                this.prevGrid[y * cols + x] = Math.atan2(pullY, pullX);
            }
        }
    }

    draw(ctx, system) {
        if (!this.grid) return;

        const cs = this.cellSize;
        const cols = this.cols, rows = this.rows;
        const w = system.width, h = system.height;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        switch (this.mode) {
            case 0: this._drawWave(ctx, cs, cols, rows); break;
            case 1: this._drawCascade(ctx, cs, cols, rows); break;
            case 2: this._drawMagnetic(ctx, cs, cols, rows); break;
            case 3: this._drawAutomata(ctx, cs, cols, rows); break;
            case 4: this._drawHexPulse(ctx, w, h); break;
            case 5: this._drawGravityWarp(ctx, cs, cols, rows); break;
        }

        ctx.restore();
    }

    _drawWave(ctx, cs, cols, rows) {
        // Batch positive and negative waves separately for fewer style changes
        ctx.beginPath();
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = this.grid[y * cols + x];
                if (Math.abs(val) < 0.02) continue;
                const intensity = Math.abs(val);
                const hueShift = val > 0 ? 0 : 120;
                ctx.fillStyle = `hsla(${(this.hue + hueShift) % 360}, ${this.saturation}%, ${40 + intensity * 40}%, ${intensity * 0.4})`;
                ctx.fillRect(x * cs, y * cs, cs, cs);
            }
        }
    }

    _drawCascade(ctx, cs, cols, rows) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = this.grid[y * cols + x];
                if (val < 0.05) continue;
                const hue = (this.hue + val * 60 + this.tick * 0.5) % 360;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${50 + val * 30}%, ${val * 0.5})`;
                const shrink = (1 - val) * cs * 0.3;
                ctx.fillRect(x * cs + shrink, y * cs + shrink, cs - shrink * 2, cs - shrink * 2);
            }
        }
    }

    _drawMagnetic(ctx, cs, cols, rows) {
        ctx.lineWidth = 1;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const field = this.grid[y * cols + x];
                if (field < 0.01) continue;
                const angle = this.prevGrid[y * cols + x];
                const px = x * cs + cs / 2;
                const py = y * cs + cs / 2;
                const len = field * cs * 0.8;

                ctx.strokeStyle = `hsla(${(this.hue + field * 100) % 360}, ${this.saturation}%, 60%, ${field * 0.5})`;
                ctx.beginPath();
                ctx.moveTo(px - Math.cos(angle) * len / 2, py - Math.sin(angle) * len / 2);
                ctx.lineTo(px + Math.cos(angle) * len / 2, py + Math.sin(angle) * len / 2);
                ctx.stroke();

                if (field > 0.1) {
                    const tipX = px + Math.cos(angle) * len / 2;
                    const tipY = py + Math.sin(angle) * len / 2;
                    const arrowLen = 3;
                    ctx.beginPath();
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - Math.cos(angle - 0.5) * arrowLen, tipY - Math.sin(angle - 0.5) * arrowLen);
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - Math.cos(angle + 0.5) * arrowLen, tipY - Math.sin(angle + 0.5) * arrowLen);
                    ctx.stroke();
                }
            }
        }
    }

    _drawAutomata(ctx, cs, cols, rows) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = this.grid[y * cols + x];
                if (val < 0.05) continue;
                const hue = (this.hue + (1 - val) * 60) % 360;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${40 + val * 30}%, ${val * 0.45})`;
                ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
            }
        }
    }

    _drawHexPulse(ctx, w, h) {
        const hr = this.hexRadius;
        const sqrt3 = Math.sqrt(3);

        // Cache hex skeleton path for performance
        if (!this._hexSkeletonPath || this._hexSkeletonW !== w || this._hexSkeletonH !== h) {
            this._hexSkeletonPath = new Path2D();
            this._hexSkeletonW = w;
            this._hexSkeletonH = h;
            const hexCols = Math.ceil(w / (hr * 1.5)) + 1;
            const hexRows = Math.ceil(h / (hr * sqrt3)) + 1;
            for (let col = 0; col < hexCols; col++) {
                for (let row = 0; row < hexRows; row++) {
                    const cx = col * hr * 1.5;
                    const cy = row * hr * sqrt3 + (col % 2 ? hr * sqrt3 / 2 : 0);
                    for (let i = 0; i < 6; i++) {
                        const a = Math.PI / 3 * i + Math.PI / 6;
                        const hx = cx + hr * 0.4 * Math.cos(a);
                        const hy = cy + hr * 0.4 * Math.sin(a);
                        if (i === 0) this._hexSkeletonPath.moveTo(hx, hy);
                        else this._hexSkeletonPath.lineTo(hx, hy);
                    }
                    this._hexSkeletonPath.closePath();
                }
            }
        }

        // Draw cached hex skeleton
        ctx.strokeStyle = `hsla(${this.hue}, 30%, 30%, 0.06)`;
        ctx.lineWidth = 0.5;
        ctx.stroke(this._hexSkeletonPath);

        // Draw hex cell glow from grid energy
        const cs = this.cellSize;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const val = this.grid[y * this.cols + x];
                if (val < 0.03) continue;
                const hue = (this.hue + val * 40) % 360;
                ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${val * 0.2})`;
                ctx.fillRect(x * cs, y * cs, cs, cs);
            }
        }

        // Draw pulses on top
        for (const p of this.pulses) {
            const alpha = p.life * 0.6;
            const hue = (this.hue + p.hueOffset + 360) % 360;
            ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Connection lines to nearby pulses
            for (const q of this.pulses) {
                if (q === p) continue;
                const dx = q.x - p.x, dy = q.y - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 10000) { // within 100px
                    const dist = Math.sqrt(distSq);
                    const lineAlpha = Math.min(p.life, q.life) * (1 - dist / 100) * 0.2;
                    ctx.strokeStyle = `hsla(${hue}, 60%, 60%, ${lineAlpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                }
            }
        }
    }

    _drawGravityWarp(ctx, cs, cols, rows) {
        if (!this.restPositions) return;
        ctx.lineWidth = 1;

        // Batch faint dots first
        ctx.fillStyle = `hsla(${this.hue}, 20%, 25%, 0.1)`;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const displacement = this.grid[y * cols + x];
                if (displacement < 0.01) {
                    const idx = (y * cols + x) * 2;
                    ctx.fillRect(this.restPositions[idx] - 1, this.restPositions[idx + 1] - 1, 2, 2);
                }
            }
        }

        // Draw displaced particles
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const displacement = this.grid[y * cols + x];
                if (displacement < 0.01) continue;

                const idx = (y * cols + x) * 2;
                const rx = this.restPositions[idx];
                const ry = this.restPositions[idx + 1];
                const angle = this.prevGrid[y * cols + x];
                const pullDist = displacement * 40;
                const dx = rx + Math.cos(angle) * pullDist;
                const dy = ry + Math.sin(angle) * pullDist;

                const hue = (this.hue + displacement * 80) % 360;
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 55%, ${displacement * 0.5})`;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(dx, dy);
                ctx.stroke();

                ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${displacement * 0.6})`;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5 + displacement * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
