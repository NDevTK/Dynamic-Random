/**
 * @file mycelium_architecture.js
 * @description Mycelium/fungal network architecture with growing tendrils that branch,
 * connect, and pulse with bioluminescent light. The network grows toward the cursor
 * and produces spore bursts on interaction.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class MyceliumArchitecture extends Architecture {
    constructor() {
        super();
        this.nodes = [];
        this.connections = [];
        this.spores = [];
        this.sporePool = [];
        this.growthPoints = [];
        this.pulseWaves = [];
        this.nutrientGlow = [];
        this.growthTimer = 0;
        this.maxNodes = 300;
        this.palette = [];
        this.glowStyle = 0;
        this.branchAngle = 0;
    }

    init(system) {
        const rng = system.rng;

        // Seed-driven mycelium style
        this.glowStyle = Math.floor(rng() * 4);
        this.branchAngle = 0.3 + rng() * 0.8;
        const branchiness = 0.15 + rng() * 0.25;

        // Color palettes for bioluminescence
        const palettes = [
            // Ghost fungus (blue-green)
            [{ h: 160, s: 80, l: 60 }, { h: 180, s: 70, l: 50 }, { h: 140, s: 60, l: 55 }],
            // Foxfire (yellow-green)
            [{ h: 80, s: 90, l: 55 }, { h: 100, s: 80, l: 50 }, { h: 60, s: 85, l: 60 }],
            // Deep violet mycena
            [{ h: 280, s: 75, l: 55 }, { h: 300, s: 70, l: 50 }, { h: 260, s: 80, l: 45 }],
            // Warm amber (honey fungus)
            [{ h: 30, s: 90, l: 55 }, { h: 45, s: 85, l: 50 }, { h: 15, s: 80, l: 45 }],
            // Alien pink
            [{ h: 330, s: 85, l: 55 }, { h: 350, s: 75, l: 50 }, { h: 310, s: 80, l: 60 }]
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        // Seed initial growth points (origin nodes)
        this.nodes = [];
        this.connections = [];
        const originCount = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < originCount; i++) {
            const node = {
                x: rng() * system.width,
                y: rng() * system.height,
                size: 3 + rng() * 4,
                energy: 1.0,
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.02 + rng() * 0.03,
                isOrigin: true,
                age: 0,
                connections: 0
            };
            this.nodes.push(node);
            this.growthPoints.push({
                nodeIndex: this.nodes.length - 1,
                angle: rng() * Math.PI * 2,
                energy: 0.8 + rng() * 0.2,
                branchChance: branchiness
            });
        }

        // Pre-grow the network
        for (let step = 0; step < 150; step++) {
            this._growStep(system);
        }

        this.spores = [];
        this.sporePool = [];
        this.pulseWaves = [];
        this.nutrientGlow = [];
    }

    _growStep(system) {
        const rng = system.rng;
        if (this.nodes.length >= this.maxNodes || this.growthPoints.length === 0) return;

        const newGrowthPoints = [];

        for (let gi = this.growthPoints.length - 1; gi >= 0; gi--) {
            const gp = this.growthPoints[gi];
            const parent = this.nodes[gp.nodeIndex];
            if (!parent || gp.energy <= 0.05) {
                this.growthPoints.splice(gi, 1);
                continue;
            }

            // Grow in current direction with some randomness
            const angle = gp.angle + (rng() - 0.5) * this.branchAngle;
            const growLen = 15 + rng() * 25;
            const nx = parent.x + Math.cos(angle) * growLen;
            const ny = parent.y + Math.sin(angle) * growLen;

            // Check if too close to existing node (merge instead)
            let merged = false;
            for (let ni = 0; ni < this.nodes.length; ni++) {
                if (ni === gp.nodeIndex) continue;
                const n = this.nodes[ni];
                const dx = n.x - nx;
                const dy = n.y - ny;
                if (dx * dx + dy * dy < 400) {
                    // Connect to existing node
                    this.connections.push({
                        from: gp.nodeIndex, to: ni,
                        thickness: 0.5 + gp.energy * 2,
                        pulsePhase: rng() * Math.PI * 2
                    });
                    parent.connections++;
                    n.connections++;
                    merged = true;
                    break;
                }
            }

            if (!merged && this.nodes.length < this.maxNodes) {
                const newNode = {
                    x: nx, y: ny,
                    size: 1.5 + gp.energy * 3,
                    energy: gp.energy * 0.9,
                    pulsePhase: rng() * Math.PI * 2,
                    pulseSpeed: 0.02 + rng() * 0.03,
                    isOrigin: false,
                    age: 0,
                    connections: 1
                };
                this.nodes.push(newNode);
                const newIdx = this.nodes.length - 1;

                this.connections.push({
                    from: gp.nodeIndex, to: newIdx,
                    thickness: 0.5 + gp.energy * 2,
                    pulsePhase: rng() * Math.PI * 2
                });
                parent.connections++;

                // Continue growing from new node
                gp.nodeIndex = newIdx;
                gp.angle = angle;
                gp.energy *= 0.92;

                // Branch?
                if (rng() < gp.branchChance && this.growthPoints.length < 30) {
                    const branchAngle = angle + (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 1.0);
                    newGrowthPoints.push({
                        nodeIndex: newIdx,
                        angle: branchAngle,
                        energy: gp.energy * 0.7,
                        branchChance: gp.branchChance * 0.8
                    });
                }
            } else {
                gp.energy = 0; // Stop growing if merged or full
            }
        }

        this.growthPoints.push(...newGrowthPoints);
    }

    update(system) {
        this.growthTimer++;
        const mx = mouse.x;
        const my = mouse.y;

        // Slow continued growth toward mouse
        if (this.growthTimer % 20 === 0 && this.nodes.length < this.maxNodes) {
            // Find closest node to mouse
            let closestDist = Infinity;
            let closestIdx = -1;
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                const dx = n.x - mx;
                const dy = n.y - my;
                const d = dx * dx + dy * dy;
                if (d < closestDist && n.connections < 4) {
                    closestDist = d;
                    closestIdx = i;
                }
            }
            if (closestIdx >= 0 && closestDist > 900 && closestDist < 90000) {
                const angle = Math.atan2(my - this.nodes[closestIdx].y, mx - this.nodes[closestIdx].x);
                this.growthPoints.push({
                    nodeIndex: closestIdx,
                    angle: angle + (system.rng() - 0.5) * 0.5,
                    energy: 0.5,
                    branchChance: 0.15
                });
            }
            this._growStep(system);
        }

        // Pulse waves from mouse proximity
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            n.age++;
            const dx = n.x - mx;
            const dy = n.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 22500) {
                n.energy = Math.min(1, n.energy + 0.02);
            } else {
                n.energy = Math.max(0.1, n.energy - 0.002);
            }
        }

        // Shockwave creates spore bursts
        system.shockwaves.forEach(sw => {
            if (sw.radius < 30) {
                for (let i = 0; i < 15; i++) {
                    this._spawnSpore(system, sw.x + (system.rng() - 0.5) * 40, sw.y + (system.rng() - 0.5) * 40);
                }
            }
            // Pulse energy along network from shockwave
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                const dx = n.x - sw.x;
                const dy = n.y - sw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (Math.abs(dist - sw.radius) < 50) {
                    n.energy = Math.min(1, n.energy + 0.3 * sw.alpha);
                }
            }
        });

        // Gravity well creates spore vortex
        if (system.isGravityWell) {
            if (system.tick % 3 === 0) {
                this._spawnSpore(system, mx + (system.rng() - 0.5) * 80, my + (system.rng() - 0.5) * 80);
            }
        }

        // Update spores
        for (let i = this.spores.length - 1; i >= 0; i--) {
            const s = this.spores[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy -= 0.02; // Float upward
            s.vx += (system.rng() - 0.5) * 0.3;
            s.vx *= 0.99;
            s.vy *= 0.99;
            s.life -= s.decay;

            if (system.isGravityWell) {
                const dx = mx - s.x;
                const dy = my - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 20 && dist < 300) {
                    s.vx += (dx / dist) * 0.5;
                    s.vy += (dy / dist) * 0.5;
                }
            }

            if (s.life <= 0) {
                this.sporePool.push(s);
                this.spores[i] = this.spores[this.spores.length - 1];
                this.spores.pop();
            }
        }

        // Ambient spore emission from high-energy nodes
        if (system.tick % 15 === 0) {
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                if (n.energy > 0.7 && system.rng() < 0.1 && n.isOrigin) {
                    this._spawnSpore(system, n.x, n.y);
                }
            }
        }
    }

    _spawnSpore(system, x, y) {
        if (this.spores.length >= 100) return;
        const rng = system.rng;
        let s = this.sporePool.length > 0 ? this.sporePool.pop() : {};
        s.x = x;
        s.y = y;
        s.vx = (rng() - 0.5) * 2;
        s.vy = (rng() - 0.5) * 2 - 0.5;
        s.life = 1.0;
        s.decay = 0.008 + rng() * 0.015;
        s.size = 1 + rng() * 3;
        s.color = this.palette[Math.floor(rng() * this.palette.length)];
        this.spores.push(s);
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;

        // Draw connections (mycelium threads)
        for (let i = 0; i < this.connections.length; i++) {
            const conn = this.connections[i];
            const from = this.nodes[conn.from];
            const to = this.nodes[conn.to];
            if (!from || !to) continue;

            const avgEnergy = (from.energy + to.energy) * 0.5;
            const pulse = Math.sin(tick * 0.03 + conn.pulsePhase) * 0.3 + 0.7;
            const color = this.palette[0];

            ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${0.05 + avgEnergy * 0.15 * pulse})`;
            ctx.lineWidth = conn.thickness * (0.5 + avgEnergy * 0.5);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);

            // Slight curve for organic feel
            const midX = (from.x + to.x) * 0.5 + Math.sin(tick * 0.01 + i) * 5;
            const midY = (from.y + to.y) * 0.5 + Math.cos(tick * 0.01 + i) * 5;
            ctx.quadraticCurveTo(midX, midY, to.x, to.y);
            ctx.stroke();

            // Nutrient pulse traveling along connection
            if (avgEnergy > 0.5 && tick % 4 === 0) {
                const t = (Math.sin(tick * 0.05 + conn.pulsePhase) * 0.5 + 0.5);
                const px = from.x + (to.x - from.x) * t;
                const py = from.y + (to.y - from.y) * t;
                ctx.fillStyle = `hsla(${color.h}, ${color.s + 10}%, ${color.l + 20}%, ${avgEnergy * 0.3})`;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw nodes
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            const pulse = Math.sin(tick * n.pulseSpeed + n.pulsePhase) * 0.3 + 0.7;
            const color = this.palette[n.isOrigin ? 1 : 0];
            const glowSize = n.size * (2 + n.energy * 3) * pulse;

            // Bioluminescent glow
            if (n.energy > 0.2 || n.isOrigin) {
                const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowSize);
                grad.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l + 10}%, ${n.energy * 0.3 * pulse})`);
                grad.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${n.energy * 0.1 * pulse})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(n.x, n.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Node core
            ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 20}%, ${0.3 + n.energy * 0.5})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size * (0.5 + n.energy * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw spores
        for (let i = 0; i < this.spores.length; i++) {
            const s = this.spores[i];
            const { h, s: sat, l } = s.color;
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
            grad.addColorStop(0, `hsla(${h}, ${sat}%, ${l + 15}%, ${s.life * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `hsla(${h}, ${sat}%, ${l + 30}%, ${s.life * 0.8})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
