/**
 * @file gravity_marbles_architecture.js
 * @description Bouncing marbles with realistic physics, seed-driven materials
 *   (glass, chrome, matte, lava), collision responses, and gravity.
 *   Mouse acts as a gravity attractor. Click spawns new marbles.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class GravityMarblesArchitecture extends Architecture {
    constructor() {
        super();
        this.marbles = [];
        this.gravity = 0;
        this.bounceDamping = 0;
        this.materials = [];
        this.tick = 0;
        this.bgStyle = 0;
        this.maxMarbles = 60;
        this.mouseGravity = 0;
        this.floorY = 0;
        this.wallBounce = true;
    }

    init(system) {
        const rng = system.rng;
        this.tick = 0;
        this.gravity = 0.1 + rng() * 0.3;
        this.bounceDamping = 0.6 + rng() * 0.3;
        this.mouseGravity = 0.3 + rng() * 0.7;
        this.floorY = system.height - 20;
        this.wallBounce = rng() > 0.3;
        this.bgStyle = Math.floor(rng() * 3); // 0: plain, 1: grid, 2: radial
        this.maxMarbles = 30 + Math.floor(rng() * 40);

        // Material types with visual properties
        const matCount = 3 + Math.floor(rng() * 3);
        this.materials = [];
        const matTypes = ['glass', 'chrome', 'matte', 'lava', 'bubble', 'gem'];
        for (let i = 0; i < matCount; i++) {
            const type = matTypes[Math.floor(rng() * matTypes.length)];
            const hue = (system.hue + i * (360 / matCount) + rng() * 40) % 360;
            this.materials.push({ type, hue, sat: 60 + rng() * 40, light: 40 + rng() * 30 });
        }

        // Spawn initial marbles
        this.marbles = [];
        const startCount = 8 + Math.floor(rng() * 15);
        for (let i = 0; i < startCount; i++) {
            this._spawnMarble(system);
        }
    }

    _spawnMarble(system, x, y) {
        if (this.marbles.length >= this.maxMarbles) return;
        const rng = system.rng;
        const mat = this.materials[Math.floor(rng() * this.materials.length)];
        const radius = 10 + rng() * 35;
        const mass = radius * radius * 0.01;

        this.marbles.push({
            x: x !== undefined ? x : rng() * system.width,
            y: y !== undefined ? y : rng() * system.height * 0.5,
            vx: (rng() - 0.5) * 4,
            vy: (rng() - 0.5) * 2,
            radius,
            mass,
            material: mat,
            rotation: rng() * Math.PI * 2,
            rotSpeed: (rng() - 0.5) * 0.1,
            phase: rng() * Math.PI * 2,
            squash: 1, // for squash/stretch on bounce
            squashV: 0
        });
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;

        // Click spawns marble at cursor
        if (system.speedMultiplier > 5 && this.tick % 10 === 0) {
            this._spawnMarble(system, mouse.x, mouse.y);
        }

        for (let i = 0; i < this.marbles.length; i++) {
            const m = this.marbles[i];

            // Gravity
            m.vy += this.gravity;

            // Mouse attraction/repulsion
            const dx = mouse.x - m.x;
            const dy = mouse.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1 && dist < 400) {
                const force = system.isGravityWell
                    ? -this.mouseGravity * 2 / dist
                    : this.mouseGravity / dist;
                m.vx += (dx / dist) * force;
                m.vy += (dy / dist) * force;
            }

            // Air resistance
            m.vx *= 0.999;
            m.vy *= 0.999;

            m.x += m.vx;
            m.y += m.vy;
            m.rotation += m.rotSpeed;

            // Squash spring
            m.squash += m.squashV;
            m.squashV += (1 - m.squash) * 0.3;
            m.squashV *= 0.7;

            // Floor bounce
            if (m.y + m.radius > this.floorY) {
                m.y = this.floorY - m.radius;
                m.vy = -Math.abs(m.vy) * this.bounceDamping;
                m.squash = 0.7; // squash on impact
                m.squashV = 0;
                m.rotSpeed += m.vx * 0.01; // spin from friction
            }

            // Ceiling
            if (m.y - m.radius < 0) {
                m.y = m.radius;
                m.vy = Math.abs(m.vy) * this.bounceDamping;
            }

            // Wall bounces
            if (this.wallBounce) {
                if (m.x - m.radius < 0) {
                    m.x = m.radius;
                    m.vx = Math.abs(m.vx) * this.bounceDamping;
                    m.squash = 0.8;
                }
                if (m.x + m.radius > w) {
                    m.x = w - m.radius;
                    m.vx = -Math.abs(m.vx) * this.bounceDamping;
                    m.squash = 0.8;
                }
            } else {
                // Wrap
                if (m.x + m.radius < 0) m.x = w + m.radius;
                if (m.x - m.radius > w) m.x = -m.radius;
            }

            // Marble-marble collisions (early out with distance squared)
            for (let j = i + 1; j < this.marbles.length; j++) {
                const o = this.marbles[j];
                const cdx = o.x - m.x;
                const cdy = o.y - m.y;
                const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
                const minDist = m.radius + o.radius;

                if (cDist < minDist && cDist > 0) {
                    // Elastic collision
                    const nx = cdx / cDist;
                    const ny = cdy / cDist;
                    const dvx = m.vx - o.vx;
                    const dvy = m.vy - o.vy;
                    const dvn = dvx * nx + dvy * ny;

                    if (dvn > 0) {
                        const totalMass = m.mass + o.mass;
                        const imp = (2 * dvn) / totalMass;

                        m.vx -= imp * o.mass * nx;
                        m.vy -= imp * o.mass * ny;
                        o.vx += imp * m.mass * nx;
                        o.vy += imp * m.mass * ny;

                        m.squash = 0.85;
                        o.squash = 0.85;
                    }

                    // Separate overlapping marbles
                    const overlap = minDist - cDist;
                    const sep = overlap / 2;
                    m.x -= nx * sep;
                    m.y -= ny * sep;
                    o.x += nx * sep;
                    o.y += ny * sep;
                }
            }
        }

        // Sort by depth for draw order (done in update, not draw)
        this.marbles.sort((a, b) => a.y - b.y);
    }

    draw(system) {
        const ctx = system.ctx;

        // Background elements
        if (this.bgStyle === 1) {
            // Subtle grid
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for (let x = 0; x < system.width; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, system.height);
                ctx.stroke();
            }
            for (let y = 0; y < system.height; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(system.width, y);
                ctx.stroke();
            }
        } else if (this.bgStyle === 2) {
            // Radial floor glow
            const fg = ctx.createRadialGradient(
                system.width / 2, this.floorY, 0,
                system.width / 2, this.floorY, system.width * 0.6
            );
            fg.addColorStop(0, 'rgba(255,255,255,0.03)');
            fg.addColorStop(1, 'transparent');
            ctx.fillStyle = fg;
            ctx.fillRect(0, 0, system.width, system.height);
        }

        // Floor line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.floorY);
        ctx.lineTo(system.width, this.floorY);
        ctx.stroke();

        // Draw marbles sorted by y for depth (sort in update to avoid draw-phase work)
        for (let i = 0; i < this.marbles.length; i++) {
            const m = this.marbles[i];
            const mat = m.material;
            const r = m.radius;
            const sq = m.squash;
            const stretchX = 1 + (1 - sq) * 0.5;
            const stretchY = sq;

            // Shadow (drawn in world space, not squash-rotated)
            ctx.save();
            ctx.translate(m.x, m.y + r * 0.3);
            ctx.scale(1, 0.3);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Marble body with squash/stretch
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.scale(stretchX, stretchY);
            ctx.rotate(m.rotation);

            if (mat.type === 'glass') {
                // Translucent with highlight
                const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
                g.addColorStop(0, `hsla(${mat.hue}, ${mat.sat}%, ${mat.light + 30}%, 0.8)`);
                g.addColorStop(0.5, `hsla(${mat.hue}, ${mat.sat}%, ${mat.light}%, 0.4)`);
                g.addColorStop(1, `hsla(${mat.hue}, ${mat.sat}%, ${mat.light - 10}%, 0.2)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                // Highlight spot
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.arc(-r * 0.25, -r * 0.3, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (mat.type === 'chrome') {
                // Metallic gradient
                const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
                g.addColorStop(0, `hsl(${mat.hue}, 20%, 90%)`);
                g.addColorStop(0.3, `hsl(${mat.hue}, 30%, 60%)`);
                g.addColorStop(0.7, `hsl(${mat.hue}, 20%, 30%)`);
                g.addColorStop(1, `hsl(${mat.hue}, 10%, 15%)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                // Reflection streak
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(-r * 0.2, -r * 0.2, r * 0.5, -0.5, 0.5);
                ctx.stroke();
            } else if (mat.type === 'lava') {
                // Glowing lava ball
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                g.addColorStop(0, `hsl(30, 100%, 70%)`);
                g.addColorStop(0.4, `hsl(15, 100%, 50%)`);
                g.addColorStop(0.8, `hsl(0, 90%, 30%)`);
                g.addColorStop(1, `hsl(0, 80%, 15%)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                // Lava glow
                ctx.globalCompositeOperation = 'lighter';
                const lg = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.5);
                lg.addColorStop(0, `hsla(20, 100%, 50%, 0.3)`);
                lg.addColorStop(1, 'transparent');
                ctx.fillStyle = lg;
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            } else if (mat.type === 'bubble') {
                // Transparent bubble with iridescent rim
                ctx.strokeStyle = `hsla(${mat.hue + Math.sin(this.tick * 0.02 + m.phase) * 40}, 80%, 70%, 0.6)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
                // Inner sheen
                ctx.fillStyle = `hsla(${mat.hue}, 60%, 80%, 0.08)`;
                ctx.fill();
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(-r * 0.3, -r * 0.25, r * 0.15, 0, Math.PI * 2);
                ctx.fill();
            } else if (mat.type === 'gem') {
                // Faceted gem
                const sides = 6;
                ctx.fillStyle = `hsla(${mat.hue}, ${mat.sat}%, ${mat.light}%, 0.8)`;
                ctx.beginPath();
                for (let s = 0; s < sides; s++) {
                    const a = (s / sides) * Math.PI * 2;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                // Internal facets
                ctx.strokeStyle = `hsla(${mat.hue}, ${mat.sat}%, ${Math.min(100, mat.light + 20)}%, 0.4)`;
                ctx.lineWidth = 1;
                for (let s = 0; s < sides; s++) {
                    const a = (s / sides) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    ctx.stroke();
                }
                // Center glow
                const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.6);
                gg.addColorStop(0, `hsla(${mat.hue}, 100%, 90%, 0.4)`);
                gg.addColorStop(1, 'transparent');
                ctx.fillStyle = gg;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Matte
                const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
                g.addColorStop(0, `hsl(${mat.hue}, ${mat.sat}%, ${mat.light + 15}%)`);
                g.addColorStop(1, `hsl(${mat.hue}, ${mat.sat}%, ${mat.light - 10}%)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}
