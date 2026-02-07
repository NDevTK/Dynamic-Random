/**
 * @file flow_architecture.js
 * @description Defines the Flow architecture with vector field and color wisps.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class FlowArchitecture extends Architecture {
    constructor() {
        super();
        this.particles = [];
        this.numParticles = 120;
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

            // Mouse influence: Vortex effect
            const dx = p.x - mx;
            const dy = p.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000) { // 200px radius
                const dist = Math.sqrt(distSq) || 1;
                const force = (200 - dist) / 200;
                // Swirl around mouse
                p.vx += (dy / dist) * force * 2;
                p.vy -= (dx / dist) * force * 2;
                // Slight attraction
                p.vx -= (dx / dist) * force * 0.5;
                p.vy -= (dy / dist) * force * 0.5;
            }

            p.x += p.vx * system.speedMultiplier;
            p.y += p.vy * system.speedMultiplier;

            // Apply friction
            p.vx *= 0.92;
            p.vy *= 0.92;

            p.life -= 1 * system.speedMultiplier;

            // Respawn if dead or out of bounds
            if (p.life <= 0 || p.x < -50 || p.x > system.width + 50 || p.y < -50 || p.y > system.height + 50) {
                p.x = system.rng() * system.width;
                p.y = system.rng() * system.height;
                p.vx = 0;
                p.vy = 0;
                p.life = p.maxLife;
            }
        });
    }

    draw(system) {
        const ctx = system.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const headPath = new Path2D();

        this.particles.forEach(p => {
            const alpha = Math.max(0, p.life / p.maxLife);

            // Brush stroke effect
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const length = Math.min(50, speed * 8);

            const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 5, p.y - p.vy * 5);
            grad.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${alpha * 0.4})`);
            grad.addColorStop(1, 'transparent');

            ctx.strokeStyle = grad;
            ctx.lineWidth = p.size * alpha;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - (p.vx / speed || 0) * length, p.y - (p.vy / speed || 0) * length);
            ctx.stroke();

            // Batched head glow
            const headSize = (p.size / 2) * alpha;
            headPath.moveTo(p.x + headSize, p.y);
            headPath.arc(p.x, p.y, headSize, 0, Math.PI * 2);
        });

        ctx.fillStyle = `hsla(${system.hue}, 90%, 70%, 0.4)`;
        ctx.fill(headPath);

        ctx.restore();
    }
}
