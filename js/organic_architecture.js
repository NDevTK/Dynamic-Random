/**
 * @file organic_architecture.js
 * @description Defines the Organic architecture with pulsing tendrils and cells.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class OrganicArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.cells = [];
        this.spores = [];
        this.sporePool = [];
    }

    init(system) {
        this.nodes = [];
        const nodeCount = 25;
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                radius: system.rng() * 40 + 20,
                pulseOffset: system.rng() * Math.PI * 2,
                hue: system.hue + (system.rng() - 0.5) * 60,
                glowBoost: 0
            });
        }

        this.cells = [];
        const cellCount = 40;
        for (let i = 0; i < cellCount; i++) {
            this.cells.push({
                x: system.rng() * system.width,
                y: system.rng() * system.height,
                vx: (system.rng() - 0.5) * 2,
                vy: (system.rng() - 0.5) * 2,
                radius: system.rng() * 12 + 6,
                hue: system.hue + (system.rng() - 0.5) * 40,
                noiseOffset: system.rng() * 1000
            });
        }

        this.spores = [];
        this.sporePool = [];
    }

    _allocSpore() {
        if (this.sporePool.length > 0) {
            return this.sporePool.pop();
        }
        return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, radius: 0, hue: 0 };
    }

    _freeSpore(spore) {
        this.sporePool.push(spore);
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;

        // --- Cell updates ---
        this.cells.forEach(c => {
            // Brownian motion
            c.vx += (system.rng() - 0.5) * 0.2;
            c.vy += (system.rng() - 0.5) * 0.2;

            c.x += c.vx * system.speedMultiplier;
            c.y += c.vy * system.speedMultiplier;

            // Wrap
            if (c.x < -c.radius) c.x = system.width + c.radius;
            else if (c.x > system.width + c.radius) c.x = -c.radius;
            if (c.y < -c.radius) c.y = system.height + c.radius;
            else if (c.y > system.height + c.radius) c.y = -c.radius;

            // Mouse reaction
            const dx = c.x - mx;
            const dy = c.y - my;
            const distSq = dx * dx + dy * dy;

            if (system.isGravityWell) {
                // Gravity well: cells flee dramatically
                if (distSq < 90000) { // 300px radius
                    const dist = Math.sqrt(distSq);
                    if (dist > 1) {
                        const force = (300 - dist) / 300;
                        c.vx += (dx / dist) * force * 3;
                        c.vy += (dy / dist) * force * 3;
                    }
                }
            } else if (distSq < 22500) { // 150px
                const dist = Math.sqrt(distSq);
                const force = (150 - dist) / 150;
                c.vx += (dx / dist) * force * 0.5;
                c.vy += (dy / dist) * force * 0.5;
            }

            // Shockwave response: cells scatter when hit by shockwave ring
            if (system.shockwaves) {
                system.shockwaves.forEach(sw => {
                    const sdx = c.x - sw.x;
                    const sdy = c.y - sw.y;
                    const sDistSq = sdx * sdx + sdy * sdy;
                    const sDist = Math.sqrt(sDistSq);
                    if (sDist > 1 && Math.abs(sDist - sw.radius) < 60) {
                        const push = (1 - Math.abs(sDist - sw.radius) / 60) * sw.strength;
                        c.vx += (sdx / sDist) * push * 8;
                        c.vy += (sdy / sDist) * push * 8;
                    }
                });
            }

            c.vx *= 0.95;
            c.vy *= 0.95;
        });

        // --- Node updates ---
        this.nodes.forEach(n => {
            n.x += Math.sin(system.tick * 0.005 + n.pulseOffset) * 0.2 * system.speedMultiplier;
            n.y += Math.cos(system.tick * 0.005 + n.pulseOffset) * 0.2 * system.speedMultiplier;

            // Gravity well: nodes pulse brighter
            if (system.isGravityWell) {
                const dx = n.x - mx;
                const dy = n.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 400) {
                    n.glowBoost = Math.min(1, n.glowBoost + 0.1);
                } else {
                    n.glowBoost *= 0.95;
                }
            } else {
                n.glowBoost *= 0.95;
            }

            // Emit spore particles (2-3 per node, throttled)
            if (system.tick % 8 === 0 && this.spores.length < 100) {
                const count = Math.floor(system.rng() * 2) + 2; // 2-3 spores
                for (let i = 0; i < count; i++) {
                    if (this.spores.length >= 100) break;
                    const spore = this._allocSpore();
                    const angle = system.rng() * Math.PI * 2;
                    const speed = system.rng() * 0.5 + 0.2;
                    spore.x = n.x + (system.rng() - 0.5) * n.radius;
                    spore.y = n.y + (system.rng() - 0.5) * n.radius;
                    spore.vx = Math.cos(angle) * speed;
                    spore.vy = Math.sin(angle) * speed;
                    spore.life = 0;
                    spore.maxLife = 40 + Math.floor(system.rng() * 40);
                    spore.radius = system.rng() * 1.5 + 0.5;
                    spore.hue = n.hue + (system.rng() - 0.5) * 30;
                    this.spores.push(spore);
                }
            }
        });

        // --- Spore updates ---
        for (let i = this.spores.length - 1; i >= 0; i--) {
            const s = this.spores[i];
            s.x += s.vx * system.speedMultiplier;
            s.y += s.vy * system.speedMultiplier;
            s.vx *= 0.98;
            s.vy *= 0.98;
            s.life++;
            if (s.life >= s.maxLife) {
                this._freeSpore(s);
                this.spores.splice(i, 1);
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // --- Tendrils ---
        ctx.strokeStyle = `hsla(${system.hue}, 50%, 30%, 0.35)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        const tendrilPath = new Path2D();
        for (let i = 0; i < this.nodes.length; i++) {
            const n1 = this.nodes[i];
            for (let j = i + 1; j < this.nodes.length; j++) {
                const n2 = this.nodes[j];
                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                if (dx * dx + dy * dy < 62500) { // 250px
                    const midX = (n1.x + n2.x) / 2 + Math.sin(tick * 0.01 + i) * 30;
                    const midY = (n1.y + n2.y) / 2 + Math.cos(tick * 0.01 + j) * 30;
                    tendrilPath.moveTo(n1.x, n1.y);
                    tendrilPath.quadraticCurveTo(midX, midY, n2.x, n2.y);
                }
            }
        }
        ctx.stroke(tendrilPath);

        // --- Nodes (Bioluminescent organs with glow) ---
        this.nodes.forEach(n => {
            const pulse = 1 + Math.sin(tick * 0.03 + n.pulseOffset) * 0.15;
            const boostedAlpha = 0.35 + n.glowBoost * 0.4;
            const r = n.radius * pulse;

            // Bioluminescent glow layer (additive blending)
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glowGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 1.5);
            glowGrad.addColorStop(0, `hsla(${n.hue}, 80%, 60%, ${boostedAlpha * 0.6})`);
            glowGrad.addColorStop(0.4, `hsla(${n.hue}, 70%, 50%, ${boostedAlpha * 0.3})`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Core radial gradient
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
            grad.addColorStop(0, `hsla(${n.hue}, 60%, 40%, ${boostedAlpha})`);
            grad.addColorStop(0.5, `hsla(${n.hue}, 60%, 40%, ${boostedAlpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- Spore particles ---
        this.spores.forEach(s => {
            const alpha = 1 - (s.life / s.maxLife);
            ctx.fillStyle = `hsla(${s.hue}, 70%, 60%, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- Cells ---
        this.cells.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(Math.atan2(c.vy, c.vx));

            // Cell Body
            ctx.fillStyle = `hsla(${c.hue}, 60%, 50%, 0.5)`;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.radius, c.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cell membrane highlight (thin bright border ring)
            ctx.strokeStyle = `hsla(${c.hue}, 80%, 70%, 0.6)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.radius, c.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Nucleus
            ctx.fillStyle = `hsla(${c.hue}, 80%, 30%, 0.7)`;
            ctx.beginPath();
            const nX = Math.sin(tick * 0.05 + c.noiseOffset) * (c.radius * 0.2);
            ctx.arc(nX, 0, c.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }
}
