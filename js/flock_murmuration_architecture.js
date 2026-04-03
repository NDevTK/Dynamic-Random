/**
 * @file flock_murmuration_architecture.js
 * @description Starling murmuration simulation with thousands of boids forming
 * massive flowing shapes. Mouse acts as a hawk that scatters the flock. Clicking
 * sends a shockwave that makes the flock explode outward then regroup.
 * Seed controls: flock count, cohesion/separation rules, formation shapes, trail style,
 * color palette, and flocking personality (tight vs loose, fast vs graceful).
 */

import { Architecture } from './background_architectures.js';
import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';

export class FlockMurmurationArchitecture extends Architecture {
    constructor() {
        super();
        this.boids = [];
        this.attractors = [];
        this.palette = [];
        this.flockStyle = 0;
        this.trailStyle = 0;
        this.gridCols = 0;
        this.gridRows = 0;
        this.grid = null;
        this.cellSize = 60;
        this._boidPath = null;
    }

    init(system) {
        const rng = system.rng;

        // Flock personality styles
        // 0=tight swarm, 1=loose cloud, 2=ribbon stream, 3=vortex, 4=explosive
        this.flockStyle = Math.floor(rng() * 5);

        // Trail style: 0=none, 1=short fade, 2=long ribbon, 3=dotted
        this.trailStyle = Math.floor(rng() * 4);

        // Color palettes - each gives dramatically different look
        const palettes = [
            // Starling - dark iridescent
            [{ h: 220, s: 40, l: 20 }, { h: 260, s: 50, l: 30 }, { h: 200, s: 45, l: 25 }],
            // Firebird - warm glow
            [{ h: 20, s: 90, l: 55 }, { h: 40, s: 85, l: 50 }, { h: 0, s: 80, l: 45 }],
            // Neon swarm - cyberpunk
            [{ h: 300, s: 100, l: 60 }, { h: 180, s: 100, l: 55 }, { h: 60, s: 100, l: 50 }],
            // Ghost flock - ethereal
            [{ h: 200, s: 20, l: 70 }, { h: 220, s: 15, l: 80 }, { h: 240, s: 25, l: 65 }],
            // Toxic - acid green
            [{ h: 100, s: 90, l: 45 }, { h: 80, s: 85, l: 50 }, { h: 120, s: 80, l: 40 }],
        ];
        this.palette = palettes[Math.floor(rng() * palettes.length)];

        // Flocking parameters (seed-driven)
        this.separationDist = 15 + rng() * 20;
        this.alignmentDist = 40 + rng() * 40;
        this.cohesionDist = 60 + rng() * 60;
        this.separationForce = 1.5 + rng() * 1.5;
        this.alignmentForce = 0.5 + rng() * 1.0;
        this.cohesionForce = 0.3 + rng() * 0.7;
        this.maxSpeed = 2 + rng() * 3;
        this.mouseFleeRadius = 100 + rng() * 150;
        this.mouseFleeForce = 3 + rng() * 4;

        // Create boids
        const count = 600 + Math.floor(rng() * 400);
        this.boids = [];
        for (let i = 0; i < count; i++) {
            const angle = rng() * Math.PI * 2;
            const speed = 0.5 + rng() * this.maxSpeed;
            const colorIdx = Math.floor(rng() * this.palette.length);
            this.boids.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                colorIdx,
                size: 1.5 + rng() * 2,
                // Trail history (last 3-8 positions)
                trail: [],
                trailMax: this.trailStyle === 2 ? 6 + Math.floor(rng() * 4) : 3,
            });
        }

        // Floating attractors that the flock orbits
        this.attractors = [];
        const attractorCount = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < attractorCount; i++) {
            this.attractors.push({
                x: system.width * (0.2 + rng() * 0.6),
                y: system.height * (0.2 + rng() * 0.6),
                vx: (rng() - 0.5) * 0.5,
                vy: (rng() - 0.5) * 0.5,
                strength: 0.01 + rng() * 0.03,
                radius: 100 + rng() * 200,
                phase: rng() * Math.PI * 2,
                orbitSpeed: 0.002 + rng() * 0.005
            });
        }

        // Set up spatial grid
        this.cellSize = Math.max(this.separationDist, this.alignmentDist, this.cohesionDist);
        this.gridCols = Math.ceil(system.width / this.cellSize) + 1;
        this.gridRows = Math.ceil(system.height / this.cellSize) + 1;
        this.grid = new Array(this.gridCols * this.gridRows);
    }

    update(system) {
        const w = system.width;
        const h = system.height;
        const mx = mouse.x;
        const my = mouse.y;
        const boids = this.boids;
        const len = boids.length;

        // Update attractors
        for (const a of this.attractors) {
            a.phase += a.orbitSpeed;
            a.x += a.vx + Math.sin(a.phase) * 0.5;
            a.y += a.vy + Math.cos(a.phase * 0.7) * 0.5;
            // Bounce off edges
            if (a.x < 50 || a.x > w - 50) a.vx *= -1;
            if (a.y < 50 || a.y > h - 50) a.vy *= -1;
            a.x = Math.max(50, Math.min(w - 50, a.x));
            a.y = Math.max(50, Math.min(h - 50, a.y));
        }

        // Build spatial grid
        for (let i = 0; i < this.grid.length; i++) this.grid[i] = null;

        for (let i = 0; i < len; i++) {
            const b = boids[i];
            const col = Math.floor(b.x / this.cellSize);
            const row = Math.floor(b.y / this.cellSize);
            if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
                const idx = row * this.gridCols + col;
                b._next = this.grid[idx];
                this.grid[idx] = b;
            }
        }

        // Update each boid
        const sepDist2 = this.separationDist * this.separationDist;
        const aliDist2 = this.alignmentDist * this.alignmentDist;
        const cohDist2 = this.cohesionDist * this.cohesionDist;
        const maxSpd = this.maxSpeed * system.speedMultiplier;

        for (let i = 0; i < len; i++) {
            const b = boids[i];
            let sepX = 0, sepY = 0, sepCount = 0;
            let aliVx = 0, aliVy = 0, aliCount = 0;
            let cohX = 0, cohY = 0, cohCount = 0;

            const bcol = Math.floor(b.x / this.cellSize);
            const brow = Math.floor(b.y / this.cellSize);

            // Check neighboring cells
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nc = bcol + dc;
                    const nr = brow + dr;
                    if (nc < 0 || nc >= this.gridCols || nr < 0 || nr >= this.gridRows) continue;
                    let other = this.grid[nr * this.gridCols + nc];
                    while (other) {
                        if (other !== b) {
                            const dx = other.x - b.x;
                            const dy = other.y - b.y;
                            const d2 = dx * dx + dy * dy;

                            if (d2 < sepDist2 && d2 > 0) {
                                const d = Math.sqrt(d2);
                                sepX -= dx / d;
                                sepY -= dy / d;
                                sepCount++;
                            }
                            if (d2 < aliDist2) {
                                aliVx += other.vx;
                                aliVy += other.vy;
                                aliCount++;
                            }
                            if (d2 < cohDist2) {
                                cohX += other.x;
                                cohY += other.y;
                                cohCount++;
                            }
                        }
                        other = other._next;
                    }
                }
            }

            // Apply forces
            if (sepCount > 0) {
                b.vx += (sepX / sepCount) * this.separationForce;
                b.vy += (sepY / sepCount) * this.separationForce;
            }
            if (aliCount > 0) {
                b.vx += ((aliVx / aliCount) - b.vx) * this.alignmentForce * 0.1;
                b.vy += ((aliVy / aliCount) - b.vy) * this.alignmentForce * 0.1;
            }
            if (cohCount > 0) {
                b.vx += ((cohX / cohCount - b.x)) * this.cohesionForce * 0.001;
                b.vy += ((cohY / cohCount - b.y)) * this.cohesionForce * 0.001;
            }

            // Mouse flee / attract
            const mdx = mx - b.x;
            const mdy = my - b.y;
            const mDist2 = mdx * mdx + mdy * mdy;
            const fleeR2 = this.mouseFleeRadius * this.mouseFleeRadius;

            if (mDist2 < fleeR2 && mDist2 > 1) {
                const mDist = Math.sqrt(mDist2);
                const strength = (1 - mDist / this.mouseFleeRadius) * this.mouseFleeForce;
                if (isRightMouseDown) {
                    // Attract
                    b.vx += (mdx / mDist) * strength * 0.5;
                    b.vy += (mdy / mDist) * strength * 0.5;
                } else {
                    // Flee (default hawk behavior)
                    b.vx -= (mdx / mDist) * strength;
                    b.vy -= (mdy / mDist) * strength;
                }
            }

            // Attractor influence
            for (const a of this.attractors) {
                const adx = a.x - b.x;
                const ady = a.y - b.y;
                const ad2 = adx * adx + ady * ady;
                if (ad2 < a.radius * a.radius && ad2 > 1) {
                    const ad = Math.sqrt(ad2);
                    b.vx += (adx / ad) * a.strength;
                    b.vy += (ady / ad) * a.strength;

                    // Vortex mode: add perpendicular force
                    if (this.flockStyle === 3) {
                        b.vx += (-ady / ad) * a.strength * 0.5;
                        b.vy += (adx / ad) * a.strength * 0.5;
                    }
                }
            }

            // Speed limit
            const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (spd > maxSpd) {
                b.vx = (b.vx / spd) * maxSpd;
                b.vy = (b.vy / spd) * maxSpd;
            }

            // Store trail position
            if (this.trailStyle > 0 && system.tick % 2 === 0) {
                b.trail.push(b.x, b.y);
                if (b.trail.length > b.trailMax * 2) {
                    b.trail.splice(0, 2);
                }
            }

            b.x += b.vx;
            b.y += b.vy;

            // Wrap
            if (b.x < 0) b.x += w;
            if (b.x > w) b.x -= w;
            if (b.y < 0) b.y += h;
            if (b.y > h) b.y -= h;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const boids = this.boids;
        const len = boids.length;

        // Draw trails first
        if (this.trailStyle > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < len; i++) {
                const b = boids[i];
                if (b.trail.length < 4) continue;
                const c = this.palette[b.colorIdx];

                if (this.trailStyle === 3) {
                    // Dotted trail
                    for (let j = 0; j < b.trail.length; j += 2) {
                        const alpha = (j / b.trail.length) * 0.15;
                        ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`;
                        ctx.fillRect(b.trail[j], b.trail[j + 1], 1, 1);
                    }
                } else {
                    ctx.beginPath();
                    ctx.moveTo(b.trail[0], b.trail[1]);
                    for (let j = 2; j < b.trail.length; j += 2) {
                        ctx.lineTo(b.trail[j], b.trail[j + 1]);
                    }
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.1)`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw boids - batch by color for fewer state changes
        for (let ci = 0; ci < this.palette.length; ci++) {
            const c = this.palette[ci];
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.8)`;
            ctx.beginPath();
            for (let i = 0; i < len; i++) {
                const b = boids[i];
                if (b.colorIdx !== ci) continue;
                // Draw as tiny directional triangle
                const angle = Math.atan2(b.vy, b.vx);
                const s = b.size;
                const x = b.x, y = b.y;
                ctx.moveTo(x + Math.cos(angle) * s * 2, y + Math.sin(angle) * s * 2);
                ctx.lineTo(x + Math.cos(angle + 2.5) * s, y + Math.sin(angle + 2.5) * s);
                ctx.lineTo(x + Math.cos(angle - 2.5) * s, y + Math.sin(angle - 2.5) * s);
            }
            ctx.fill();
        }

        // Draw attractors as subtle glow
        ctx.globalCompositeOperation = 'lighter';
        for (const a of this.attractors) {
            const c = this.palette[0];
            const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.radius * 0.3);
            g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.05)`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}
