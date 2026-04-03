/**
 * @file particle_life_effects.js
 * @description Artificial life simulation where multiple particle species interact
 * via configurable attraction/repulsion rules, creating emergent flocking, chasing,
 * orbiting, and swarming behaviors. The seed determines species count, colors,
 * interaction matrix, and physical constants - producing wildly different ecosystems.
 *
 * Modes:
 * 0 - Symbiosis: Species form mutualistic clusters with gentle orbits
 * 1 - Predator Chain: Each species chases the next in a circular food chain
 * 2 - Tribal War: Species repel enemies and attract allies, forming territorial blobs
 * 3 - Cosmic Dance: All species weakly attract, creating galaxy-like spiral arms
 * 4 - Chaos Soup: Random interaction matrix, completely unpredictable emergent behavior
 * 5 - Crystallize: Species lock into geometric lattice formations
 */

const TAU = Math.PI * 2;

export class ParticleLife {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this._rng = Math.random;

        // Species config
        this.speciesCount = 4;
        this.speciesColors = [];
        // Pre-baked HSLA strings per species (avoids per-frame string creation)
        this._speciesFillStr = [];
        this._speciesStrokeStr = [];
        this.interactionMatrix = []; // [i][j] = force species i exerts on species j

        // Particles
        this.particles = [];
        this.maxParticles = 200;

        // Physics
        this.friction = 0.95;
        this.forceRadius = 120;
        this.forceStrength = 0.4;
        this.minDist = 15;

        // Mouse interaction
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Spatial hashing for O(n) neighbor lookups
        this._gridCellSize = 130;
        this._grid = new Map();

        // Trail canvas for fading phosphor effect (half-res for performance)
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;
        this._trailScale = 0.5;
        this._trailFade = 0.08;

        // Click burst particles
        this._bursts = [];
        this._maxBursts = 60;
    }

    configure(rng, hues) {
        this._rng = rng;
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);

        // Mode selection
        this.mode = Math.floor(rng() * 6);

        // Species count varies by mode
        this.speciesCount = this.mode === 5 ? 3 : 3 + Math.floor(rng() * 4); // 3-6
        this.speciesColors = [];
        this._speciesFillStr = [];
        this._speciesStrokeStr = [];
        const baseHue = this.hue;
        for (let i = 0; i < this.speciesCount; i++) {
            const h = (baseHue + (360 / this.speciesCount) * i + rng() * 30) % 360;
            const s = 60 + rng() * 30;
            const l = 50 + rng() * 20;
            this.speciesColors.push({ h, s, l });
            // Pre-bake color strings
            this._speciesFillStr.push(`hsla(${h | 0}, ${s | 0}%, ${l | 0}%, 0.8)`);
            this._speciesStrokeStr.push(`hsla(${h | 0}, ${s | 0}%, ${l | 0}%, 0.3)`);
        }

        // Build interaction matrix based on mode
        this.interactionMatrix = [];
        for (let i = 0; i < this.speciesCount; i++) {
            this.interactionMatrix[i] = [];
            for (let j = 0; j < this.speciesCount; j++) {
                this.interactionMatrix[i][j] = this._getInteraction(i, j, rng);
            }
        }

        // Physics tuning per mode
        switch (this.mode) {
            case 0: // Symbiosis
                this.friction = 0.92 + rng() * 0.05;
                this.forceRadius = 100 + rng() * 60;
                this.forceStrength = 0.2 + rng() * 0.3;
                this.minDist = 12 + rng() * 8;
                this._trailFade = 0.06;
                break;
            case 1: // Predator Chain
                this.friction = 0.94 + rng() * 0.04;
                this.forceRadius = 130 + rng() * 50;
                this.forceStrength = 0.5 + rng() * 0.3;
                this.minDist = 10 + rng() * 5;
                this._trailFade = 0.04;
                break;
            case 2: // Tribal War
                this.friction = 0.90 + rng() * 0.06;
                this.forceRadius = 90 + rng() * 70;
                this.forceStrength = 0.6 + rng() * 0.4;
                this.minDist = 18 + rng() * 10;
                this._trailFade = 0.05;
                break;
            case 3: // Cosmic Dance
                this.friction = 0.96 + rng() * 0.03;
                this.forceRadius = 150 + rng() * 80;
                this.forceStrength = 0.15 + rng() * 0.2;
                this.minDist = 8 + rng() * 6;
                this._trailFade = 0.03;
                break;
            case 4: // Chaos Soup
                this.friction = 0.88 + rng() * 0.10;
                this.forceRadius = 80 + rng() * 100;
                this.forceStrength = 0.3 + rng() * 0.6;
                this.minDist = 10 + rng() * 15;
                this._trailFade = 0.07;
                break;
            case 5: // Crystallize
                this.friction = 0.97 + rng() * 0.02;
                this.forceRadius = 60 + rng() * 40;
                this.forceStrength = 0.1 + rng() * 0.15;
                this.minDist = 20 + rng() * 15;
                this._trailFade = 0.02;
                break;
        }

        // Spawn particles
        this.particles = [];
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: rng() * w,
                y: rng() * h,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                species: i % this.speciesCount,
                size: 2 + rng() * 2,
            });
        }

        // Reset trail canvas and bursts
        this._trailCanvas = null;
        this._bursts = [];
    }

    _getInteraction(i, j, rng) {
        switch (this.mode) {
            case 0: // Symbiosis - all species mildly attract
                return i === j ? 0.3 + rng() * 0.4 : 0.1 + rng() * 0.3;
            case 1: // Predator chain - i chases (i+1)%n, flees from (i-1+n)%n
                if (j === (i + 1) % this.speciesCount) return 0.6 + rng() * 0.4;
                if (j === (i - 1 + this.speciesCount) % this.speciesCount) return -(0.3 + rng() * 0.3);
                return i === j ? 0.1 : (rng() - 0.5) * 0.2;
            case 2: // Tribal war - attract same, repel different
                return i === j ? 0.5 + rng() * 0.3 : -(0.3 + rng() * 0.5);
            case 3: // Cosmic dance - weak universal attraction with spin
                return 0.05 + rng() * 0.15;
            case 4: // Chaos - fully random
                return (rng() - 0.5) * 1.5;
            case 5: // Crystallize - attract at distance, repel close
                return i === j ? 0.4 : 0.2 + rng() * 0.2;
            default:
                return 0;
        }
    }

    _ensureTrailCanvas() {
        const w = Math.ceil(window.innerWidth * this._trailScale);
        const h = Math.ceil(window.innerHeight * this._trailScale);
        if (!this._trailCanvas || this._trailW !== w || this._trailH !== h) {
            this._trailCanvas = document.createElement('canvas');
            this._trailCanvas.width = w;
            this._trailCanvas.height = h;
            this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
            this._trailW = w;
            this._trailH = h;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        this._mouseX = mx;
        this._mouseY = my;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const fr = this.forceRadius;
        const frSq = fr * fr;
        const minDistSq = this.minDist * this.minDist;
        const strength = this.forceStrength;

        // Build spatial hash
        this._grid.clear();
        const cs = this._gridCellSize;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const key = (Math.floor(p.x / cs) * 10000 + Math.floor(p.y / cs)) | 0;
            let cell = this._grid.get(key);
            if (!cell) { cell = []; this._grid.set(key, cell); }
            cell.push(i);
        }

        // Click burst - spawn visual explosion particles
        if (isClicking && !this._wasClicking) {
            const burstCount = Math.min(20, this._maxBursts - this._bursts.length);
            for (let b = 0; b < burstCount; b++) {
                const angle = (b / burstCount) * TAU;
                const speed = 3 + ((this.tick * 2654435761 + b * 1597334677) >>> 0) / 4294967296 * 4;
                this._bursts.push({
                    x: mx, y: my,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 25,
                    maxLife: 25,
                    species: b % this.speciesCount,
                });
            }
        }

        // Update bursts
        for (let i = this._bursts.length - 1; i >= 0; i--) {
            const b = this._bursts[i];
            b.x += b.vx; b.y += b.vy;
            b.vx *= 0.92; b.vy *= 0.92;
            b.life--;
            if (b.life <= 0) {
                this._bursts[i] = this._bursts[this._bursts.length - 1];
                this._bursts.pop();
            }
        }

        // Apply forces
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            let fx = 0, fy = 0;

            // Check neighboring cells
            const cx = Math.floor(p.x / cs);
            const cy = Math.floor(p.y / cs);
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = ((cx + dx) * 10000 + (cy + dy)) | 0;
                    const cell = this._grid.get(key);
                    if (!cell) continue;
                    for (let k = 0; k < cell.length; k++) {
                        const j = cell[k];
                        if (j === i) continue;
                        const q = this.particles[j];
                        const ddx = q.x - p.x;
                        const ddy = q.y - p.y;
                        const distSq = ddx * ddx + ddy * ddy;
                        if (distSq > frSq || distSq < 1) continue;

                        const dist = Math.sqrt(distSq);
                        const force = this.interactionMatrix[p.species][q.species];

                        if (distSq < minDistSq) {
                            const repel = (this.minDist - dist) / this.minDist;
                            fx -= (ddx / dist) * repel * 0.5;
                            fy -= (ddy / dist) * repel * 0.5;
                        } else {
                            const normalDist = (dist - this.minDist) / (fr - this.minDist);
                            const magnitude = force * strength * (1 - normalDist);
                            fx += (ddx / dist) * magnitude;
                            fy += (ddy / dist) * magnitude;
                        }
                    }
                }
            }

            // Cosmic Dance mode: add perpendicular force for spiral motion
            if (this.mode === 3) {
                const centerX = w / 2;
                const centerY = h / 2;
                const toCenterX = centerX - p.x;
                const toCenterY = centerY - p.y;
                const centerDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY) + 1;
                fx += (-toCenterY / centerDist) * 0.03;
                fy += (toCenterX / centerDist) * 0.03;
                fx += (toCenterX / centerDist) * 0.01;
                fy += (toCenterY / centerDist) * 0.01;
            }

            // Mouse interaction
            const mdx = mx - p.x;
            const mdy = my - p.y;
            const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy) + 1;
            if (mouseDist < 200) {
                if (isClicking) {
                    const scatter = (200 - mouseDist) / 200;
                    fx -= (mdx / mouseDist) * scatter * 2;
                    fy -= (mdy / mouseDist) * scatter * 2;
                } else {
                    const attract = (200 - mouseDist) / 200;
                    fx += (mdx / mouseDist) * attract * 0.3;
                    fy += (mdy / mouseDist) * attract * 0.3;
                }
            }

            p.vx = (p.vx + fx) * this.friction;
            p.vy = (p.vy + fy) * this.friction;

            // Speed cap
            const speed = p.vx * p.vx + p.vy * p.vy;
            if (speed > 25) {
                const s = 5 / Math.sqrt(speed);
                p.vx *= s;
                p.vy *= s;
            }

            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < 0) p.x += w;
            if (p.x > w) p.x -= w;
            if (p.y < 0) p.y += h;
            if (p.y > h) p.y -= h;
        }
    }

    draw(ctx, system) {
        this._ensureTrailCanvas();
        const tc = this._trailCtx;
        const sc = this._trailScale;

        // Fade trail canvas
        tc.globalCompositeOperation = 'destination-out';
        tc.fillStyle = `rgba(0,0,0,${this._trailFade})`;
        tc.fillRect(0, 0, this._trailW, this._trailH);
        tc.globalCompositeOperation = 'source-over';

        // Batch particles by species to minimize fillStyle changes
        for (let sp = 0; sp < this.speciesCount; sp++) {
            tc.fillStyle = this._speciesFillStr[sp];
            tc.beginPath();
            for (const p of this.particles) {
                if (p.species !== sp) continue;
                tc.moveTo(p.x * sc + p.size, p.y * sc);
                tc.arc(p.x * sc, p.y * sc, p.size, 0, TAU);
            }
            tc.fill();

            // Velocity streaks batched
            tc.strokeStyle = this._speciesStrokeStr[sp];
            tc.lineWidth = 1;
            tc.beginPath();
            for (const p of this.particles) {
                if (p.species !== sp) continue;
                const speed = p.vx * p.vx + p.vy * p.vy;
                if (speed > 2.25) { // 1.5^2
                    tc.moveTo(p.x * sc, p.y * sc);
                    tc.lineTo((p.x - p.vx * 3) * sc, (p.y - p.vy * 3) * sc);
                }
            }
            tc.stroke();
        }

        // Composite trail onto main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this._trailCanvas, 0, 0, window.innerWidth, window.innerHeight);
        ctx.restore();

        // Draw click burst particles
        if (this._bursts.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let sp = 0; sp < this.speciesCount; sp++) {
                const c = this.speciesColors[sp];
                ctx.fillStyle = `hsla(${c.h | 0}, ${c.s | 0}%, ${(c.l + 15) | 0}%, `;
                for (const b of this._bursts) {
                    if (b.species !== sp) continue;
                    const alpha = (b.life / b.maxLife) * 0.6;
                    const size = 3 * (1 - b.life / b.maxLife) + 1;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, size, 0, TAU);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // Crystallize mode: draw lattice lines between nearby same-species
        if (this.mode === 5 && this.tick % 2 === 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 0.8;
            const latticeDistSq = this.minDist * this.minDist * 9; // 3x minDist
            for (let sp = 0; sp < this.speciesCount; sp++) {
                const c = this.speciesColors[sp];
                ctx.strokeStyle = `hsla(${c.h | 0}, ${c.s | 0}%, ${c.l | 0}%, 0.2)`;
                ctx.beginPath();
                for (let i = 0; i < this.particles.length; i++) {
                    const p = this.particles[i];
                    if (p.species !== sp) continue;
                    for (let j = i + 1; j < this.particles.length; j++) {
                        const q = this.particles[j];
                        if (q.species !== sp) continue;
                        const dx = p.x - q.x;
                        const dy = p.y - q.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < latticeDistSq) {
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(q.x, q.y);
                        }
                    }
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Other modes: sparse interaction lines (every other frame)
        if (this.mode !== 5 && this.tick % 3 === 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 0.5;
            const lineDistSq = 3600; // 60px
            for (let sp = 0; sp < this.speciesCount; sp++) {
                const c = this.speciesColors[sp];
                ctx.strokeStyle = `hsla(${c.h | 0}, ${c.s | 0}%, ${c.l | 0}%, 0.12)`;
                ctx.beginPath();
                for (let i = 0; i < this.particles.length; i += 3) {
                    const p = this.particles[i];
                    if (p.species !== sp) continue;
                    for (let j = i + 3; j < this.particles.length; j += 3) {
                        const q = this.particles[j];
                        if (q.species !== sp) continue;
                        const dx = p.x - q.x;
                        const dy = p.y - q.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < lineDistSq) {
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(q.x, q.y);
                        }
                    }
                }
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}
