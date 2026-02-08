/**
 * @file flow_architecture.js
 * @description Defines the Flow architecture with vector field and color wisps.
 * Enhanced with hue shifting, speed-based glow, vortex gravity wells, shockwave bursts,
 * and longer warp trails.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FlowArchitecture extends Architecture {
    constructor() {
        super();
        this.particles = [];
        this.numParticles = 150;
        this.field = [];
        this.cols = 0;
        this.rows = 0;
        this.cellSize = 100;
    }

    init(system) {
        this.cols = Math.ceil(system.width / this.cellSize) + 1;
        this.rows = Math.ceil(system.height / this.cellSize) + 1;
        this.field = new Array(this.cols * this.rows);
        this.generateField(system);

        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: 0,
                vy: 0,
                life: system.rng() * 100 + 50,
                maxLife: 150,
                hue: system.hue + (system.rng() - 0.5) * 60,
                baseHue: system.hue + (system.rng() - 0.5) * 60,
                hueShift: (system.rng() - 0.5) * 0.5, // slow hue drift per frame
                size: system.rng() * 3 + 2
            });
        }
    }

    generateField(system) {
        for (let i = 0; i < this.field.length; i++) {
            const angle = system.rng() * Math.PI * 2;
            this.field[i] = { x: Math.cos(angle), y: Math.sin(angle) };
        }
    }

    update(system) {
        // Update field slightly over time for dynamic flow
        for (let i = 0; i < this.field.length; i++) {
             const angle = (system.tick * 0.002 + i * 0.1) % (Math.PI * 2);
             this.field[i].x += Math.cos(angle) * 0.05;
             this.field[i].y += Math.sin(angle) * 0.05;
             const len = Math.sqrt(this.field[i].x**2 + this.field[i].y**2) || 1;
             this.field[i].x /= len;
             this.field[i].y /= len;
        }

        const mx = mouse.x;
        const my = mouse.y;

        this.particles.forEach(p => {
            const c = Math.max(0, Math.min(this.cols - 1, Math.floor(p.x / this.cellSize)));
            const r = Math.max(0, Math.min(this.rows - 1, Math.floor(p.y / this.cellSize)));
            const idx = r * this.cols + c;

            if (this.field[idx]) {
                p.vx += this.field[idx].x * 0.4;
                p.vy += this.field[idx].y * 0.4;
            }

            // Mouse influence
            const dx = p.x - mx;
            const dy = p.y - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell) {
                // Dramatic spiral vortex: much stronger swirl and pull
                if (distSq < 160000) { // 400px radius
                    const dist = Math.sqrt(distSq) || 1;
                    const force = (400 - dist) / 400;
                    // Strong swirl (6x normal)
                    p.vx += (dy / dist) * force * 6;
                    p.vy -= (dx / dist) * force * 6;
                    // Strong inward pull
                    p.vx -= (dx / dist) * force * 2.0;
                    p.vy -= (dy / dist) * force * 2.0;
                }
            } else if (distSq < 40000) { // 200px radius - normal vortex
                const dist = Math.sqrt(distSq) || 1;
                const force = (200 - dist) / 200;
                // Swirl around mouse
                p.vx += (dy / dist) * force * 2;
                p.vy -= (dx / dist) * force * 2;
                // Slight attraction
                p.vx -= (dx / dist) * force * 0.5;
                p.vy -= (dy / dist) * force * 0.5;
            }

            // Shockwave interaction: velocity boost outward
            if (system.shockwaves) {
                system.shockwaves.forEach(sw => {
                    const sdx = p.x - sw.x;
                    const sdy = p.y - sw.y;
                    const sDistSq = sdx * sdx + sdy * sdy;
                    const sDist = Math.sqrt(sDistSq);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                        const proximity = 1 - Math.abs(sDist - sw.radius) / 60;
                        const boost = proximity * sw.strength * 8;
                        p.vx += (sdx / sDist) * boost;
                        p.vy += (sdy / sDist) * boost;
                    }
                });
            }

            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;

            // Apply friction
            p.vx *= 0.92;
            p.vy *= 0.92;

            p.life -= 1 * system.speedMultiplier;

            // Hue slowly shifts over lifetime
            p.hue += p.hueShift * system.speedMultiplier;

            // Respawn if dead or out of bounds
            if (p.life <= 0 || p.x < -50 || p.x > system.width + 50 || p.y < -50 || p.y > system.height + 50) {
                p.x = system.rng() * system.width;
                p.y = system.rng() * system.height;
                p.vx = 0;
                p.vy = 0;
                p.life = p.maxLife;
                p.hue = p.baseHue; // reset hue on respawn
            }
        });
    }

    draw(system) {
        const ctx = system.ctx;
        const isWarp = system.speedMultiplier > 5;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const headPath = new Path2D();

        this.particles.forEach(p => {
            const alpha = Math.max(0, p.life / p.maxLife);
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const h = ((p.hue % 360) + 360) % 360;

            // Trail length: longer when warp speed > 5
            let trailMultiplier = 8;
            if (isWarp) {
                trailMultiplier = 20; // much longer visible trails in warp
            }
            const length = Math.min(isWarp ? 120 : 50, speed * trailMultiplier);

            // Persistent glow behind fast-moving particles
            if (speed > 3) {
                const glowAlpha = Math.min(0.25, (speed - 3) * 0.05) * alpha;
                const glowRadius = p.size * 3;
                const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
                glowGrad.addColorStop(0, `hsla(${h}, 90%, 70%, ${glowAlpha})`);
                glowGrad.addColorStop(1, `hsla(${h}, 90%, 70%, 0)`);
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Trail gradient (alpha 0.6)
            const trailEndX = p.x - (p.vx / (speed || 1)) * length;
            const trailEndY = p.y - (p.vy / (speed || 1)) * length;
            const grad = ctx.createLinearGradient(p.x, p.y, trailEndX, trailEndY);
            grad.addColorStop(0, `hsla(${h}, 80%, 60%, ${alpha * 0.6})`);
            grad.addColorStop(1, 'transparent');

            ctx.strokeStyle = grad;
            ctx.lineWidth = p.size * alpha;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.stroke();

            // Warp: additional bright core trail
            if (isWarp && speed > 5) {
                const warpAlpha = Math.min(0.4, (speed - 5) * 0.04) * alpha;
                const warpGrad = ctx.createLinearGradient(p.x, p.y, trailEndX, trailEndY);
                warpGrad.addColorStop(0, `hsla(${h}, 100%, 85%, ${warpAlpha})`);
                warpGrad.addColorStop(1, 'transparent');
                ctx.strokeStyle = warpGrad;
                ctx.lineWidth = p.size * alpha * 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(trailEndX, trailEndY);
                ctx.stroke();
            }

            // Batched head glow
            const headSize = (p.size / 2) * alpha;
            headPath.moveTo(p.x + headSize, p.y);
            headPath.arc(p.x, p.y, headSize, 0, Math.PI * 2);
        });

        // Head glow brighter (alpha 0.6)
        ctx.fillStyle = `hsla(${system.hue}, 90%, 70%, 0.6)`;
        ctx.fill(headPath);

        ctx.restore();
    }
}
