/**
 * @file swarm_architecture.js
 * @description Emergent flocking behavior with multiple seed-driven species.
 *   Each species has unique color, size, speed, and behavior (chase, flee, orbit).
 *   Mouse interaction attracts/repels swarms. Visually rich with trails and glow.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class SwarmArchitecture extends Architecture {
    constructor() {
        super();
        this.species = [];
        this.boids = [];
        this.tick = 0;
        this._trailCanvas = null;
        this._trailCtx = null;
        this.fadeFactor = 0.05;
        this.mouseInfluence = 0;
    }

    init(system) {
        const rng = system.rng;
        this.tick = 0;
        this.fadeFactor = 0.03 + rng() * 0.06;
        this.mouseInfluence = 80 + rng() * 200;

        // Generate 2-5 species with unique traits
        const numSpecies = 2 + Math.floor(rng() * 4);
        this.species = [];
        for (let i = 0; i < numSpecies; i++) {
            this.species.push({
                id: i,
                hue: (system.hue + i * (360 / numSpecies) + rng() * 30) % 360,
                sat: 60 + rng() * 35,
                light: 50 + rng() * 25,
                size: 2 + rng() * 5,
                maxSpeed: 1.5 + rng() * 3,
                cohesion: 0.002 + rng() * 0.008,
                separation: 15 + rng() * 25,
                alignment: 0.03 + rng() * 0.07,
                visualRange: 60 + rng() * 80,
                trailAlpha: 0.3 + rng() * 0.5,
                shape: rng() > 0.5 ? 'circle' : 'triangle',
                glowSize: rng() > 0.6 ? 6 + rng() * 10 : 0,
                // Inter-species behavior: -1 flee, 0 ignore, 1 chase
                reactions: []
            });
        }

        // Set up inter-species reactions
        for (let i = 0; i < numSpecies; i++) {
            this.species[i].reactions = [];
            for (let j = 0; j < numSpecies; j++) {
                if (i === j) {
                    this.species[i].reactions.push(0);
                } else {
                    const r = rng();
                    this.species[i].reactions.push(r < 0.3 ? -1 : r < 0.6 ? 0 : 1);
                }
            }
        }

        // Spawn boids
        const totalBoids = Math.min(350, 100 + Math.floor(rng() * 250));
        this.boids = [];
        for (let i = 0; i < totalBoids; i++) {
            const sp = this.species[Math.floor(rng() * numSpecies)];
            this.boids.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * sp.maxSpeed * 2,
                vy: (rng() - 0.5) * sp.maxSpeed * 2,
                species: sp.id,
                phase: rng() * Math.PI * 2
            });
        }

        // Trail canvas
        this._trailCanvas = document.createElement('canvas');
        this._trailCanvas.width = system.width;
        this._trailCanvas.height = system.height;
        this._trailCtx = this._trailCanvas.getContext('2d');
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;

        // Click spawns a burst of new boids at cursor
        if (system.speedMultiplier > 5 && this.tick % 8 === 0 && this.boids.length < 500) {
            const sp = this.species[Math.floor(system.rng() * this.species.length)];
            for (let k = 0; k < 5; k++) {
                const angle = system.rng() * Math.PI * 2;
                const speed = sp.maxSpeed * (0.5 + system.rng() * 0.5);
                this.boids.push({
                    x: mouse.x + (system.rng() - 0.5) * 20,
                    y: mouse.y + (system.rng() - 0.5) * 20,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    species: sp.id,
                    phase: system.rng() * Math.PI * 2,
                    _next: null, _idx: 0
                });
            }
        }

        // Build spatial grid for O(n) neighbor queries
        const cellSize = 150; // covers max visualRange
        const cols = Math.ceil(w / cellSize) || 1;
        const rows = Math.ceil(h / cellSize) || 1;
        const grid = new Array(cols * rows);
        for (let i = 0; i < grid.length; i++) grid[i] = null;
        // Insert boids into grid cells (linked-list style to avoid allocation)
        for (let i = 0; i < this.boids.length; i++) {
            const b = this.boids[i];
            const col = Math.min(cols - 1, Math.max(0, Math.floor(b.x / cellSize)));
            const row = Math.min(rows - 1, Math.max(0, Math.floor(b.y / cellSize)));
            const cell = row * cols + col;
            b._next = grid[cell];
            b._idx = i;
            grid[cell] = b;
        }

        for (let i = 0; i < this.boids.length; i++) {
            const b = this.boids[i];
            const sp = this.species[b.species];
            let cx = 0, cy = 0, cn = 0;
            let sx = 0, sy = 0;
            let ax = 0, ay = 0, an = 0;

            // Query neighbors from spatial grid
            const bCol = Math.min(cols - 1, Math.max(0, Math.floor(b.x / cellSize)));
            const bRow = Math.min(rows - 1, Math.max(0, Math.floor(b.y / cellSize)));
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = bRow + dr;
                    const nc = bCol + dc;
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                    let o = grid[nr * cols + nc];
                    while (o) {
                        if (o._idx !== i) {
                            const dx = o.x - b.x;
                            const dy = o.y - b.y;
                            const distSq = dx * dx + dy * dy;
                            const range = sp.visualRange;

                            if (distSq <= range * range) {
                                const dist = Math.sqrt(distSq);
                                if (o.species === b.species) {
                                    cx += o.x;
                                    cy += o.y;
                                    cn++;
                                    ax += o.vx;
                                    ay += o.vy;
                                    an++;
                                    if (dist < sp.separation) {
                                        sx -= dx / dist;
                                        sy -= dy / dist;
                                    }
                                } else {
                                    const reaction = sp.reactions[o.species];
                                    if (reaction !== 0 && distSq < (range * 0.8) * (range * 0.8)) {
                                        const force = reaction * 0.02;
                                        b.vx += (dx / dist) * force;
                                        b.vy += (dy / dist) * force;
                                    }
                                }
                            }
                        }
                        o = o._next;
                    }
                }
            }

            // Apply flocking forces
            if (cn > 0) {
                b.vx += (cx / cn - b.x) * sp.cohesion;
                b.vy += (cy / cn - b.y) * sp.cohesion;
            }
            b.vx += sx * 0.05;
            b.vy += sy * 0.05;
            if (an > 0) {
                b.vx += (ax / an - b.vx) * sp.alignment;
                b.vy += (ay / an - b.vy) * sp.alignment;
            }

            // Mouse influence
            const mdx = mouse.x - b.x;
            const mdy = mouse.y - b.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < this.mouseInfluence && mDist > 1) {
                const mForce = system.isGravityWell ? -0.3 : 0.1;
                b.vx += (mdx / mDist) * mForce;
                b.vy += (mdy / mDist) * mForce;
            }

            // Speed limit
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed > sp.maxSpeed) {
                b.vx = (b.vx / speed) * sp.maxSpeed;
                b.vy = (b.vy / speed) * sp.maxSpeed;
            }

            b.x += b.vx;
            b.y += b.vy;

            // Wrap edges
            if (b.x < 0) b.x += w;
            if (b.x > w) b.x -= w;
            if (b.y < 0) b.y += h;
            if (b.y > h) b.y -= h;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tctx = this._trailCtx;

        // Resize trail canvas if needed
        if (tctx && (this._trailCanvas.width !== system.width || this._trailCanvas.height !== system.height)) {
            this._trailCanvas.width = system.width;
            this._trailCanvas.height = system.height;
        }

        // Fade trail
        if (tctx) {
            tctx.fillStyle = `rgba(0,0,0,${this.fadeFactor})`;
            tctx.fillRect(0, 0, system.width, system.height);

            // Draw boid trails
            tctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < this.boids.length; i++) {
                const b = this.boids[i];
                const sp = this.species[b.species];
                tctx.fillStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light}%, ${sp.trailAlpha * 0.3})`;
                tctx.beginPath();
                tctx.arc(b.x, b.y, sp.size * 0.6, 0, Math.PI * 2);
                tctx.fill();
            }
            tctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(this._trailCanvas, 0, 0);
        }

        // Draw boids grouped by species to minimize state changes
        ctx.globalCompositeOperation = 'lighter';
        for (let s = 0; s < this.species.length; s++) {
            const sp = this.species[s];
            // Set shadow once per species (cheaper than per-boid radial gradients)
            if (sp.glowSize > 0) {
                ctx.shadowBlur = sp.glowSize;
                ctx.shadowColor = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light}%, 0.5)`;
            } else {
                ctx.shadowBlur = 0;
            }

            for (let i = 0; i < this.boids.length; i++) {
                const b = this.boids[i];
                if (b.species !== s) continue;
                const pulse = 0.8 + Math.sin(this.tick * 0.05 + b.phase) * 0.2;

                ctx.fillStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light}%, ${0.7 + pulse * 0.3})`;
                if (sp.shape === 'triangle') {
                    const angle = Math.atan2(b.vy, b.vx);
                    const sz = sp.size * pulse;
                    ctx.beginPath();
                    ctx.moveTo(b.x + Math.cos(angle) * sz * 2, b.y + Math.sin(angle) * sz * 2);
                    ctx.lineTo(b.x + Math.cos(angle + 2.5) * sz, b.y + Math.sin(angle + 2.5) * sz);
                    ctx.lineTo(b.x + Math.cos(angle - 2.5) * sz, b.y + Math.sin(angle - 2.5) * sz);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, sp.size * pulse, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
