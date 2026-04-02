/**
 * @file gravity_marble_effects.js
 * @description Physics-based marble simulation where glowing orbs roll around the screen
 * influenced by gravity, bounce off walls and each other, and are pulled by the cursor.
 * Each marble leaves luminous trails and creates satisfying collision sparks.
 *
 * Modes:
 * 0 - Gravity Pool: marbles fall with gravity, cursor is a gravity well
 * 1 - Zero-G Billiards: no gravity, marbles drift and collide in space
 * 2 - Magnetic Marbles: marbles have alternating polarity, attract/repel each other
 * 3 - Lava Lamp: marbles have buoyancy, rise and fall with heat from cursor
 * 4 - Pinball Chaos: bumpers spawn around screen, marbles bounce energetically
 * 5 - Orbital Mechanics: marbles orbit the cursor like planets with realistic physics
 */

const TAU = Math.PI * 2;

export class GravityMarbles {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 30;
        this.saturation = 70;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._rng = Math.random;

        this.marbles = [];
        this.marbleCount = 8;

        // Trail system
        this.trails = []; // Each marble has its own trail ring buffer
        this.trailLength = 30;

        // Collision sparks
        this.sparks = [];
        this.sparkPool = [];

        // Bumpers (pinball mode)
        this.bumpers = [];

        // Gravity direction
        this.gravityX = 0;
        this.gravityY = 0.15;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[Math.floor(rng() * palette.length)].h : 30;
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.8;
        this.tick = 0;

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.marbleCount = 6 + Math.floor(rng() * 8);
        this.marbles = [];
        this.trails = [];
        this.sparks = [];

        for (let i = 0; i < this.marbleCount; i++) {
            this.marbles.push({
                x: rng() * w, y: rng() * h,
                vx: (rng() - 0.5) * 3, vy: (rng() - 0.5) * 3,
                radius: 6 + rng() * 12,
                mass: 1,
                hueOffset: rng() * 60 - 30,
                polarity: rng() > 0.5 ? 1 : -1, // For magnetic mode
                temperature: 0.5, // For lava lamp
                glow: 0,
                trailIdx: 0
            });
            this.marbles[i].mass = this.marbles[i].radius * 0.1;
            this.trails.push(new Float64Array(this.trailLength * 2)); // x,y pairs
        }

        if (this.mode === 0) {
            this.gravityY = 0.08 + rng() * 0.12;
        } else if (this.mode === 4) {
            // Spawn bumpers
            this.bumpers = [];
            const bumperCount = 5 + Math.floor(rng() * 6);
            for (let i = 0; i < bumperCount; i++) {
                this.bumpers.push({
                    x: w * 0.1 + rng() * w * 0.8,
                    y: h * 0.1 + rng() * h * 0.8,
                    radius: 15 + rng() * 25,
                    bounciness: 1.2 + rng() * 0.8,
                    flash: 0,
                    hueOffset: rng() * 40
                });
            }
        } else if (this.mode === 5) {
            // Orbital - give marbles tangential velocity
            for (const m of this.marbles) {
                const dx = m.x - w / 2, dy = m.y - h / 2;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = Math.sqrt(50 / (dist + 50)) * 2;
                m.vx = (-dy / dist) * speed;
                m.vy = (dx / dist) * speed;
            }
        }
    }

    update(mx, my, isClicking) {
        this._prevMouseX = this._mouseX;
        this._prevMouseY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;
        const dx = mx - this._prevMouseX;
        const dy = my - this._prevMouseY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._isClicking = isClicking;
        this.tick++;

        const w = window.innerWidth, h = window.innerHeight;

        // Update marbles based on mode
        for (let i = 0; i < this.marbles.length; i++) {
            const m = this.marbles[i];

            // Mode-specific forces
            if (this.mode === 0) this._applyGravityPool(m);
            else if (this.mode === 2) this._applyMagnetic(m, i);
            else if (this.mode === 3) this._applyLavaLamp(m);
            else if (this.mode === 5) this._applyOrbital(m);

            // Cursor interaction (all modes)
            const cdx = mx - m.x, cdy = my - m.y;
            const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cDist > 0 && cDist < 200) {
                const force = isClicking ? 0.5 : 0.1;
                const pull = force * (200 - cDist) / 200 / cDist;
                m.vx += cdx * pull;
                m.vy += cdy * pull;
                m.glow = Math.min(1, m.glow + 0.05);
            } else {
                m.glow *= 0.95;
            }

            // Integrate
            m.x += m.vx; m.y += m.vy;

            // Wall collisions
            const restitution = this.mode === 4 ? 0.95 : 0.7;
            if (m.x - m.radius < 0) { m.x = m.radius; m.vx = Math.abs(m.vx) * restitution; }
            if (m.x + m.radius > w) { m.x = w - m.radius; m.vx = -Math.abs(m.vx) * restitution; }
            if (m.y - m.radius < 0) { m.y = m.radius; m.vy = Math.abs(m.vy) * restitution; }
            if (m.y + m.radius > h) { m.y = h - m.radius; m.vy = -Math.abs(m.vy) * restitution; }

            // Friction
            const friction = this.mode === 1 ? 0.999 : (this.mode === 4 ? 0.998 : 0.995);
            m.vx *= friction; m.vy *= friction;

            // Record trail
            const tIdx = m.trailIdx % this.trailLength;
            this.trails[i][tIdx * 2] = m.x;
            this.trails[i][tIdx * 2 + 1] = m.y;
            m.trailIdx++;
        }

        // Marble-marble collisions
        for (let i = 0; i < this.marbles.length; i++) {
            for (let j = i + 1; j < this.marbles.length; j++) {
                this._resolveCollision(this.marbles[i], this.marbles[j]);
            }
        }

        // Bumper collisions (pinball mode)
        if (this.mode === 4) {
            for (const bumper of this.bumpers) {
                bumper.flash *= 0.9;
                for (const m of this.marbles) {
                    const bdx = m.x - bumper.x, bdy = m.y - bumper.y;
                    const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
                    const minDist = m.radius + bumper.radius;
                    if (bDist < minDist && bDist > 0) {
                        // Bounce off bumper
                        const nx = bdx / bDist, ny = bdy / bDist;
                        const relV = m.vx * nx + m.vy * ny;
                        if (relV < 0) {
                            m.vx -= 2 * relV * nx * bumper.bounciness;
                            m.vy -= 2 * relV * ny * bumper.bounciness;
                            bumper.flash = 1;
                            this._spawnSparks(m.x, m.y, 4);
                        }
                        // Push out of bumper
                        const overlap = minDist - bDist;
                        m.x += nx * overlap;
                        m.y += ny * overlap;
                    }
                }
            }
        }

        // Decay sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx; s.y += s.vy;
            s.vy += 0.05;
            s.life--;
            if (s.life <= 0) {
                this.sparkPool.push(s);
                this.sparks[i] = this.sparks[this.sparks.length - 1];
                this.sparks.pop();
            }
        }
    }

    _applyGravityPool(m) {
        m.vy += this.gravityY;
    }

    _applyMagnetic(m, idx) {
        for (let j = 0; j < this.marbles.length; j++) {
            if (j === idx) continue;
            const other = this.marbles[j];
            const dx = other.x - m.x, dy = other.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 250) {
                // Like poles repel, opposite attract
                const polarity = m.polarity * other.polarity;
                const force = -polarity * 0.3 / (dist * dist) * 100;
                m.vx += (dx / dist) * force;
                m.vy += (dy / dist) * force;
            }
        }
    }

    _applyLavaLamp(m) {
        // Temperature from cursor proximity
        const dx = this._mouseX - m.x, dy = this._mouseY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
            m.temperature = Math.min(1, m.temperature + 0.01);
        } else {
            m.temperature = Math.max(0, m.temperature - 0.003);
        }

        // Buoyancy: hot rises, cold sinks
        const buoyancy = (m.temperature - 0.5) * -0.1;
        m.vy += buoyancy;
        // Slight horizontal wobble
        m.vx += Math.sin(this.tick * 0.02 + m.hueOffset) * 0.02;
    }

    _applyOrbital(m) {
        const dx = this._mouseX - m.x, dy = this._mouseY - m.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist > 10) {
            // Gravitational pull (inverse square)
            const force = 50 / distSq;
            m.vx += (dx / dist) * force;
            m.vy += (dy / dist) * force;
        }
    }

    _resolveCollision(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0) {
            // Elastic collision
            const nx = dx / dist, ny = dy / dist;
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
            const dvDotN = dvx * nx + dvy * ny;

            if (dvDotN > 0) {
                const totalMass = a.mass + b.mass;
                const impulse = 2 * dvDotN / totalMass;

                a.vx -= impulse * b.mass * nx;
                a.vy -= impulse * b.mass * ny;
                b.vx += impulse * a.mass * nx;
                b.vy += impulse * a.mass * ny;

                // Spawn sparks at collision point
                const cx = (a.x + b.x) / 2;
                const cy = (a.y + b.y) / 2;
                const energy = Math.abs(dvDotN);
                if (energy > 0.5) {
                    this._spawnSparks(cx, cy, Math.min(6, Math.floor(energy)));
                }
            }

            // Separate overlapping marbles
            const overlap = minDist - dist;
            const sep = overlap / 2;
            a.x -= nx * sep; a.y -= ny * sep;
            b.x += nx * sep; b.y += ny * sep;
        }
    }

    _spawnSparks(x, y, count) {
        for (let i = 0; i < count && this.sparks.length < 60; i++) {
            const spark = this.sparkPool.length > 0 ? this.sparkPool.pop() : {};
            const angle = Math.random() * TAU;
            const speed = 1 + Math.random() * 3;
            spark.x = x; spark.y = y;
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.life = 10 + Math.floor(Math.random() * 10);
            spark.maxLife = spark.life;
            this.sparks.push(spark);
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw trails
        for (let i = 0; i < this.marbles.length; i++) {
            const m = this.marbles[i];
            const hue = (this.hue + m.hueOffset + 360) % 360;
            const trail = this.trails[i];
            const len = Math.min(m.trailIdx, this.trailLength);

            if (len > 2) {
                ctx.lineWidth = m.radius * 0.4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let t = 1; t < len; t++) {
                    const idx1 = ((m.trailIdx - len + t - 1 + this.trailLength) % this.trailLength);
                    const idx2 = ((m.trailIdx - len + t + this.trailLength) % this.trailLength);
                    const x1 = trail[idx1 * 2], y1 = trail[idx1 * 2 + 1];
                    const x2 = trail[idx2 * 2], y2 = trail[idx2 * 2 + 1];
                    if (x1 === 0 && y1 === 0) continue;

                    const alpha = (t / len) * 0.1 * this.intensity;
                    ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 60%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }

        // Draw bumpers (pinball mode)
        if (this.mode === 4) {
            for (const bumper of this.bumpers) {
                const hue = (this.hue + bumper.hueOffset + 360) % 360;
                const alpha = (0.05 + bumper.flash * 0.3) * this.intensity;

                // Bumper ring
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(bumper.x, bumper.y, bumper.radius, 0, TAU);
                ctx.stroke();

                // Flash glow
                if (bumper.flash > 0.1) {
                    const g = ctx.createRadialGradient(bumper.x, bumper.y, 0, bumper.x, bumper.y, bumper.radius * 2);
                    g.addColorStop(0, `hsla(${hue}, 90%, 90%, ${bumper.flash * 0.2 * this.intensity})`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(bumper.x, bumper.y, bumper.radius * 2, 0, TAU);
                    ctx.fill();
                }
            }
        }

        // Draw marbles
        for (const m of this.marbles) {
            const hue = (this.hue + m.hueOffset + 360) % 360;

            // Outer glow
            const glowR = m.radius * (2 + m.glow * 2);
            const g = ctx.createRadialGradient(m.x, m.y, m.radius * 0.5, m.x, m.y, glowR);
            g.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 70%, ${(0.15 + m.glow * 0.2) * this.intensity})`);
            g.addColorStop(0.5, `hsla(${hue}, ${this.saturation}%, 60%, ${(0.05 + m.glow * 0.1) * this.intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(m.x, m.y, glowR, 0, TAU);
            ctx.fill();

            // Marble body
            const bodyG = ctx.createRadialGradient(
                m.x - m.radius * 0.3, m.y - m.radius * 0.3, 0,
                m.x, m.y, m.radius
            );
            bodyG.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 90%, ${0.3 * this.intensity})`);
            bodyG.addColorStop(0.7, `hsla(${hue}, ${this.saturation}%, 60%, ${0.2 * this.intensity})`);
            bodyG.addColorStop(1, `hsla(${hue}, ${this.saturation}%, 40%, ${0.1 * this.intensity})`);
            ctx.fillStyle = bodyG;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius, 0, TAU);
            ctx.fill();

            // Specular highlight
            ctx.fillStyle = `hsla(${hue}, 20%, 95%, ${0.15 * this.intensity})`;
            ctx.beginPath();
            ctx.arc(m.x - m.radius * 0.25, m.y - m.radius * 0.25, m.radius * 0.3, 0, TAU);
            ctx.fill();

            // Polarity indicator (magnetic mode)
            if (this.mode === 2) {
                ctx.fillStyle = m.polarity > 0
                    ? `hsla(0, 80%, 70%, 0.2)`
                    : `hsla(220, 80%, 70%, 0.2)`;
                ctx.font = `${m.radius}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(m.polarity > 0 ? '+' : '-', m.x, m.y);
            }

            // Temperature indicator (lava lamp mode)
            if (this.mode === 3) {
                const tempHue = 60 - m.temperature * 60; // Yellow(cool) to Red(hot)
                ctx.strokeStyle = `hsla(${tempHue}, 90%, 70%, ${m.temperature * 0.3 * this.intensity})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius + 2, 0, TAU * m.temperature);
                ctx.stroke();
            }
        }

        // Draw sparks
        for (const s of this.sparks) {
            const alpha = (s.life / s.maxLife) * 0.5 * this.intensity;
            ctx.fillStyle = `hsla(${this.hue + 30}, 90%, 85%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 1.5, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }
}
