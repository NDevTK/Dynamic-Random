/**
 * @file magnetic_particle_theater_effects.js
 * @description Particles that self-organize into seed-dependent shapes using magnetic
 * field simulation. The shapes morph and transition between forms. Mouse acts as a
 * powerful magnet that disrupts formations, and particles dramatically reassemble.
 * Click triggers formation switch or scatter-and-reform.
 *
 * Modes:
 * 0 - Sacred Geometry: Particles form rotating sacred geometry patterns (flower of life, metatron's cube)
 * 1 - Creature Silhouettes: Particles form animal silhouettes that morph between species
 * 2 - Typography: Particles spell out seed-dependent words/symbols
 * 3 - Constellation Map: Particles form star constellation patterns with connecting lines
 * 4 - Fluid Magnetism: Iron-filing-like patterns around invisible magnetic poles
 * 5 - Heartbeat: Particles pulse between formations in a rhythmic heartbeat pattern
 */

const TAU = Math.PI * 2;

export class MagneticParticleTheater {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this._rng = Math.random;

        this.particles = [];
        this.maxParticles = 500;

        // Target formation points
        this._targets = [];
        this._currentFormation = 0;
        this._formations = [];
        this._morphProgress = 1;
        this._morphSpeed = 0.008;

        // Magnetic poles for mode 4
        this._poles = [];

        // Mouse disruption
        this._mouseX = 0;
        this._mouseY = 0;

        // Heartbeat timing
        this._beatPhase = 0;
        this._beatRate = 0.02;

        // Click scatter
        this._scatterForce = 0;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this._morphProgress = 0;
        this._currentFormation = 0;
        this._beatPhase = 0;
        this._scatterForce = 0;

        // Generate formations based on mode and seed
        this._formations = [];

        switch (this.mode) {
            case 0: this._generateSacredGeometry(rng); break;
            case 1: this._generateCreatures(rng); break;
            case 2: this._generateTypography(rng); break;
            case 3: this._generateConstellations(rng); break;
            case 4: this._generateMagneticPoles(rng); break;
            case 5: this._generateHeartbeat(rng); break;
        }

        // Initialize particles
        this.particles = [];
        this.maxParticles = this.mode === 4 ? 600 : 400;

        this._targets = this._formations.length > 0 ? this._formations[0] : [];
    }

    _generateSacredGeometry(rng) {
        const shapes = [];
        const numShapes = 2 + Math.floor(rng() * 3);

        for (let s = 0; s < numShapes; s++) {
            const points = [];
            const type = Math.floor(rng() * 4);

            if (type === 0) {
                // Flower of Life
                const petals = 6;
                const r = 0.15 + rng() * 0.1;
                for (let i = 0; i < petals; i++) {
                    const angle = (i / petals) * TAU;
                    const cx = 0.5 + Math.cos(angle) * r;
                    const cy = 0.5 + Math.sin(angle) * r;
                    for (let j = 0; j < 20; j++) {
                        const a = (j / 20) * TAU;
                        points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
                    }
                }
                // Center circle
                for (let j = 0; j < 20; j++) {
                    const a = (j / 20) * TAU;
                    points.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r });
                }
            } else if (type === 1) {
                // Metatron's Cube
                const vertices = [];
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TAU;
                    vertices.push({ x: 0.5 + Math.cos(a) * 0.2, y: 0.5 + Math.sin(a) * 0.2 });
                    vertices.push({ x: 0.5 + Math.cos(a) * 0.35, y: 0.5 + Math.sin(a) * 0.35 });
                }
                vertices.push({ x: 0.5, y: 0.5 });
                // Lines between all vertices
                for (let i = 0; i < vertices.length; i++) {
                    for (let j = i + 1; j < vertices.length; j++) {
                        const steps = 5;
                        for (let t = 0; t <= steps; t++) {
                            const frac = t / steps;
                            points.push({
                                x: vertices[i].x + (vertices[j].x - vertices[i].x) * frac,
                                y: vertices[i].y + (vertices[j].y - vertices[i].y) * frac,
                            });
                        }
                    }
                }
            } else if (type === 2) {
                // Sri Yantra (nested triangles)
                for (let ring = 0; ring < 4; ring++) {
                    const r = 0.1 + ring * 0.08;
                    const sides = 3;
                    const offset = ring % 2 === 0 ? 0 : Math.PI;
                    for (let i = 0; i < sides; i++) {
                        const a1 = (i / sides) * TAU + offset - Math.PI / 2;
                        const a2 = ((i + 1) / sides) * TAU + offset - Math.PI / 2;
                        for (let t = 0; t < 15; t++) {
                            const frac = t / 15;
                            points.push({
                                x: 0.5 + Math.cos(a1) * r + (Math.cos(a2) - Math.cos(a1)) * r * frac,
                                y: 0.5 + Math.sin(a1) * r + (Math.sin(a2) - Math.sin(a1)) * r * frac,
                            });
                        }
                    }
                }
            } else {
                // Seed of life (overlapping circles)
                const r = 0.12;
                for (let i = 0; i < 7; i++) {
                    const cx = i === 0 ? 0.5 : 0.5 + Math.cos((i - 1) / 6 * TAU) * r;
                    const cy = i === 0 ? 0.5 : 0.5 + Math.sin((i - 1) / 6 * TAU) * r;
                    for (let j = 0; j < 15; j++) {
                        const a = (j / 15) * TAU;
                        points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
                    }
                }
            }
            shapes.push(points);
        }

        this._formations = shapes;
    }

    _generateCreatures(rng) {
        // Simple silhouettes via parametric curves
        const creatures = [];
        const types = ['butterfly', 'bird', 'fish', 'spider', 'jellyfish'];

        for (let c = 0; c < 3; c++) {
            const points = [];
            const type = types[Math.floor(rng() * types.length)];

            if (type === 'butterfly') {
                for (let t = 0; t < 200; t++) {
                    const a = (t / 200) * TAU * 2;
                    const r = Math.exp(Math.cos(a)) - 2 * Math.cos(4 * a) + Math.pow(Math.sin(a / 12), 5);
                    points.push({ x: 0.5 + r * Math.cos(a) * 0.08, y: 0.5 + r * Math.sin(a) * 0.08 });
                }
            } else if (type === 'bird') {
                for (let t = 0; t < 150; t++) {
                    const a = (t / 150) * TAU;
                    const wing = Math.sin(a * 2) * 0.15;
                    const body = Math.cos(a) * 0.05;
                    points.push({ x: 0.5 + Math.cos(a) * (0.2 + wing), y: 0.5 + body + Math.sin(a) * 0.05 });
                }
            } else if (type === 'fish') {
                for (let t = 0; t < 150; t++) {
                    const a = (t / 150) * TAU;
                    const rx = 0.2 + Math.cos(a * 2) * 0.05;
                    const ry = 0.1 + Math.sin(a) * 0.02;
                    points.push({ x: 0.5 + Math.cos(a) * rx, y: 0.5 + Math.sin(a) * ry });
                }
            } else if (type === 'spider') {
                // Body + 8 legs
                for (let i = 0; i < 8; i++) {
                    const legAngle = (i / 8) * TAU;
                    for (let t = 0; t < 15; t++) {
                        const d = t / 15 * 0.2;
                        const wobble = Math.sin(t * 0.5) * 0.03;
                        points.push({
                            x: 0.5 + Math.cos(legAngle) * d + wobble,
                            y: 0.5 + Math.sin(legAngle) * d,
                        });
                    }
                }
                for (let t = 0; t < 20; t++) {
                    const a = (t / 20) * TAU;
                    points.push({ x: 0.5 + Math.cos(a) * 0.04, y: 0.5 + Math.sin(a) * 0.04 });
                }
            } else { // jellyfish
                // Bell
                for (let t = 0; t < 60; t++) {
                    const a = (t / 60) * Math.PI;
                    points.push({ x: 0.5 + Math.cos(a) * 0.15, y: 0.45 - Math.sin(a) * 0.1 });
                }
                // Tentacles
                for (let i = 0; i < 6; i++) {
                    const bx = 0.35 + (i / 5) * 0.3;
                    for (let t = 0; t < 20; t++) {
                        const ty = 0.45 + t * 0.012;
                        const wave = Math.sin(t * 0.3 + i) * 0.02;
                        points.push({ x: bx + wave, y: ty });
                    }
                }
            }
            creatures.push(points);
        }

        this._formations = creatures;
    }

    _generateTypography(rng) {
        const symbols = ['*', '#', '@', '!', '?', '+', '=', '~'];
        const formations = [];

        for (let s = 0; s < 3; s++) {
            const points = [];
            const sym = symbols[Math.floor(rng() * symbols.length)];
            const size = 0.3;
            const cx = 0.5;
            const cy = 0.5;

            if (sym === '*') {
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * TAU;
                    for (let d = 0; d < 15; d++) {
                        const dist = (d / 15) * size;
                        points.push({ x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist });
                    }
                }
            } else if (sym === '#') {
                for (let t = 0; t < 30; t++) {
                    const f = (t / 30 - 0.5) * size * 2;
                    points.push({ x: cx - size * 0.3, y: cy + f });
                    points.push({ x: cx + size * 0.3, y: cy + f });
                    points.push({ x: cx + f, y: cy - size * 0.3 });
                    points.push({ x: cx + f, y: cy + size * 0.3 });
                }
            } else if (sym === '?') {
                for (let t = 0; t < 40; t++) {
                    const a = (t / 40) * Math.PI * 1.5 - Math.PI * 0.5;
                    points.push({ x: cx + Math.cos(a) * size * 0.4, y: cy - size * 0.2 + Math.sin(a) * size * 0.3 });
                }
                points.push({ x: cx, y: cy + size * 0.35 });
            } else if (sym === '!') {
                // Exclamation: vertical line + dot
                for (let t = 0; t < 25; t++) {
                    const f = (t / 25) * size * 1.2;
                    points.push({ x: cx, y: cy - size * 0.4 + f });
                }
                points.push({ x: cx, y: cy + size * 0.45 });
            } else if (sym === '@') {
                // At sign: spiral
                for (let t = 0; t < 80; t++) {
                    const a = (t / 80) * TAU * 1.5;
                    const r = size * 0.15 + (t / 80) * size * 0.25;
                    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
                }
            } else {
                // Generic spiral for other symbols
                for (let t = 0; t < 60; t++) {
                    const a = (t / 60) * TAU * 2;
                    const r = (t / 60) * size * 0.5;
                    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
                }
            }

            formations.push(points);
        }

        this._formations = formations;
    }

    _generateConstellations(rng) {
        const formations = [];

        for (let c = 0; c < 3; c++) {
            const points = [];
            const starCount = 5 + Math.floor(rng() * 8);

            for (let i = 0; i < starCount; i++) {
                const sx = 0.2 + rng() * 0.6;
                const sy = 0.2 + rng() * 0.6;
                for (let j = 0; j < 8; j++) {
                    const a = (j / 8) * TAU;
                    const d = rng() * 0.02;
                    points.push({ x: sx + Math.cos(a) * d, y: sy + Math.sin(a) * d });
                }
                points.push({ x: sx, y: sy });
            }

            formations.push(points);
        }

        this._formations = formations;
    }

    _generateMagneticPoles(rng) {
        this._poles = [];
        const count = 3 + Math.floor(rng() * 5);
        for (let i = 0; i < count; i++) {
            this._poles.push({
                x: 0.15 + rng() * 0.7,
                y: 0.15 + rng() * 0.7,
                strength: (rng() > 0.5 ? 1 : -1) * (50 + rng() * 100),
                vx: (rng() - 0.5) * 0.001,
                vy: (rng() - 0.5) * 0.001,
            });
        }
        this._formations = [[]];
    }

    _generateHeartbeat(rng) {
        const expanded = [];
        const contracted = [];

        for (let t = 0; t < 200; t++) {
            const a = (t / 200) * TAU;
            const ex = 0.5 + 0.16 * Math.pow(Math.sin(a), 3);
            const ey = 0.48 - (0.13 * Math.cos(a) - 0.05 * Math.cos(2 * a) - 0.02 * Math.cos(3 * a) - 0.01 * Math.cos(4 * a));
            expanded.push({ x: ex, y: ey });

            const scale = 0.6;
            contracted.push({
                x: 0.5 + (ex - 0.5) * scale,
                y: 0.48 + (ey - 0.48) * scale,
            });
        }

        this._formations = [expanded, contracted];
        this._beatRate = 0.015 + rng() * 0.01;
    }

    _initParticles(w, h) {
        this.particles = [];
        const count = Math.min(this.maxParticles, this._targets.length > 0 ? this._targets.length : this.maxParticles);

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: this._rng() * w,
                y: this._rng() * h,
                vx: 0,
                vy: 0,
                targetIdx: i % Math.max(1, this._targets.length),
                hue: (this.hue + this._rng() * 40) % 360,
                size: 1.5 + this._rng() * 2,
                brightness: 0.5 + this._rng() * 0.5,
            });
        }
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;
        this._mouseX = system.mouse ? system.mouse.x : w / 2;
        this._mouseY = system.mouse ? system.mouse.y : h / 2;

        if (this.particles.length === 0) {
            this._initParticles(w, h);
        }

        // Scatter force decay
        if (this._scatterForce > 0.1) {
            this._scatterForce *= 0.9;
        } else {
            this._scatterForce = 0;
        }

        // Formation morphing
        if (this._formations.length > 1 && this.mode !== 5) {
            this._morphProgress += this._morphSpeed;
            if (this._morphProgress >= 1) {
                this._morphProgress = 0;
                this._currentFormation = (this._currentFormation + 1) % this._formations.length;
                this._targets = this._formations[this._currentFormation];
            }
        }

        // Heartbeat pulsing
        if (this.mode === 5) {
            this._beatPhase += this._beatRate;
            const beat = Math.sin(this._beatPhase);
            this._targets = this._formations[beat > 0 ? 0 : 1];
        }

        // Update magnetic poles (mode 4) - fixed: was using pole.vy for both x and y
        if (this.mode === 4) {
            for (const pole of this._poles) {
                pole.x += pole.vx;
                pole.y += pole.vy;
                if (pole.x < 0.1 || pole.x > 0.9) pole.vx *= -1;
                if (pole.y < 0.1 || pole.y > 0.9) pole.vy *= -1;
            }
        }

        const mx = this._mouseX;
        const my = this._mouseY;
        const mouseRadiusSq = 15000;
        const hasTargets = this._targets.length > 0;
        const scatterForce = this._scatterForce;

        for (const p of this.particles) {
            // Mouse repulsion (use distSq to avoid sqrt)
            const mdx = p.x - mx;
            const mdy = p.y - my;
            const mDist2 = mdx * mdx + mdy * mdy;
            if (mDist2 < mouseRadiusSq && mDist2 > 1) {
                // Approximate normalized direction using fast inverse: 1/sqrt via Newton step
                const invDist = 1 / Math.sqrt(mDist2);
                const force = (1 - mDist2 / mouseRadiusSq) * 3;
                p.vx += mdx * invDist * force;
                p.vy += mdy * invDist * force;
            }

            // Click scatter: random outward impulse
            if (scatterForce > 0) {
                p.vx += (p.x - w * 0.5) * scatterForce * 0.001;
                p.vy += (p.y - h * 0.5) * scatterForce * 0.001;
            }

            if (this.mode === 4) {
                // Magnetic pole forces (use invDist to reduce sqrt calls)
                for (const pole of this._poles) {
                    const px = pole.x * w;
                    const py = pole.y * h;
                    const dx = px - p.x;
                    const dy = py - p.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 > 4 && dist2 < 90000) {
                        const invDist = 1 / Math.sqrt(dist2);
                        const force = pole.strength * invDist * invDist; // strength / dist^2
                        p.vx += dx * invDist * force;
                        p.vy += dy * invDist * force;
                    }
                }
            } else if (hasTargets) {
                // Seek target position (use dist2 comparison to skip far particles)
                const target = this._targets[p.targetIdx % this._targets.length];
                const tx = target.x * w;
                const ty = target.y * h;
                const dx = tx - p.x;
                const dy = ty - p.y;
                const dist2 = dx * dx + dy * dy;
                if (dist2 > 1) {
                    const dist = Math.sqrt(dist2);
                    const seekMag = 0.05 * Math.min(dist, 50);
                    p.vx += (dx / dist) * seekMag;
                    p.vy += (dy / dist) * seekMag;
                }
            }

            // Apply velocity with damping
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.x += p.vx;
            p.y += p.vy;

            // Soft boundary
            if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
            if (p.x > w) { p.x = w; p.vx *= -0.5; }
            if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
            if (p.y > h) { p.y = h; p.vy *= -0.5; }
        }
    }

    draw(ctx, system) {
        // Handle click: scatter + advance formation
        if (system._clickRegistered !== undefined && system._clickRegistered) {
            this._scatterForce = 8;
            if (this._formations.length > 1 && this.mode !== 5) {
                this._currentFormation = (this._currentFormation + 1) % this._formations.length;
                this._targets = this._formations[this._currentFormation];
                this._morphProgress = 0;
            }
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Batch particles by speed category to reduce fillStyle changes
        const baseHue = this.hue;
        const slow = [];
        const fast = [];

        for (const p of this.particles) {
            const speed2 = p.vx * p.vx + p.vy * p.vy;
            if (speed2 > 1) fast.push(p);
            else slow.push(p);
        }

        // Draw slow particles (majority) with shared style
        for (const p of slow) {
            const speed2 = p.vx * p.vx + p.vy * p.vy;
            const glow = Math.min(1, speed2 * 0.01);
            const alpha = 0.4 + glow * 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + glow * 2, 0, TAU);
            ctx.fillStyle = `hsla(${(p.hue + speed2 * 0.5) % 360 | 0}, 80%, ${(50 + p.brightness * 20) | 0}%, ${alpha})`;
            ctx.fill();
        }

        // Draw fast particles with motion blur trails
        for (const p of fast) {
            const speed2 = p.vx * p.vx + p.vy * p.vy;
            const speed = Math.sqrt(speed2);
            const glow = Math.min(1, speed * 0.1);
            const alpha = 0.4 + glow * 0.5;
            const size = p.size + glow * 2;

            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, TAU);
            ctx.fillStyle = `hsla(${(p.hue + speed * 5) % 360 | 0}, 80%, ${(50 + p.brightness * 20) | 0}%, ${alpha})`;
            ctx.fill();

            // Motion blur trail
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
            ctx.strokeStyle = `hsla(${p.hue | 0}, 70%, 60%, ${alpha * 0.3})`;
            ctx.lineWidth = size * 0.5;
            ctx.stroke();
        }

        // Constellation connecting lines (mode 3) - batched into single path
        if (this.mode === 3) {
            const linkDistSq = 6400; // 80^2
            ctx.strokeStyle = `hsla(${baseHue}, 50%, 70%, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            for (let i = 0; i < this.particles.length; i += 8) {
                const a = this.particles[i];
                for (let j = i + 8; j < this.particles.length; j += 8) {
                    const b = this.particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    if (dx * dx + dy * dy < linkDistSq) {
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                    }
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
