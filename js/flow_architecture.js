/**
 * @file flow_architecture.js
 * @description Defines the Flow architecture with vector field and color wisps.
 * Enhanced with seed-driven flow modes, hue shifting, speed-based glow,
 * vortex gravity wells, shockwave bursts, and longer warp trails.
 * Performance: eliminated per-particle gradient creation in draw loop.
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown } from './state.js';
import { createNoise2D, curlNoise2D } from './simplex_noise.js';

export class FlowArchitecture extends Architecture {
    constructor() {
        super();
        this.particles = [];
        this.numParticles = 150;
        this.field = [];
        this.cols = 0;
        this.rows = 0;
        this.cellSize = 100;
        this.noise2D = null;
        this.noiseSeed = 0;
        this.flowMode = 0;
        this.colorMode = 0;
        this.fieldScale = 0.15;
        this.friction = 0.92;
        this.fieldStrength = 0.4;
        this.turbulence = 0.003;
        this.attractors = [];
        this.clickBursts = [];
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven flow mode — dramatically changes particle behavior
        this.flowMode = Math.floor(rng() * 5);
        // 0 = classic curl, 1 = laminar streams, 2 = turbulent chaos,
        // 3 = orbital rings, 4 = converging funnels

        // Seed-driven color mode
        this.colorMode = Math.floor(rng() * 5);
        // 0 = hue-shifting, 1 = monochrome glow, 2 = fire gradient,
        // 3 = ocean blues, 4 = rainbow speed-mapped

        // Seed-driven physics
        this.fieldScale = 0.08 + rng() * 0.15;
        this.friction = 0.88 + rng() * 0.08;
        this.fieldStrength = 0.2 + rng() * 0.5;
        this.turbulence = 0.001 + rng() * 0.006;
        this.numParticles = 100 + Math.floor(rng() * 120);
        this.particleBaseSize = 1.5 + rng() * 3;
        this.trailLengthMult = 5 + rng() * 12;
        this.glowThreshold = 2 + rng() * 3;

        this.cols = Math.ceil(system.width / this.cellSize) + 1;
        this.rows = Math.ceil(system.height / this.cellSize) + 1;
        this.field = new Array(this.cols * this.rows);
        this.noiseSeed = Math.floor(rng() * 100000);
        this.noise2D = createNoise2D(this.noiseSeed);
        this.generateField(system);

        // Seed-driven attractors for orbital/funnel modes
        this.attractors = [];
        if (this.flowMode === 3 || this.flowMode === 4) {
            const count = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < count; i++) {
                this.attractors.push({
                    x: system.width * (0.2 + rng() * 0.6),
                    y: system.height * (0.2 + rng() * 0.6),
                    strength: 0.5 + rng() * 2,
                    radius: 100 + rng() * 200
                });
            }
        }

        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push(this._createParticle(system, rng));
        }

        this.clickBursts = [];
    }

    _createParticle(system, rng) {
        const baseHue = system.hue + (rng() - 0.5) * 60;
        return {
            x: rng() * system.width,
            y: rng() * system.height,
            vx: 0,
            vy: 0,
            life: rng() * 100 + 50,
            maxLife: 150,
            hue: baseHue,
            baseHue: baseHue,
            hueShift: (rng() - 0.5) * 0.5,
            size: this.particleBaseSize * (0.7 + rng() * 0.6)
        };
    }

    generateField(system) {
        for (let i = 0; i < this.field.length; i++) {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            const curl = curlNoise2D(this.noise2D, col * this.fieldScale, row * this.fieldScale);
            this.field[i] = { x: curl.x, y: curl.y };
        }
    }

    _getParticleColor(p, speed) {
        const alpha = Math.max(0, p.life / p.maxLife);
        const h = ((p.hue % 360) + 360) % 360;

        switch (this.colorMode) {
            case 0: // Hue-shifting (classic)
                return { h, s: 80, l: 60, a: alpha * 0.6 };
            case 1: // Monochrome glow
                return { h, s: 30, l: 70 + speed * 3, a: alpha * 0.7 };
            case 2: // Fire gradient (speed-mapped)
                return { h: Math.max(0, 50 - speed * 8), s: 100, l: 40 + speed * 5, a: alpha * 0.7 };
            case 3: // Ocean blues
                return { h: 180 + speed * 10, s: 70, l: 50 + speed * 3, a: alpha * 0.6 };
            case 4: // Rainbow speed-mapped
                return { h: (h + speed * 20) % 360, s: 90, l: 55, a: alpha * 0.6 };
            default:
                return { h, s: 80, l: 60, a: alpha * 0.6 };
        }
    }

    update(system) {
        const t = system.tick * this.turbulence;
        const qualityScale = system.qualityScale || 1;

        // Update field with time-varying curl noise
        // Skip some cells when quality is low
        const fieldStep = qualityScale < 0.5 ? 2 : 1;
        for (let i = 0; i < this.field.length; i += fieldStep) {
            const col = i % this.cols;
            const row = Math.floor(i / this.cols);

            if (this.flowMode === 1) {
                // Laminar: mostly horizontal with gentle vertical waves
                const wave = Math.sin(row * 0.3 + t * 5) * 0.3;
                this.field[i].x = 0.8 + wave;
                this.field[i].y = Math.sin(col * 0.1 + t * 3) * 0.2;
            } else if (this.flowMode === 2) {
                // Turbulent: high-frequency noise
                const curl = curlNoise2D(this.noise2D, col * this.fieldScale * 2 + t * 2, row * this.fieldScale * 2 + t * 1.5);
                this.field[i].x = curl.x * 1.5;
                this.field[i].y = curl.y * 1.5;
            } else {
                // Classic curl noise (modes 0, 3, 4)
                const curl = curlNoise2D(this.noise2D, col * this.fieldScale + t, row * this.fieldScale + t * 0.7);
                this.field[i].x = curl.x;
                this.field[i].y = curl.y;
            }
        }

        const mx = mouse.x;
        const my = mouse.y;

        // Click burst — spawn radial particle explosion
        if (isLeftMouseDown && system.tick % 8 === 0) {
            this.clickBursts.push({ x: mx, y: my, life: 30, maxLife: 30 });
        }

        // Update click bursts
        for (let i = this.clickBursts.length - 1; i >= 0; i--) {
            this.clickBursts[i].life--;
            if (this.clickBursts[i].life <= 0) {
                this.clickBursts[i] = this.clickBursts[this.clickBursts.length - 1];
                this.clickBursts.pop();
            }
        }

        // Cap active particles by quality
        const activeCount = Math.floor(this.numParticles * qualityScale);

        for (let pi = 0; pi < this.particles.length; pi++) {
            const p = this.particles[pi];

            // Skip excess particles when quality is low
            if (pi >= activeCount) {
                p.life = -1;
                continue;
            }

            const c = Math.max(0, Math.min(this.cols - 1, Math.floor(p.x / this.cellSize)));
            const r = Math.max(0, Math.min(this.rows - 1, Math.floor(p.y / this.cellSize)));
            const idx = r * this.cols + c;

            if (this.field[idx]) {
                p.vx += this.field[idx].x * this.fieldStrength;
                p.vy += this.field[idx].y * this.fieldStrength;
            }

            // Attractor forces (orbital/funnel modes)
            for (const att of this.attractors) {
                const dx = att.x - p.x;
                const dy = att.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                if (dist < att.radius) {
                    const force = (att.radius - dist) / att.radius * att.strength;
                    if (this.flowMode === 3) {
                        // Orbital: tangential + slight pull
                        p.vx += (dy / dist) * force * 0.5;
                        p.vy -= (dx / dist) * force * 0.5;
                        p.vx += (dx / dist) * force * 0.05;
                        p.vy += (dy / dist) * force * 0.05;
                    } else {
                        // Funnel: strong pull toward center
                        p.vx += (dx / dist) * force * 0.3;
                        p.vy += (dy / dist) * force * 0.3;
                    }
                }
            }

            // Mouse influence
            const dx = p.x - mx;
            const dy = p.y - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell) {
                if (distSq < 160000) {
                    const dist = Math.sqrt(distSq) || 1;
                    const force = (400 - dist) / 400;
                    p.vx += (dy / dist) * force * 6;
                    p.vy -= (dx / dist) * force * 6;
                    p.vx -= (dx / dist) * force * 2.0;
                    p.vy -= (dy / dist) * force * 2.0;
                }
            } else if (distSq < 40000) {
                const dist = Math.sqrt(distSq) || 1;
                const force = (200 - dist) / 200;
                p.vx += (dy / dist) * force * 2;
                p.vy -= (dx / dist) * force * 2;
                p.vx -= (dx / dist) * force * 0.5;
                p.vy -= (dy / dist) * force * 0.5;
            }

            // Click burst radial push
            for (const burst of this.clickBursts) {
                const bdx = p.x - burst.x;
                const bdy = p.y - burst.y;
                const bDist = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
                if (bDist < 200) {
                    const bForce = (200 - bDist) / 200 * (burst.life / burst.maxLife) * 5;
                    p.vx += (bdx / bDist) * bForce;
                    p.vy += (bdy / bDist) * bForce;
                }
            }

            // Shockwave interaction
            if (system.shockwaves) {
                for (let si = 0; si < system.shockwaves.length; si++) {
                    const sw = system.shockwaves[si];
                    const sdx = p.x - sw.x;
                    const sdy = p.y - sw.y;
                    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                        const proximity = 1 - Math.abs(sDist - sw.radius) / 60;
                        const boost = proximity * sw.strength * 8;
                        p.vx += (sdx / sDist) * boost;
                        p.vy += (sdy / sDist) * boost;
                    }
                }
            }

            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;
            p.vx *= this.friction;
            p.vy *= this.friction;

            p.life -= 1 * system.speedMultiplier;
            p.hue += p.hueShift * system.speedMultiplier;

            // Respawn
            if (p.life <= 0 || p.x < -50 || p.x > system.width + 50 || p.y < -50 || p.y > system.height + 50) {
                p.x = system.rng() * system.width;
                p.y = system.rng() * system.height;
                p.vx = 0;
                p.vy = 0;
                p.life = p.maxLife;
                p.hue = p.baseHue;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const isWarp = system.speedMultiplier > 5;
        const qualityScale = system.qualityScale || 1;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        const headPath = new Path2D();
        // Batch glow circles by collecting them, then draw with single fillStyle
        const glowParticles = [];

        for (let pi = 0; pi < this.particles.length; pi++) {
            const p = this.particles[pi];
            if (p.life <= 0) continue;

            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const color = this._getParticleColor(p, speed);

            // Trail: use solid color instead of per-particle gradient
            let trailMultiplier = this.trailLengthMult;
            if (isWarp) trailMultiplier *= 2.5;
            const length = Math.min(isWarp ? 120 : 50, speed * trailMultiplier);

            const trailEndX = p.x - (p.vx / (speed || 1)) * length;
            const trailEndY = p.y - (p.vy / (speed || 1)) * length;

            // Draw trail as solid stroked line (no gradient creation)
            ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
            ctx.lineWidth = p.size * (p.life / p.maxLife);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.stroke();

            // Warp bright core trail
            if (isWarp && speed > 5) {
                const warpAlpha = Math.min(0.4, (speed - 5) * 0.04) * (p.life / p.maxLife);
                ctx.strokeStyle = `hsla(${color.h}, 100%, 85%, ${warpAlpha})`;
                ctx.lineWidth = p.size * (p.life / p.maxLife) * 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(trailEndX, trailEndY);
                ctx.stroke();
            }

            // Collect glow particles (only when fast + quality allows)
            if (speed > this.glowThreshold && qualityScale > 0.5) {
                glowParticles.push(p);
            }

            // Batched head glow
            const headSize = (p.size / 2) * (p.life / p.maxLife);
            headPath.moveTo(p.x + headSize, p.y);
            headPath.arc(p.x, p.y, headSize, 0, Math.PI * 2);
        }

        // Draw glow halos — use single fillStyle with averaged hue instead of per-particle gradient
        if (glowParticles.length > 0) {
            for (const p of glowParticles) {
                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                const alpha = Math.min(0.25, (speed - this.glowThreshold) * 0.05) * (p.life / p.maxLife);
                const h = ((p.hue % 360) + 360) % 360;
                const glowRadius = p.size * 3;
                // Simple filled circle instead of radial gradient
                ctx.fillStyle = `hsla(${h}, 90%, 70%, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Head glow
        ctx.fillStyle = `hsla(${system.hue}, 90%, 70%, 0.6)`;
        ctx.fill(headPath);

        // Draw click burst rings
        for (const burst of this.clickBursts) {
            const progress = 1 - burst.life / burst.maxLife;
            const radius = progress * 200;
            ctx.strokeStyle = `hsla(${system.hue}, 80%, 70%, ${(1 - progress) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw attractor indicators (subtle)
        if (this.attractors.length > 0 && qualityScale > 0.5) {
            for (const att of this.attractors) {
                ctx.fillStyle = `hsla(${system.hue}, 60%, 50%, 0.03)`;
                ctx.beginPath();
                ctx.arc(att.x, att.y, att.radius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
