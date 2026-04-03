/**
 * @file particle_fountain_effects.js
 * @description Interactive effect: clicking spawns a particle fountain that
 * erupts upward with gravity, each particle leaving a short trail. Fountains
 * have seed-determined behaviors: geysers, firework mortars, confetti cannons,
 * or bubble streams. Mouse proximity bends nearby fountain streams. Multiple
 * fountains can coexist and interact (particles from one can ignite another).
 *
 * Seed controls: fountain type, particle count per burst, gravity strength,
 * burst frequency, particle shape (circles/squares/triangles/stars), color
 * mode (monochrome/rainbow/palette), spread angle, and whether particles
 * bounce off screen edges.
 */

export class ParticleFountain {
    constructor() {
        this.fountains = [];
        this.particles = [];
        this.particlePool = [];
        this.maxFountains = 6;
        this.maxParticles = 200;
        this.fountainType = 0;
        this.gravity = 0.12;
        this.bounceEdges = false;
        this.particleShape = 0;
        this.colorMode = 0;
        this.palette = [];
        this._tick = 0;
        this._clickRegistered = false;
    }

    configure(rng, palette) {
        // Fountain type: 0=geyser (continuous), 1=firework mortar (burst+explode),
        // 2=confetti cannon, 3=bubble stream
        this.fountainType = Math.floor(rng() * 4);
        this.gravity = 0.06 + rng() * 0.12;
        this.bounceEdges = rng() > 0.5;
        // Particle shape: 0=circle, 1=square, 2=triangle, 3=star, 4=mixed
        this.particleShape = Math.floor(rng() * 5);
        // Color mode: 0=from palette, 1=rainbow cycle, 2=monochrome, 3=random per particle
        this.colorMode = Math.floor(rng() * 4);
        this.spreadAngle = Math.PI / (4 + rng() * 8);
        this.burstSize = 8 + Math.floor(rng() * 16);
        this.particleTrailLen = 3 + Math.floor(rng() * 5);
        this.windStrength = (rng() - 0.5) * 0.05;

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 70 + rng() * 25, l: 55 + rng() * 25 },
            { h: rng() * 360, s: 60 + rng() * 30, l: 50 + rng() * 30 },
            { h: rng() * 360, s: 80 + rng() * 15, l: 60 + rng() * 20 },
        ];

        this.fountains = [];
        this.particles = [];
        this.particlePool = [];
    }

    update(mx, my, isClicking) {
        this._tick++;

        // Click spawns a fountain
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            if (this.fountains.length >= this.maxFountains) {
                this.fountains.shift();
            }
            this.fountains.push({
                x: mx,
                y: my,
                life: this.fountainType === 0 ? 180 : 60,
                maxLife: this.fountainType === 0 ? 180 : 60,
                burstTimer: 0,
                burstInterval: this.fountainType === 0 ? 2 : 8,
                exploded: false,
            });
        }
        if (!isClicking) this._clickRegistered = false;

        // Update fountains
        for (let i = this.fountains.length - 1; i >= 0; i--) {
            const f = this.fountains[i];
            f.life--;
            f.burstTimer++;

            if (f.life <= 0) {
                this.fountains.splice(i, 1);
                continue;
            }

            // Emit particles
            if (this.fountainType === 1) {
                // Firework mortar: single shot up, then explode
                if (!f.exploded && f.burstTimer === 1) {
                    this._emitBurst(f.x, f.y, -Math.PI / 2, 0.2, 3, 8 + Math.random() * 4);
                }
                if (!f.exploded && f.life < f.maxLife - 30) {
                    f.exploded = true;
                    // Find the mortar particle and explode at its position
                    const mortar = this.particles.find(p => p.fountainId === i && !p.isSpark);
                    const ex = mortar ? mortar.x : f.x;
                    const ey = mortar ? mortar.y : f.y - 100;
                    this._emitBurst(ex, ey, 0, Math.PI * 2, this.burstSize, 3 + Math.random() * 4);
                }
            } else if (this.fountainType === 0) {
                // Geyser: continuous stream
                if (f.burstTimer >= f.burstInterval && this.particles.length < this.maxParticles) {
                    f.burstTimer = 0;
                    this._emitBurst(f.x, f.y, -Math.PI / 2, this.spreadAngle, 2, 4 + Math.random() * 3);
                }
            } else if (this.fountainType === 2) {
                // Confetti: periodic bursts
                if (f.burstTimer >= 10 && this.particles.length < this.maxParticles) {
                    f.burstTimer = 0;
                    this._emitBurst(f.x, f.y, -Math.PI / 2 + (Math.random() - 0.5) * 0.5,
                        this.spreadAngle * 2, this.burstSize / 2, 3 + Math.random() * 3);
                }
            } else {
                // Bubbles: slow continuous upward
                if (f.burstTimer >= 4 && this.particles.length < this.maxParticles) {
                    f.burstTimer = 0;
                    this._emitBurst(f.x + (Math.random() - 0.5) * 20, f.y,
                        -Math.PI / 2, 0.3, 1, 1 + Math.random() * 2);
                }
            }
        }

        // Mouse bends nearby particles
        const bendRadius = 120;

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay;

            if (p.life <= 0 || p.y > window.innerHeight + 20) {
                if (this.particlePool.length < this.maxParticles) this.particlePool.push(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
                continue;
            }

            // Apply gravity (bubbles float up)
            if (this.fountainType === 3) {
                p.vy -= this.gravity * 0.3; // Buoyancy
                p.vy *= 0.98;
                p.vx += Math.sin(this._tick * 0.05 + p.x * 0.01) * 0.05; // Wobble
            } else {
                p.vy += this.gravity;
            }

            // Wind
            p.vx += this.windStrength;

            // Mouse bending
            const dx = mx - p.x;
            const dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bendRadius && dist > 1) {
                const force = (1 - dist / bendRadius) * 0.3;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            p.x += p.vx;
            p.y += p.vy;

            // Friction
            p.vx *= 0.99;

            // Bounce off edges
            if (this.bounceEdges) {
                if (p.x < 0 || p.x > window.innerWidth) p.vx *= -0.6;
                if (p.y > window.innerHeight) { p.vy *= -0.5; p.y = window.innerHeight; }
            }

            // Confetti rotation
            if (this.fountainType === 2) {
                p.rotation = (p.rotation || 0) + (p.rotSpeed || 0);
            }

            // Update trail
            if (p.trail) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > this.particleTrailLen) p.trail.shift();
            }
        }
    }

    _emitBurst(x, y, baseAngle, spread, count, speed) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            let p = this.particlePool.length > 0 ? this.particlePool.pop() : {};
            const angle = baseAngle + (Math.random() - 0.5) * spread * 2;
            const spd = speed * (0.6 + Math.random() * 0.6);
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = 1.0;
            p.decay = 0.008 + Math.random() * 0.012;
            p.size = 2 + Math.random() * 4;
            p.trail = [];

            // Color
            if (this.colorMode === 1) {
                p.hue = (this._tick * 3 + i * 30) % 360;
                p.sat = 80;
                p.lit = 60;
            } else if (this.colorMode === 2) {
                const c = this.palette[0];
                p.hue = c.h;
                p.sat = c.s;
                p.lit = c.l;
            } else if (this.colorMode === 3) {
                p.hue = Math.random() * 360;
                p.sat = 70 + Math.random() * 25;
                p.lit = 55 + Math.random() * 25;
            } else {
                const c = this.palette[Math.floor(Math.random() * this.palette.length)];
                p.hue = c.h;
                p.sat = c.s;
                p.lit = c.l;
            }

            // Shape
            p.shapeType = this.particleShape === 4
                ? Math.floor(Math.random() * 4)
                : this.particleShape;

            // Confetti specific
            p.rotation = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 0.15;

            this.particles.push(p);
        }
    }

    draw(ctx) {
        if (this.particles.length === 0 && this.fountains.length === 0) return;

        ctx.globalCompositeOperation = 'lighter';

        // Draw particle trails
        for (const p of this.particles) {
            if (p.life <= 0.01) continue;

            // Trail
            if (p.trail && p.trail.length > 1) {
                ctx.lineWidth = p.size * 0.5 * p.life;
                for (let t = 1; t < p.trail.length; t++) {
                    const alpha = (t / p.trail.length) * p.life * 0.15;
                    ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(p.trail[t - 1].x, p.trail[t - 1].y);
                    ctx.lineTo(p.trail[t].x, p.trail[t].y);
                    ctx.stroke();
                }
            }

            // Particle body
            const alpha = p.life * 0.5;
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${alpha})`;

            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.rotation) ctx.rotate(p.rotation);

            ctx.beginPath();
            const sz = p.size * (0.5 + p.life * 0.5);

            if (p.shapeType === 0) {
                ctx.arc(0, 0, sz, 0, Math.PI * 2);
            } else if (p.shapeType === 1) {
                ctx.rect(-sz, -sz, sz * 2, sz * 2);
            } else if (p.shapeType === 2) {
                ctx.moveTo(0, -sz);
                ctx.lineTo(sz, sz);
                ctx.lineTo(-sz, sz);
                ctx.closePath();
            } else {
                // Star
                for (let k = 0; k < 10; k++) {
                    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
                    const r = k % 2 === 0 ? sz : sz * 0.4;
                    if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath();
            }
            ctx.fill();
            ctx.restore();

            // Bubble outline for bubble mode
            if (this.fountainType === 3 && p.life > 0.3) {
                ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit + 20}%, ${p.life * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz * 1.2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw fountain bases
        for (const f of this.fountains) {
            const c = this.palette[0];
            const lifeT = f.life / f.maxLife;
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${lifeT * 0.15})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 5 + (1 - lifeT) * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
