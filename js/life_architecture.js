/**
 * @file life_architecture.js
 * @description Artificial particle life simulation. Multiple colored species of particles
 * interact via seed-generated attraction/repulsion rules, creating emergent flocking,
 * orbiting, chasing, and clustering behaviors. Each seed produces a completely different
 * ecosystem with unique dynamics. Mouse interaction injects energy or creates barriers.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class LifeArchitecture extends Architecture {
    constructor() {
        super();
        this.particles = [];
        this.rules = [];
        this.species = [];
        this.speciesCount = 0;
        this.trailCanvas = null;
        this.trailCtx = null;
        this.trailFade = 0;
        this.worldStyle = 0;
    }

    init(system) {
        const rng = system.rng;

        // Number of species (3-6, heavily changes dynamics)
        this.speciesCount = 3 + Math.floor(rng() * 4);

        // World style changes visual presentation
        this.worldStyle = Math.floor(rng() * 4);
        // 0 = glowing dots, 1 = connected webs, 2 = trail painters, 3 = ghostly wisps

        // Trail fade rate (higher = longer trails)
        this.trailFade = this.worldStyle === 2 ? 0.02 : 0.08;

        // Generate species colors - dramatically different per seed
        const hueBase = rng() * 360;
        const hueSpread = 60 + rng() * 240; // How spread out hues are
        this.species = [];
        for (let i = 0; i < this.speciesCount; i++) {
            const hue = (hueBase + (i / this.speciesCount) * hueSpread) % 360;
            const sat = 70 + rng() * 30;
            const light = 50 + rng() * 20;
            this.species.push({
                hue, sat, light,
                size: 1.5 + rng() * 2.5,
                count: 40 + Math.floor(rng() * 40)
            });
        }

        // Generate interaction rules matrix
        // rules[i][j] = how species i feels about species j
        // Positive = attraction, negative = repulsion
        this.rules = [];
        for (let i = 0; i < this.speciesCount; i++) {
            this.rules[i] = [];
            for (let j = 0; j < this.speciesCount; j++) {
                this.rules[i][j] = {
                    force: (rng() - 0.5) * 0.8,     // -0.4 to 0.4
                    radius: 60 + rng() * 140          // interaction range
                };
            }
        }

        // Spawn particles
        this.particles = [];
        for (let s = 0; s < this.speciesCount; s++) {
            const sp = this.species[s];
            for (let i = 0; i < sp.count; i++) {
                this.particles.push({
                    x: rng() * system.width,
                    y: rng() * system.height,
                    vx: (rng() - 0.5) * 2,
                    vy: (rng() - 0.5) * 2,
                    species: s
                });
            }
        }

        // Trail canvas for motion blur effect
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = system.width;
        this.trailCanvas.height = system.height;
        this.trailCtx = this.trailCanvas.getContext('2d', { alpha: true });
        this.trailCtx.clearRect(0, 0, system.width, system.height);
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const w = system.width;
        const h = system.height;
        const particles = this.particles;
        const rules = this.rules;
        const speed = system.speedMultiplier;
        const count = particles.length;

        // Use spatial bucketing for performance (grid-based neighbor search)
        const cellSize = 150;
        const cols = Math.ceil(w / cellSize);
        const rows = Math.ceil(h / cellSize);
        const grid = new Array(cols * rows);
        for (let i = 0; i < grid.length; i++) grid[i] = [];

        for (let i = 0; i < count; i++) {
            const p = particles[i];
            const cx = Math.floor(p.x / cellSize);
            const cy = Math.floor(p.y / cellSize);
            if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                grid[cy * cols + cx].push(i);
            }
        }

        // Compute forces
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            let fx = 0, fy = 0;

            const cx = Math.floor(p.x / cellSize);
            const cy = Math.floor(p.y / cellSize);

            // Check neighboring cells
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
                    const cell = grid[ny * cols + nx];

                    for (let j = 0; j < cell.length; j++) {
                        const qi = cell[j];
                        if (qi === i) continue;
                        const q = particles[qi];

                        const ddx = q.x - p.x;
                        const ddy = q.y - p.y;
                        const distSq = ddx * ddx + ddy * ddy;
                        const rule = rules[p.species][q.species];
                        const maxR = rule.radius;

                        if (distSq > maxR * maxR || distSq < 1) continue;

                        const dist = Math.sqrt(distSq);

                        // Repulsion at very close range, then force curve
                        let force;
                        if (dist < 20) {
                            force = -0.5 * (20 - dist) / 20; // Hard repulsion
                        } else {
                            const normalDist = (dist - 20) / (maxR - 20);
                            force = rule.force * (1 - normalDist);
                        }

                        fx += (ddx / dist) * force;
                        fy += (ddy / dist) * force;
                    }
                }
            }

            // Mouse interaction
            const mdx = mx - p.x;
            const mdy = my - p.y;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < 40000 && mDistSq > 1) {
                const mDist = Math.sqrt(mDistSq);
                const mForce = (200 - mDist) / 200;
                if (system.isGravityWell) {
                    // Gravity well sucks all species in
                    fx += (mdx / mDist) * mForce * 2;
                    fy += (mdy / mDist) * mForce * 2;
                } else if (speed > 2) {
                    // Left click: repel and scatter
                    fx -= (mdx / mDist) * mForce * 3;
                    fy -= (mdy / mDist) * mForce * 3;
                }
            }

            // Apply forces
            p.vx = (p.vx + fx) * 0.95;
            p.vy = (p.vy + fy) * 0.95;

            // Speed cap
            const spd = p.vx * p.vx + p.vy * p.vy;
            if (spd > 25) {
                const scale = 5 / Math.sqrt(spd);
                p.vx *= scale;
                p.vy *= scale;
            }

            p.x += p.vx * speed;
            p.y += p.vy * speed;

            // Wrap around edges
            if (p.x < 0) p.x += w;
            else if (p.x >= w) p.x -= w;
            if (p.y < 0) p.y += h;
            else if (p.y >= h) p.y -= h;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const particles = this.particles;
        const species = this.species;
        const style = this.worldStyle;

        // Fade the trail canvas
        this.trailCtx.fillStyle = `rgba(0, 0, 0, ${this.trailFade})`;
        this.trailCtx.fillRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);

        // Draw particles onto trail canvas
        const tctx = this.trailCtx;
        tctx.globalCompositeOperation = 'lighter';

        if (style === 1) {
            // Connected webs: draw lines between nearby same-species particles
            tctx.lineWidth = 0.5;
            for (let s = 0; s < this.speciesCount; s++) {
                const sp = species[s];
                tctx.strokeStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light}%, 0.15)`;
                const group = particles.filter(p => p.species === s);
                for (let i = 0; i < group.length; i++) {
                    const a = group[i];
                    for (let j = i + 1; j < group.length; j++) {
                        const b = group[j];
                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        if (dx * dx + dy * dy < 2500) {
                            tctx.beginPath();
                            tctx.moveTo(a.x, a.y);
                            tctx.lineTo(b.x, b.y);
                            tctx.stroke();
                        }
                    }
                }
            }
        }

        // Draw particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const sp = species[p.species];
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

            switch (style) {
                case 0: // Glowing dots
                    tctx.fillStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light}%, ${0.6 + spd * 0.1})`;
                    tctx.beginPath();
                    tctx.arc(p.x, p.y, sp.size * (1 + spd * 0.1), 0, Math.PI * 2);
                    tctx.fill();
                    break;

                case 1: // Connected webs (dots + lines drawn above)
                    tctx.fillStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light + 20}%, 0.8)`;
                    tctx.beginPath();
                    tctx.arc(p.x, p.y, sp.size * 0.8, 0, Math.PI * 2);
                    tctx.fill();
                    break;

                case 2: // Trail painters
                    tctx.fillStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light}%, 0.4)`;
                    tctx.beginPath();
                    tctx.arc(p.x, p.y, sp.size * 1.5, 0, Math.PI * 2);
                    tctx.fill();
                    break;

                case 3: // Ghostly wisps
                {
                    const glowSize = sp.size * 3;
                    const grad = tctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
                    grad.addColorStop(0, `hsla(${sp.hue}, ${sp.sat}%, ${sp.light + 20}%, 0.5)`);
                    grad.addColorStop(1, 'transparent');
                    tctx.fillStyle = grad;
                    tctx.beginPath();
                    tctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
                    tctx.fill();
                    break;
                }
            }
        }

        tctx.globalCompositeOperation = 'source-over';

        // Composite trail canvas to main
        ctx.drawImage(this.trailCanvas, 0, 0);

        // Draw bright cores on top (not on trail canvas, so they stay crisp)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const sp = species[p.species];
            ctx.fillStyle = `hsla(${sp.hue}, ${sp.sat}%, ${sp.light + 20}%, 0.7)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, sp.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
