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

        // Trail canvas for fading phosphor effect
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;
        this._trailFade = 0.08;
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
        const baseHue = this.hue;
        for (let i = 0; i < this.speciesCount; i++) {
            const h = (baseHue + (360 / this.speciesCount) * i + rng() * 30) % 360;
            const s = 60 + rng() * 30;
            const l = 50 + rng() * 20;
            this.speciesColors.push({ h, s, l });
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

        // Reset trail canvas
        this._trailCanvas = null;
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
        const w = window.innerWidth;
        const h = window.innerHeight;
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
                            // Repulsion at close range
                            const repel = (this.minDist - dist) / this.minDist;
                            fx -= (ddx / dist) * repel * 0.5;
                            fy -= (ddy / dist) * repel * 0.5;
                        } else {
                            // Attraction/repulsion based on interaction matrix
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
                // Perpendicular (tangential) force for spiral
                fx += (-toCenterY / centerDist) * 0.03;
                fy += (toCenterX / centerDist) * 0.03;
                // Weak radial pull
                fx += (toCenterX / centerDist) * 0.01;
                fy += (toCenterY / centerDist) * 0.01;
            }

            // Mouse interaction
            const mdx = mx - p.x;
            const mdy = my - p.y;
            const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy) + 1;
            if (mouseDist < 200) {
                if (isClicking) {
                    // Click scatters particles away
                    const scatter = (200 - mouseDist) / 200;
                    fx -= (mdx / mouseDist) * scatter * 2;
                    fy -= (mdy / mouseDist) * scatter * 2;
                } else {
                    // Gentle cursor attraction
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

        // Fade trail canvas
        tc.globalCompositeOperation = 'destination-out';
        tc.fillStyle = `rgba(0,0,0,${this._trailFade})`;
        tc.fillRect(0, 0, this._trailW, this._trailH);
        tc.globalCompositeOperation = 'source-over';

        // Draw particles to trail canvas
        for (const p of this.particles) {
            const c = this.speciesColors[p.species];
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const brightness = Math.min(80, c.l + speed * 5);
            tc.fillStyle = `hsla(${c.h}, ${c.s}%, ${brightness}%, 0.8)`;
            tc.beginPath();
            tc.arc(p.x, p.y, p.size, 0, TAU);
            tc.fill();

            // Velocity streak
            if (speed > 1.5) {
                tc.strokeStyle = `hsla(${c.h}, ${c.s}%, ${brightness}%, 0.3)`;
                tc.lineWidth = 1;
                tc.beginPath();
                tc.moveTo(p.x, p.y);
                tc.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
                tc.stroke();
            }
        }

        // Composite trail onto main canvas
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(this._trailCanvas, 0, 0);
        ctx.restore();

        // Draw interaction lines between close same-species particles (sparse)
        if (this.tick % 2 === 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 0.5;
            const lineDistSq = 3600; // 60px
            for (let i = 0; i < this.particles.length; i += 3) {
                const p = this.particles[i];
                for (let j = i + 3; j < this.particles.length; j += 3) {
                    const q = this.particles[j];
                    if (p.species !== q.species) continue;
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < lineDistSq) {
                        const alpha = (1 - dSq / lineDistSq) * 0.15;
                        const c = this.speciesColors[p.species];
                        ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }
    }
}
