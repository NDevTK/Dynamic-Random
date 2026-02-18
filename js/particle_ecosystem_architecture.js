/**
 * @file particle_ecosystem_architecture.js
 * @description Artificial particle life ecosystem where species interact via
 * configurable attraction/repulsion rules. Emergent behaviors arise from
 * simple local interactions - some seeds produce orbiting clusters, others
 * predator/prey dynamics, others crystalline lattice formations.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class ParticleEcosystemArchitecture extends Architecture {
    constructor() {
        super();
        this.species = [];
        this.particles = [];
        this.rules = [];
        this.trailCanvas = null;
        this.trailCtx = null;
        this.fade = 0;
        this.wrap = true;
        this.forceRange = 80;
        this.friction = 0.5;
        this.cursorForce = 0;
        this.cursorMode = 0;
        this.glowIntensity = 0;
        this.symmetry = 0;
    }

    init(system) {
        const rng = system.rng;

        // Create offscreen trail canvas for persistence
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = system.width;
        this.trailCanvas.height = system.height;
        this.trailCtx = this.trailCanvas.getContext('2d');

        // Seed-driven species count: 3-6 species, each with unique color
        const speciesCount = 3 + Math.floor(rng() * 4);
        const hueBase = rng() * 360;
        const hueStrategy = Math.floor(rng() * 4);

        this.species = [];
        for (let i = 0; i < speciesCount; i++) {
            let hue;
            if (hueStrategy === 0) hue = (hueBase + i * (360 / speciesCount)) % 360; // evenly spaced
            else if (hueStrategy === 1) hue = (hueBase + i * 30 + rng() * 20) % 360; // analogous cluster
            else if (hueStrategy === 2) hue = (hueBase + (i % 2 === 0 ? 0 : 180) + rng() * 40) % 360; // complementary
            else hue = rng() * 360; // random chaos

            const sat = 70 + rng() * 25;
            const light = 55 + rng() * 20;
            this.species.push({
                hue, sat, light,
                color: `hsl(${hue}, ${sat}%, ${light}%)`,
                colorDim: `hsla(${hue}, ${sat}%, ${light}%, 0.4)`,
                colorGlow: `hsla(${hue}, ${sat + 10}%, ${light + 20}%, 0.15)`
            });
        }

        // Generate interaction rules matrix: rules[i][j] = force from species j on species i
        // Positive = attraction, negative = repulsion
        this.rules = [];
        const rulePresets = [
            () => (rng() - 0.5) * 2,             // full random
            () => (rng() - 0.3) * 1.5,            // slightly attractive bias
            () => (rng() - 0.7) * 1.5,            // slightly repulsive bias
            () => rng() > 0.5 ? rng() : -rng(),   // binary attract/repel
            () => Math.sin(rng() * Math.PI * 4)    // oscillating pattern
        ];
        const ruleGen = rulePresets[Math.floor(rng() * rulePresets.length)];

        for (let i = 0; i < speciesCount; i++) {
            this.rules[i] = [];
            for (let j = 0; j < speciesCount; j++) {
                this.rules[i][j] = ruleGen();
            }
            // Self-interaction tends toward mild attraction for stability
            this.rules[i][i] = rng() * 0.5 - 0.1;
        }

        // Physics parameters from seed
        this.forceRange = 60 + rng() * 80;
        this.friction = 0.3 + rng() * 0.5;
        this.fade = 0.02 + rng() * 0.06;
        this.wrap = rng() > 0.3;
        this.cursorForce = (rng() > 0.5 ? 1 : -1) * (0.5 + rng() * 1.5);
        this.cursorMode = Math.floor(rng() * 3); // 0=attract, 1=repel, 2=orbit
        this.glowIntensity = 0.3 + rng() * 0.7;
        this.symmetry = rng() > 0.75 ? (2 + Math.floor(rng() * 3)) : 0; // 0=none, 2-4=fold symmetry

        // Spawn particles
        const totalParticles = 300 + Math.floor(rng() * 200);
        this.particles = [];
        const spawnPatterns = [
            // Random scatter
            (w, h) => ({ x: rng() * w, y: rng() * h }),
            // Central cluster
            (w, h) => ({ x: w / 2 + (rng() - 0.5) * w * 0.4, y: h / 2 + (rng() - 0.5) * h * 0.4 }),
            // Ring spawn
            (w, h) => {
                const a = rng() * Math.PI * 2;
                const r = 100 + rng() * Math.min(w, h) * 0.3;
                return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r };
            },
            // Grid with jitter
            (w, h) => {
                const cols = Math.ceil(Math.sqrt(totalParticles));
                const idx = this.particles.length;
                return {
                    x: (idx % cols) / cols * w + (rng() - 0.5) * 20,
                    y: Math.floor(idx / cols) / cols * h + (rng() - 0.5) * 20
                };
            }
        ];
        const spawn = spawnPatterns[Math.floor(rng() * spawnPatterns.length)];

        for (let i = 0; i < totalParticles; i++) {
            const s = Math.floor(rng() * speciesCount);
            const pos = spawn(system.width, system.height);
            this.particles.push({
                x: pos.x,
                y: pos.y,
                vx: (rng() - 0.5) * 2,
                vy: (rng() - 0.5) * 2,
                species: s,
                size: 1.5 + rng() * 1.5
            });
        }
    }

    update(system) {
        const w = system.width;
        const h = system.height;
        const mx = mouse.x;
        const my = mouse.y;
        const isWarp = system.speedMultiplier > 2;
        const isGravity = system.isGravityWell;
        const speedMul = Math.min(system.speedMultiplier, 5);

        // Apply interaction rules
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            let fx = 0, fy = 0;

            // Particle-particle interactions (sample for performance)
            const sampleStep = this.particles.length > 400 ? 2 : 1;
            for (let j = 0; j < this.particles.length; j += sampleStep) {
                if (i === j) continue;
                const q = this.particles[j];
                let dx = q.x - p.x;
                let dy = q.y - p.y;

                // Handle wrapping distance
                if (this.wrap) {
                    if (dx > w / 2) dx -= w;
                    else if (dx < -w / 2) dx += w;
                    if (dy > h / 2) dy -= h;
                    else if (dy < -h / 2) dy += h;
                }

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1 || dist > this.forceRange) continue;

                const rule = this.rules[p.species][q.species];
                // Force curve: repel very close, then attraction/repulsion at medium range
                let force;
                const t = dist / this.forceRange;
                if (t < 0.3) {
                    // Repulsion at very close range (prevents collapse)
                    force = (t / 0.3 - 1) * 0.5;
                } else {
                    force = rule * (1 - t);
                }

                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            }

            // Cursor interaction
            const cdx = mx - p.x;
            const cdy = my - p.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cdist > 5 && cdist < 200) {
                const cf = this.cursorForce / (cdist * 0.1 + 1);
                if (isGravity) {
                    // Strong attraction to cursor
                    fx += (cdx / cdist) * cf * 3;
                    fy += (cdy / cdist) * cf * 3;
                } else if (isWarp) {
                    // Explosion from cursor
                    fx -= (cdx / cdist) * cf * 5;
                    fy -= (cdy / cdist) * cf * 5;
                } else if (this.cursorMode === 2) {
                    // Orbit cursor
                    fx += (-cdy / cdist) * cf * 0.5;
                    fy += (cdx / cdist) * cf * 0.5;
                } else {
                    fx += (cdx / cdist) * cf * (this.cursorMode === 0 ? 1 : -1);
                    fy += (cdy / cdist) * cf * (this.cursorMode === 0 ? 1 : -1);
                }
            }

            // Apply forces
            p.vx = (p.vx + fx * 0.15) * (1 - this.friction * 0.02);
            p.vy = (p.vy + fy * 0.15) * (1 - this.friction * 0.02);

            // Speed limit
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 4 * speedMul) {
                p.vx = (p.vx / speed) * 4 * speedMul;
                p.vy = (p.vy / speed) * 4 * speedMul;
            }

            p.x += p.vx * speedMul;
            p.y += p.vy * speedMul;

            // Boundary handling
            if (this.wrap) {
                if (p.x < 0) p.x += w;
                else if (p.x > w) p.x -= w;
                if (p.y < 0) p.y += h;
                else if (p.y > h) p.y -= h;
            } else {
                if (p.x < 0 || p.x > w) { p.vx *= -0.8; p.x = Math.max(0, Math.min(w, p.x)); }
                if (p.y < 0 || p.y > h) { p.vy *= -0.8; p.y = Math.max(0, Math.min(h, p.y)); }
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tctx = this.trailCtx;
        const w = system.width;
        const h = system.height;

        // Resize trail canvas if needed
        if (this.trailCanvas.width !== w || this.trailCanvas.height !== h) {
            this.trailCanvas.width = w;
            this.trailCanvas.height = h;
        }

        // Fade trail canvas
        tctx.fillStyle = `rgba(0, 0, 0, ${this.fade})`;
        tctx.fillRect(0, 0, w, h);

        // Draw particles to trail canvas
        tctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            const sp = this.species[p.species];
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const glow = Math.min(1, speed * 0.3) * this.glowIntensity;

            // Glow halo
            if (glow > 0.1) {
                tctx.fillStyle = sp.colorGlow;
                tctx.beginPath();
                tctx.arc(p.x, p.y, p.size * 3 + speed, 0, Math.PI * 2);
                tctx.fill();
            }

            // Core particle
            tctx.fillStyle = sp.color;
            tctx.beginPath();
            tctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            tctx.fill();

            // Symmetry mirrors
            if (this.symmetry > 0) {
                const cx = w / 2, cy = h / 2;
                const dx = p.x - cx, dy = p.y - cy;
                for (let s = 1; s < this.symmetry; s++) {
                    const angle = (Math.PI * 2 / this.symmetry) * s;
                    const rx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
                    const ry = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
                    tctx.fillStyle = sp.colorDim;
                    tctx.beginPath();
                    tctx.arc(rx, ry, p.size * 0.7, 0, Math.PI * 2);
                    tctx.fill();
                }
            }
        }
        tctx.globalCompositeOperation = 'source-over';

        // Composite trail canvas onto main canvas
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(this.trailCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }
}
