/**
 * @file particle_fountain_effects.js
 * @description Interactive effect: clicking spawns a particle fountain that
 * erupts upward with gravity, each particle leaving a short trail. Fountains
 * have seed-determined behaviors: geysers, firework mortars, confetti cannons,
 * or bubble streams. Mouse proximity bends nearby fountain streams. Multiple
 * fountains can coexist and interact.
 *
 * Seed controls: fountain type, particle count per burst, gravity strength,
 * burst frequency, particle shape (circles/squares/triangles/stars), color
 * mode (monochrome/rainbow/palette/random), spread angle, wind, and whether
 * particles bounce off screen edges.
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
        // Bend radius squared to avoid sqrt in hot loop
        this._bendRadiusSq = 120 * 120;
    }

    _prand(seed) {
        return ((seed * 2654435761) >>> 0) / 4294967296;
    }

    configure(rng, palette) {
        this.fountainType = Math.floor(rng() * 4);
        this.gravity = 0.06 + rng() * 0.12;
        this.bounceEdges = rng() > 0.5;
        this.particleShape = Math.floor(rng() * 5);
        this.colorMode = Math.floor(rng() * 4);
        this.spreadAngle = Math.PI / (4 + rng() * 8);
        this.burstSize = 8 + Math.floor(rng() * 16);
        this.particleTrailLen = 3 + Math.floor(rng() * 5);
        this.windStrength = (rng() - 0.5) * 0.05;
        // Fountain base glow style
        this.baseGlowRadius = 8 + rng() * 12;
        // Particle sparkle at peak of arc
        this.sparkleAtPeak = rng() > 0.5;

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
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Click spawns a fountain
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            if (this.fountains.length >= this.maxFountains) {
                // Swap-remove instead of shift
                this.fountains[0] = this.fountains[this.fountains.length - 1];
                this.fountains.pop();
            }
            this.fountains.push({
                x: mx,
                y: my,
                life: this.fountainType === 0 ? 180 : 60,
                maxLife: this.fountainType === 0 ? 180 : 60,
                burstTimer: 0,
                burstInterval: this.fountainType === 0 ? 2 : 8,
                exploded: false,
                id: this._tick,
            });
        }
        if (!isClicking) this._clickRegistered = false;

        // Update fountains
        for (let i = this.fountains.length - 1; i >= 0; i--) {
            const f = this.fountains[i];
            f.life--;
            f.burstTimer++;

            if (f.life <= 0) {
                // Swap-remove
                this.fountains[i] = this.fountains[this.fountains.length - 1];
                this.fountains.pop();
                continue;
            }

            if (this.fountainType === 1) {
                if (!f.exploded && f.burstTimer === 1) {
                    this._emitBurst(f.x, f.y, -Math.PI / 2, 0.2, 3, 8 + this._prand(f.id) * 4, f.id);
                }
                if (!f.exploded && f.life < f.maxLife - 30) {
                    f.exploded = true;
                    // Find mortar by searching recent particles near expected position
                    let ex = f.x, ey = f.y - 100;
                    for (let pi = this.particles.length - 1; pi >= 0; pi--) {
                        const p = this.particles[pi];
                        if (p.fountainId === f.id) { ex = p.x; ey = p.y; break; }
                    }
                    this._emitBurst(ex, ey, 0, Math.PI * 2, this.burstSize, 3 + this._prand(f.id + 7) * 4, f.id);
                }
            } else if (this.fountainType === 0) {
                if (f.burstTimer >= f.burstInterval && this.particles.length < this.maxParticles) {
                    f.burstTimer = 0;
                    this._emitBurst(f.x, f.y, -Math.PI / 2, this.spreadAngle, 2, 4 + this._prand(this._tick) * 3, f.id);
                }
            } else if (this.fountainType === 2) {
                if (f.burstTimer >= 10 && this.particles.length < this.maxParticles) {
                    f.burstTimer = 0;
                    this._emitBurst(f.x, f.y, -Math.PI / 2 + (this._prand(this._tick * 3) - 0.5) * 0.5,
                        this.spreadAngle * 2, this.burstSize / 2, 3 + this._prand(this._tick * 5) * 3, f.id);
                }
            } else {
                if (f.burstTimer >= 4 && this.particles.length < this.maxParticles) {
                    f.burstTimer = 0;
                    this._emitBurst(f.x + (this._prand(this._tick * 7) - 0.5) * 20, f.y,
                        -Math.PI / 2, 0.3, 1, 1 + this._prand(this._tick * 11) * 2, f.id);
                }
            }
        }

        // Update particles
        const bendRSq = this._bendRadiusSq;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay;

            if (p.life <= 0 || p.y > h + 20) {
                if (this.particlePool.length < this.maxParticles) this.particlePool.push(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
                continue;
            }

            // Gravity / buoyancy
            if (this.fountainType === 3) {
                p.vy -= this.gravity * 0.3;
                p.vy *= 0.98;
                p.vx += Math.sin(this._tick * 0.05 + p.x * 0.01) * 0.05;
            } else {
                p.vy += this.gravity;
            }

            p.vx += this.windStrength;

            // Mouse bending (use distSq)
            const dx = mx - p.x;
            const dy = my - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < bendRSq && distSq > 1) {
                const invDist = 1 / Math.sqrt(distSq);
                const force = (1 - distSq / bendRSq) * 0.3;
                p.vx += dx * invDist * force;
                p.vy += dy * invDist * force;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99;

            // Edge bounce
            if (this.bounceEdges) {
                if (p.x < 0 || p.x > w) p.vx *= -0.6;
                if (p.y > h) { p.vy *= -0.5; p.y = h; }
            }

            // Confetti rotation
            if (this.fountainType === 2) {
                p.rotation = (p.rotation || 0) + (p.rotSpeed || 0);
            }

            // Ring-buffer trail (no shift)
            if (p.trailIdx === undefined) {
                p.trailBuf = new Array(this.particleTrailLen);
                p.trailIdx = 0;
                p.trailFilled = 0;
            }
            p.trailBuf[p.trailIdx] = p.trailBuf[p.trailIdx] || {};
            p.trailBuf[p.trailIdx].x = p.x;
            p.trailBuf[p.trailIdx].y = p.y;
            p.trailIdx = (p.trailIdx + 1) % this.particleTrailLen;
            if (p.trailFilled < this.particleTrailLen) p.trailFilled++;
        }
    }

    _emitBurst(x, y, baseAngle, spread, count, speed, fountainId) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            let p = this.particlePool.length > 0 ? this.particlePool.pop() : {};
            const pr1 = this._prand(this._tick * 17 + i * 53);
            const pr2 = this._prand(this._tick * 23 + i * 67);
            const angle = baseAngle + (pr1 - 0.5) * spread * 2;
            const spd = speed * (0.6 + pr2 * 0.6);
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = 1.0;
            p.decay = 0.008 + pr1 * 0.012;
            p.size = 2 + pr2 * 4;
            p.fountainId = fountainId;
            // Reset trail ring buffer
            p.trailIdx = 0;
            p.trailFilled = 0;

            // Color
            if (this.colorMode === 1) {
                p.hue = (this._tick * 3 + i * 30) % 360;
                p.sat = 80; p.lit = 60;
            } else if (this.colorMode === 2) {
                const c = this.palette[0];
                p.hue = c.h; p.sat = c.s; p.lit = c.l;
            } else if (this.colorMode === 3) {
                p.hue = pr1 * 360;
                p.sat = 70 + pr2 * 25; p.lit = 55 + pr1 * 25;
            } else {
                const c = this.palette[Math.floor(pr1 * this.palette.length)];
                p.hue = c.h; p.sat = c.s; p.lit = c.l;
            }

            p.shapeType = this.particleShape === 4
                ? Math.floor(pr2 * 4)
                : this.particleShape;

            p.rotation = pr1 * Math.PI * 2;
            p.rotSpeed = (pr2 - 0.5) * 0.15;

            this.particles.push(p);
        }
    }

    draw(ctx) {
        if (this.particles.length === 0 && this.fountains.length === 0) return;

        ctx.globalCompositeOperation = 'lighter';

        // Draw particle trails and bodies
        for (const p of this.particles) {
            if (p.life <= 0.01) continue;

            // Trail from ring buffer
            if (p.trailFilled > 1) {
                const tLen = this.particleTrailLen;
                const filled = p.trailFilled;
                const startIdx = filled < tLen ? 0 : p.trailIdx;
                ctx.lineWidth = p.size * 0.5 * p.life;
                for (let t = 1; t < filled; t++) {
                    const prevPt = p.trailBuf[(startIdx + t - 1) % tLen];
                    const currPt = p.trailBuf[(startIdx + t) % tLen];
                    if (!prevPt || !currPt) continue;
                    const alpha = (t / filled) * p.life * 0.15;
                    ctx.strokeStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(prevPt.x, prevPt.y);
                    ctx.lineTo(currPt.x, currPt.y);
                    ctx.stroke();
                }
            }

            // Particle body
            const alpha = p.life * 0.5;
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${alpha})`;

            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.rotation) ctx.rotate(p.rotation);

            const sz = p.size * (0.5 + p.life * 0.5);
            ctx.beginPath();
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

            // Sparkle at apex (when vy crosses zero = peak of arc)
            if (this.sparkleAtPeak && Math.abs(p.vy) < 0.3 && p.life > 0.5) {
                ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 90%, ${p.life * 0.4})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, sz * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw fountain bases with glow
        for (const f of this.fountains) {
            const c = this.palette[0];
            const lifeT = f.life / f.maxLife;
            // Outer glow
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${lifeT * 0.06})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, this.baseGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${lifeT * 0.15})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 4 + (1 - lifeT) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
