/**
 * @file pixel_fireflies_effects.js
 * @description Emergent flocking fireflies that leave phosphorescent trails which
 * fade slowly. Fireflies exhibit curiosity toward the cursor, scatter on click,
 * and synchronize their blinking patterns over time (like real fireflies).
 *
 * Modes:
 * 0 - Meadow: Warm yellow-green fireflies with gentle wandering and sync blink
 * 1 - Deep Forest: Cool blue-green bioluminescent bugs with long trailing glow
 * 2 - Swarm Intelligence: Fireflies form shapes and letters by coordinating
 * 3 - Aurora Swarm: Fireflies leave color-shifting aurora-like ribbons
 * 4 - Predator/Prey: Two species - chasers (red) and evaders (blue) with emergent dynamics
 * 5 - Constellation Bugs: Fireflies connect with light threads when near each other
 */

const TAU = Math.PI * 2;

export class PixelFireflies {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 80;
        this.saturation = 70;
        this.intensity = 1;
        this._rng = Math.random;

        this.fireflies = [];
        this.maxFireflies = 120;

        // Phosphorescent trail canvas (offscreen, decays slowly)
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Sync blink state
        this._globalPhase = 0;
        this._syncStrength = 0;

        // Shape target for mode 2
        this._shapeTargets = null;
        this._shapeIndex = 0;

        // Spatial grid for predator/prey (avoids O(n²))
        this._gridCellSize = 60;
        this._grid = null;
        this._gridCols = 0;
        this._gridRows = 0;

        // Mode-specific tuning
        this._trailFadeRate = 0.03;
        this._trailGlowSize = 1.5;
        this._blinkSyncRate = 0.0005;
        this._wanderAmount = 0.02;

        // Aurora mode ribbon trail positions
        this._auroraTrails = null;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this._syncStrength = 0;
        this._globalPhase = 0;

        // Mode-specific hue and tuning
        switch (this.mode) {
            case 0: // Meadow: warm yellow-green
                this.hue = palette.length > 0 ? palette[0].h : 75 + Math.floor(rng() * 20);
                this._trailFadeRate = 0.04;
                this._trailGlowSize = 1.5;
                this._blinkSyncRate = 0.001; // Real fireflies sync!
                this._wanderAmount = 0.015;
                break;
            case 1: // Deep Forest: cool blue-green with long trails
                this.hue = palette.length > 0 ? palette[0].h : 160 + Math.floor(rng() * 40);
                this._trailFadeRate = 0.008; // Very slow fade
                this._trailGlowSize = 2.5;   // Bigger glow pools
                this._blinkSyncRate = 0.0002;
                this._wanderAmount = 0.01; // Slower, more ethereal
                break;
            case 2: // Swarm Intelligence
                this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
                this._trailFadeRate = 0.05;
                this._trailGlowSize = 1.2;
                this._blinkSyncRate = 0.002;
                this._wanderAmount = 0.008; // Less wander, more directed
                break;
            case 3: // Aurora Swarm: color-shifting ribbons
                this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
                this._trailFadeRate = 0.012;
                this._trailGlowSize = 3;
                this._blinkSyncRate = 0.0003;
                this._wanderAmount = 0.025; // Flowing movement
                break;
            case 4: // Predator/Prey
                this.hue = palette.length > 0 ? palette[0].h : 220;
                this._trailFadeRate = 0.04;
                this._trailGlowSize = 1.5;
                this._blinkSyncRate = 0;
                this._wanderAmount = 0.03; // Twitchy
                break;
            case 5: // Constellation Bugs
                this.hue = palette.length > 0 ? palette[0].h : 40 + Math.floor(rng() * 40);
                this._trailFadeRate = 0.02;
                this._trailGlowSize = 2;
                this._blinkSyncRate = 0.001;
                this._wanderAmount = 0.012;
                break;
        }

        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.6;

        const W = window.innerWidth, H = window.innerHeight;

        // Trail canvas at half resolution
        this._trailW = Math.ceil(W / 2);
        this._trailH = Math.ceil(H / 2);
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = this._trailW;
        this._trailCanvas.height = this._trailH;
        this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        this._trailCtx.clearRect(0, 0, this._trailW, this._trailH);

        const count = this.mode === 4
            ? 60 + Math.floor(rng() * 40)
            : 80 + Math.floor(rng() * 40);
        this.maxFireflies = count;

        // Spatial grid for predator/prey
        this._gridCols = Math.ceil(W / this._gridCellSize) + 1;
        this._gridRows = Math.ceil(H / this._gridCellSize) + 1;
        this._grid = new Array(this._gridCols * this._gridRows);

        this.fireflies = [];
        for (let i = 0; i < count; i++) {
            const isPredator = this.mode === 4 && i < count * 0.3;
            this.fireflies.push({
                x: rng() * W,
                y: rng() * H,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                phase: rng() * TAU,
                blinkSpeed: 0.03 + rng() * 0.04,
                size: isPredator ? 2.5 + rng() * 2 : 1.5 + rng() * 2,
                hueOffset: rng() * 40 - 20,
                brightness: 0,
                isPredator,
                curiosity: 0.3 + rng() * 0.7,
                turnSpeed: 0.05 + rng() * 0.1,
                maxSpeed: isPredator ? 2.5 + rng() : 1.5 + rng() * 1.5,
                targetAngle: rng() * TAU,
                wanderPhase: rng() * TAU,
                wanderFreq: 0.015 + rng() * 0.015,
            });
        }

        // Aurora mode: allocate ribbon trail storage
        if (this.mode === 3) {
            this._auroraTrails = new Float32Array(count * 8); // 4 past positions x2
        } else {
            this._auroraTrails = null;
        }

        if (this.mode === 2) {
            this._generateShapeTargets(rng, W, H, count);
        }
    }

    _generateShapeTargets(rng, W, H, count) {
        const shapes = [];
        const cx = W / 2, cy = H / 2;
        const r = Math.min(W, H) * 0.25;

        const circle = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU;
            circle.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        shapes.push(circle);

        const star = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU;
            const rad = i % 2 === 0 ? r : r * 0.4;
            star.push({ x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad });
        }
        shapes.push(star);

        const spiral = [];
        for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * TAU * 3;
            const rad = t * r;
            spiral.push({ x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad });
        }
        shapes.push(spiral);

        const heart = [];
        for (let i = 0; i < count; i++) {
            const t = (i / count) * TAU;
            const hx = 16 * Math.sin(t) ** 3;
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
            heart.push({ x: cx + hx * (r / 18), y: cy + hy * (r / 18) });
        }
        shapes.push(heart);

        this._shapeTargets = shapes;
        this._shapeIndex = 0;
    }

    _buildSpatialGrid() {
        for (let i = 0; i < this._grid.length; i++) this._grid[i] = null;
        for (let i = 0; i < this.fireflies.length; i++) {
            const f = this.fireflies[i];
            const col = Math.max(0, Math.min(this._gridCols - 1, Math.floor(f.x / this._gridCellSize)));
            const row = Math.max(0, Math.min(this._gridRows - 1, Math.floor(f.y / this._gridCellSize)));
            const cellIdx = row * this._gridCols + col;
            f._gridNext = this._grid[cellIdx];
            this._grid[cellIdx] = i;
        }
    }

    _findNearest(f, isPredatorSearch, searchRadius) {
        const col = Math.max(0, Math.min(this._gridCols - 1, Math.floor(f.x / this._gridCellSize)));
        const row = Math.max(0, Math.min(this._gridRows - 1, Math.floor(f.y / this._gridCellSize)));
        const cellRange = Math.ceil(searchRadius / this._gridCellSize);

        let nearest = null, nearDist = searchRadius * searchRadius;
        for (let dr = -cellRange; dr <= cellRange; dr++) {
            const r2 = row + dr;
            if (r2 < 0 || r2 >= this._gridRows) continue;
            for (let dc = -cellRange; dc <= cellRange; dc++) {
                const c2 = col + dc;
                if (c2 < 0 || c2 >= this._gridCols) continue;
                let idx = this._grid[r2 * this._gridCols + c2];
                while (idx !== null && idx !== undefined) {
                    const other = this.fireflies[idx];
                    if (other.isPredator === isPredatorSearch && other !== f) {
                        const dx = other.x - f.x, dy = other.y - f.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < nearDist) {
                            nearDist = dSq;
                            nearest = other;
                        }
                    }
                    idx = other._gridNext;
                }
            }
        }
        return nearest;
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

        // Click scatter (+ feeding frenzy in predator mode)
        if (isClicking && !this._wasClicking) {
            for (const f of this.fireflies) {
                const fdx = f.x - mx, fdy = f.y - my;
                const distSq = fdx * fdx + fdy * fdy;
                if (distSq < 62500) { // 250^2
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / 250) * (this.mode === 4 && f.isPredator ? 12 : 8);
                    f.vx += (fdx / dist) * force;
                    f.vy += (fdy / dist) * force;
                    f.brightness = 1;
                }
            }
            if (this.mode === 2 && this._shapeTargets) {
                this._shapeIndex = (this._shapeIndex + 1) % this._shapeTargets.length;
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Sync blink
        this._globalPhase += 0.02;
        this._syncStrength = Math.min(1, this._syncStrength + this._blinkSyncRate);

        const W = window.innerWidth, H = window.innerHeight;

        // Build spatial grid for predator/prey mode
        if (this.mode === 4) {
            this._buildSpatialGrid();
        }

        for (let i = 0; i < this.fireflies.length; i++) {
            const f = this.fireflies[i];

            // Blink
            f.phase += f.blinkSpeed;
            const individualBlink = (Math.sin(f.phase) + 1) / 2;
            const syncBlink = (Math.sin(this._globalPhase) + 1) / 2;
            f.brightness = individualBlink * (1 - this._syncStrength) + syncBlink * this._syncStrength;

            // Wander using per-firefly seeded frequency
            f.wanderPhase += f.wanderFreq;
            f.targetAngle += Math.sin(f.wanderPhase) * f.turnSpeed;

            // Cursor interaction
            const cmx = mx - f.x, cmy = my - f.y;
            const cDistSq = cmx * cmx + cmy * cmy;

            if (this.mode === 4 && f.isPredator) {
                const prey = this._findNearest(f, false, 200);
                if (prey) {
                    f.targetAngle = Math.atan2(prey.y - f.y, prey.x - f.x);
                }
            } else if (this.mode === 4 && !f.isPredator) {
                const pred = this._findNearest(f, true, 150);
                if (pred) {
                    f.targetAngle = Math.atan2(f.y - pred.y, f.x - pred.x);
                }
            } else if (this.mode === 2 && this._shapeTargets) {
                const target = this._shapeTargets[this._shapeIndex][i % this._shapeTargets[this._shapeIndex].length];
                const tdx = target.x - f.x, tdy = target.y - f.y;
                const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                if (tdist > 3) {
                    f.targetAngle = Math.atan2(tdy, tdx);
                    // Stronger attraction for shape formation
                    const attract = Math.min(0.08, tdist * 0.0005);
                    f.vx += tdx * attract;
                    f.vy += tdy * attract;
                }
            } else {
                // Curiosity toward cursor
                if (cDistSq < 40000 && !isClicking) { // 200^2
                    const cDist = Math.sqrt(cDistSq);
                    f.targetAngle = Math.atan2(cmy, cmx) * f.curiosity + f.targetAngle * (1 - f.curiosity);
                }
            }

            // Steering
            const desiredVX = Math.cos(f.targetAngle) * f.maxSpeed;
            const desiredVY = Math.sin(f.targetAngle) * f.maxSpeed;
            f.vx += (desiredVX - f.vx) * 0.03;
            f.vy += (desiredVY - f.vy) * 0.03;

            const spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
            if (spd > f.maxSpeed) {
                f.vx = (f.vx / spd) * f.maxSpeed;
                f.vy = (f.vy / spd) * f.maxSpeed;
            }

            // Aurora ribbon trail: shift history before updating position
            if (this.mode === 3 && this._auroraTrails) {
                const base = i * 8;
                // Shift: [2,3]->[4,5], [0,1]->[2,3], current->[0,1]
                this._auroraTrails[base + 6] = this._auroraTrails[base + 4];
                this._auroraTrails[base + 7] = this._auroraTrails[base + 5];
                this._auroraTrails[base + 4] = this._auroraTrails[base + 2];
                this._auroraTrails[base + 5] = this._auroraTrails[base + 3];
                this._auroraTrails[base + 2] = this._auroraTrails[base];
                this._auroraTrails[base + 3] = this._auroraTrails[base + 1];
                this._auroraTrails[base] = f.x;
                this._auroraTrails[base + 1] = f.y;
            }

            f.x += f.vx;
            f.y += f.vy;

            if (f.x < -10) f.x = W + 10;
            if (f.x > W + 10) f.x = -10;
            if (f.y < -10) f.y = H + 10;
            if (f.y > H + 10) f.y = -10;
        }

        // Phosphorescent trail (every 2 frames)
        if (this._trailCtx && this.tick % 2 === 0) {
            const tc = this._trailCtx;
            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = `rgba(0,0,0,${this._trailFadeRate})`;
            tc.fillRect(0, 0, this._trailW, this._trailH);

            tc.globalCompositeOperation = 'lighter';
            for (const f of this.fireflies) {
                if (f.brightness < 0.15) continue;
                const hue = f.isPredator
                    ? (this.hue + 180) % 360
                    : (this.hue + f.hueOffset + 360) % 360;

                // Mode 3: color-shifting aurora trail
                const trailHue = this.mode === 3
                    ? (hue + this.tick * 0.5 + f.phase * 30) % 360
                    : hue;
                const alpha = f.brightness * 0.2 * this.intensity;
                tc.fillStyle = `hsla(${trailHue}, ${this.saturation}%, 55%, ${alpha})`;
                tc.beginPath();
                tc.arc(f.x / 2, f.y / 2, f.size * this._trailGlowSize, 0, TAU);
                tc.fill();

                // Deep forest: additional large faint glow pool
                if (this.mode === 1 && f.brightness > 0.5) {
                    tc.fillStyle = `hsla(${trailHue}, ${this.saturation}%, 40%, ${alpha * 0.15})`;
                    tc.beginPath();
                    tc.arc(f.x / 2, f.y / 2, f.size * 5, 0, TAU);
                    tc.fill();
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();

        // Phosphorescent trail layer
        if (this._trailCanvas && this._trailW > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7 * this.intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';

        // Mode 3: Aurora ribbon trails
        if (this.mode === 3 && this._auroraTrails) {
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            for (let i = 0; i < this.fireflies.length; i++) {
                const f = this.fireflies[i];
                if (f.brightness < 0.2) continue;
                const base = i * 8;
                const hue = (this.hue + f.hueOffset + this.tick * 0.3 + i * 3) % 360;
                const alpha = f.brightness * 0.15 * this.intensity;
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(f.x, f.y);
                ctx.lineTo(this._auroraTrails[base], this._auroraTrails[base + 1]);
                ctx.lineTo(this._auroraTrails[base + 2], this._auroraTrails[base + 3]);
                ctx.lineTo(this._auroraTrails[base + 4], this._auroraTrails[base + 5]);
                ctx.stroke();
            }
        }

        // Mode 5: constellation connections
        if (this.mode === 5) {
            ctx.lineWidth = 0.5;
            for (let i = 0; i < this.fireflies.length; i++) {
                const fi = this.fireflies[i];
                if (fi.brightness < 0.3) continue;
                for (let j = i + 1; j < this.fireflies.length; j++) {
                    const fj = this.fireflies[j];
                    if (fj.brightness < 0.3) continue;
                    const ddx = fi.x - fj.x, ddy = fi.y - fj.y;
                    const distSq = ddx * ddx + ddy * ddy;
                    if (distSq < 8100) { // 90px
                        const dist = Math.sqrt(distSq);
                        const alpha = Math.min(fi.brightness, fj.brightness) * (1 - dist / 90) * 0.12 * this.intensity;
                        const hue = (this.hue + fi.hueOffset + fj.hueOffset + 360) % 360;
                        ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(fi.x, fi.y);
                        ctx.lineTo(fj.x, fj.y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw each firefly
        for (const f of this.fireflies) {
            if (f.brightness < 0.05) continue;

            const hue = f.isPredator
                ? (this.hue + 180) % 360
                : (this.hue + f.hueOffset + 360) % 360;
            const alpha = f.brightness * 0.55 * this.intensity;
            const lightness = 55 + f.brightness * 35;
            const size = f.size * (0.5 + f.brightness * 0.5);

            // Wide outer glow
            if (f.brightness > 0.3) {
                const glowAlpha = alpha * 0.12;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness - 10}%, ${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, size * 6, 0, TAU);
                ctx.fill();
            }

            // Inner glow
            if (f.brightness > 0.2) {
                const glowAlpha = alpha * 0.3;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, size * 3, 0, TAU);
                ctx.fill();
            }

            // Core
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, size, 0, TAU);
            ctx.fill();

            // Bright hot center at peak
            if (f.brightness > 0.8) {
                const peakAlpha = (f.brightness - 0.8) * 2.5 * this.intensity;
                ctx.fillStyle = `hsla(${hue}, 20%, 97%, ${peakAlpha})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y, size * 0.35, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
