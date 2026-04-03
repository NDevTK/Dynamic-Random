/**
 * @file orbit_playground_effects.js
 * @description Mini solar systems with orbiting celestial bodies. Each system has a
 * central star with planets, moons, and rings. Cursor acts as a gravitational influence.
 * Clicking spawns comets that streak across orbits, perturbing bodies.
 *
 * Modes:
 * 0 - Solar System: Classic planets with colored bands, rings on some, tiny moons
 * 1 - Binary Star: Two stars orbiting each other with shared planetary disk
 * 2 - Atom Model: Electron shells with quantum-style probability clouds
 * 3 - Clockwork Orrery: Steampunk gears and mechanical arms linking orbits
 * 4 - Galaxy Spiral: Thousands of star-dots forming spiral arm patterns
 * 5 - Bubble Universe: Transparent soap-bubble planets with prismatic reflections
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class OrbitPlayground {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 40;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this._centerX = 0;
        this._centerY = 0;

        this._bodies = [];
        this._comets = [];
        this._cometPool = [];

        // Galaxy mode star buffer
        this._galaxyStars = null;
        this._galaxyCount = 0;

        // Binary star phase
        this._binaryPhase = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 40;
        this.intensity = 0.5 + rng() * 0.5;
        this._bodies = [];
        this._comets = [];
        this._binaryPhase = rng() * TAU;

        const W = window.innerWidth, H = window.innerHeight;
        this._centerX = W / 2;
        this._centerY = H / 2;

        if (this.mode === 4) {
            // Galaxy mode: pre-generate star positions as typed array
            this._galaxyCount = 800 + Math.floor(rng() * 600);
            this._galaxyStars = new Float32Array(this._galaxyCount * 4); // x, y, brightness, hueOff
            const arms = 2 + Math.floor(rng() * 3);
            const twist = 2 + rng() * 4;
            for (let i = 0; i < this._galaxyCount; i++) {
                const r = rng() * Math.min(W, H) * 0.4;
                const armAngle = (Math.floor(rng() * arms) / arms) * TAU;
                const spiralAngle = armAngle + (r / (Math.min(W, H) * 0.4)) * twist;
                const scatter = (rng() - 0.5) * (30 + r * 0.15);
                const idx = i * 4;
                this._galaxyStars[idx] = Math.cos(spiralAngle) * r + scatter;
                this._galaxyStars[idx + 1] = Math.sin(spiralAngle) * r * 0.6 + (rng() - 0.5) * scatter;
                this._galaxyStars[idx + 2] = 0.2 + rng() * 0.8; // brightness
                this._galaxyStars[idx + 3] = (rng() - 0.5) * 60; // hue offset
            }
        } else {
            // Generate orbital bodies
            const planetCount = this.mode === 2 ? 12 + Math.floor(rng() * 8) :
                this.mode === 5 ? 5 + Math.floor(rng() * 4) :
                    4 + Math.floor(rng() * 5);

            for (let i = 0; i < planetCount; i++) {
                const orbitR = (this.mode === 2 ? 40 : 60) + i * (20 + rng() * 30);
                const body = {
                    orbitRadius: orbitR,
                    angle: rng() * TAU,
                    speed: (0.005 + rng() * 0.015) * (this.mode === 3 ? 0.5 : 1) / (1 + i * 0.3),
                    size: this.mode === 2 ? 2 + rng() * 3 : (this.mode === 5 ? 8 + rng() * 20 : 3 + rng() * 8),
                    hueOffset: (rng() - 0.5) * 80,
                    hasRing: this.mode === 0 && rng() > 0.7,
                    ringAngle: rng() * 0.4,
                    // Moons
                    moons: [],
                    // Orrery arm length for mode 3
                    armLength: orbitR,
                    // Eccentricity
                    eccentricity: rng() * 0.2,
                    // Phase for wobble
                    phase: rng() * TAU,
                    // Bubble iridescence for mode 5
                    iridPhase: rng() * TAU,
                };

                // Add moons to some planets
                if ((this.mode === 0 || this.mode === 5) && rng() > 0.5) {
                    const moonCount = 1 + Math.floor(rng() * 2);
                    for (let m = 0; m < moonCount; m++) {
                        body.moons.push({
                            orbitRadius: body.size * 2 + 3 + rng() * 8,
                            angle: rng() * TAU,
                            speed: 0.02 + rng() * 0.04,
                            size: 1 + rng() * 2,
                        });
                    }
                }

                this._bodies.push(body);
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mx = mx;
        this._my = my;

        // Spawn comet on click
        if (isClicking && !this._wasClicking) {
            const comet = this._cometPool.length > 0 ? this._cometPool.pop() : {};
            const seed = this.tick * 41;
            const angle = Math.atan2(this._centerY - my, this._centerX - mx) + (_prand(seed) - 0.5) * 0.5;
            comet.x = mx;
            comet.y = my;
            comet.vx = Math.cos(angle) * 4;
            comet.vy = Math.sin(angle) * 4;
            comet.life = 60 + _prand(seed + 1) * 60;
            comet.maxLife = comet.life;
            comet.hue = (this.hue + _prand(seed + 2) * 60) % 360;
            comet.trail = [];
            this._comets.push(comet);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Gravitational cursor influence on bodies
        for (const body of this._bodies) {
            body.angle += body.speed;
            // Moons
            for (const moon of body.moons) {
                moon.angle += moon.speed;
            }

            // Gentle cursor perturbation
            const bx = this._centerX + Math.cos(body.angle) * body.orbitRadius;
            const by = this._centerY + Math.sin(body.angle) * body.orbitRadius * (1 - body.eccentricity);
            const dx = mx - bx, dy = my - by;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200 && dist > 0) {
                body.angle += (dx > 0 ? 0.002 : -0.002) * (1 - dist / 200);
            }
        }

        // Binary phase
        this._binaryPhase += 0.008;

        // Comets
        for (let i = this._comets.length - 1; i >= 0; i--) {
            const c = this._comets[i];
            // Gravity toward center
            const dx = this._centerX - c.x, dy = this._centerY - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                c.vx += (dx / dist) * 0.08;
                c.vy += (dy / dist) * 0.08;
            }
            c.x += c.vx;
            c.y += c.vy;
            c.trail.push(c.x, c.y);
            if (c.trail.length > 40) { c.trail[0] = c.trail[c.trail.length - 2]; c.trail[1] = c.trail[c.trail.length - 1]; c.trail.length -= 2; }
            c.life--;
            if (c.life <= 0) {
                this._cometPool.push(c);
                this._comets[i] = this._comets[this._comets.length - 1];
                this._comets.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const cx = this._centerX;
        const cy = this._centerY;

        if (this.mode === 4) {
            this._drawGalaxy(ctx, cx, cy);
        } else {
            // Draw central star / core
            if (this.mode === 1) this._drawBinaryStar(ctx, cx, cy);
            else this._drawStar(ctx, cx, cy);

            // Orbit paths
            for (const body of this._bodies) {
                if (this.mode === 3) {
                    this._drawOrreryArm(ctx, cx, cy, body);
                } else {
                    // Faint orbit ring
                    ctx.strokeStyle = `hsla(${this.hue}, 30%, 50%, 0.03)`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, body.orbitRadius, body.orbitRadius * (1 - body.eccentricity), 0, 0, TAU);
                    ctx.stroke();
                }

                const bx = cx + Math.cos(body.angle) * body.orbitRadius;
                const by = cy + Math.sin(body.angle) * body.orbitRadius * (1 - body.eccentricity);

                if (this.mode === 0) this._drawPlanet(ctx, bx, by, body);
                else if (this.mode === 2) this._drawElectron(ctx, bx, by, body);
                else if (this.mode === 3) this._drawGear(ctx, bx, by, body);
                else if (this.mode === 5) this._drawBubble(ctx, bx, by, body);

                // Moons
                for (const moon of body.moons) {
                    const mmx = bx + Math.cos(moon.angle) * moon.orbitRadius;
                    const mmy = by + Math.sin(moon.angle) * moon.orbitRadius;
                    ctx.fillStyle = `hsla(${this.hue}, 30%, 70%, 0.15)`;
                    ctx.beginPath();
                    ctx.arc(mmx, mmy, moon.size, 0, TAU);
                    ctx.fill();
                }
            }
        }

        // Comets
        for (const c of this._comets) {
            const lifeRatio = c.life / c.maxLife;
            // Trail
            if (c.trail.length > 2) {
                ctx.strokeStyle = `hsla(${c.hue}, 80%, 70%, ${lifeRatio * 0.2})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(c.trail[0], c.trail[1]);
                for (let t = 2; t < c.trail.length; t += 2) {
                    ctx.lineTo(c.trail[t], c.trail[t + 1]);
                }
                ctx.stroke();
            }
            // Head
            ctx.fillStyle = `hsla(${c.hue}, 90%, 85%, ${lifeRatio * 0.4})`;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 2 + lifeRatio * 3, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawStar(ctx, cx, cy) {
        const pulse = (Math.sin(this.tick * 0.03) + 1) / 2;
        const size = 10 + pulse * 5;
        const alpha = (0.15 + pulse * 0.1) * this.intensity;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 4);
        grad.addColorStop(0, `hsla(${this.hue}, 90%, 90%, ${alpha})`);
        grad.addColorStop(0.3, `hsla(${this.hue + 20}, 80%, 60%, ${alpha * 0.5})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 4, 0, TAU);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsla(${this.hue}, 100%, 95%, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, TAU);
        ctx.fill();
    }

    _drawBinaryStar(ctx, cx, cy) {
        const sep = 25;
        const s1x = cx + Math.cos(this._binaryPhase) * sep;
        const s1y = cy + Math.sin(this._binaryPhase) * sep;
        const s2x = cx - Math.cos(this._binaryPhase) * sep;
        const s2y = cy - Math.sin(this._binaryPhase) * sep;

        const alpha = 0.15 * this.intensity;

        for (const [sx, sy, hOff] of [[s1x, s1y, 0], [s2x, s2y, 40]]) {
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
            grad.addColorStop(0, `hsla(${(this.hue + hOff) % 360}, 90%, 85%, ${alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, 30, 0, TAU);
            ctx.fill();
        }

        // Connecting bridge
        ctx.strokeStyle = `hsla(${this.hue + 20}, 70%, 70%, ${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s1x, s1y);
        ctx.lineTo(s2x, s2y);
        ctx.stroke();
    }

    _drawPlanet(ctx, x, y, body) {
        const hue = (this.hue + body.hueOffset + 360) % 360;
        const alpha = 0.25 * this.intensity;

        // Glow
        ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, body.size * 2, 0, TAU);
        ctx.fill();

        // Body
        ctx.fillStyle = `hsla(${hue}, 50%, 55%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, body.size, 0, TAU);
        ctx.fill();

        // Ring
        if (body.hasRing) {
            ctx.strokeStyle = `hsla(${hue + 30}, 40%, 60%, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x, y, body.size * 2, body.size * 0.4, body.ringAngle, 0, TAU);
            ctx.stroke();
        }
    }

    _drawElectron(ctx, x, y, body) {
        const hue = (this.hue + body.hueOffset + 360) % 360;
        const alpha = 0.3 * this.intensity;

        // Probability cloud (fuzzy)
        const fuzz = Math.sin(this.tick * 0.1 + body.phase) * 3;
        ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha * 0.2})`;
        ctx.beginPath();
        ctx.arc(x + fuzz, y + fuzz, body.size * 2.5, 0, TAU);
        ctx.fill();

        // Electron dot
        ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, body.size, 0, TAU);
        ctx.fill();
    }

    _drawGear(ctx, x, y, body) {
        const hue = (this.hue + body.hueOffset + 360) % 360;
        const alpha = 0.2 * this.intensity;
        const teeth = 6 + Math.floor(body.size);
        const innerR = body.size * 0.7;
        const outerR = body.size * 1.2;
        const rotation = body.angle * 3; // Gears spin with orbit

        ctx.strokeStyle = `hsla(${hue}, 40%, 60%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let t = 0; t < teeth; t++) {
            const a1 = rotation + (t / teeth) * TAU;
            const a2 = rotation + ((t + 0.5) / teeth) * TAU;
            ctx.lineTo(x + Math.cos(a1) * outerR, y + Math.sin(a1) * outerR);
            ctx.lineTo(x + Math.cos(a2) * innerR, y + Math.sin(a2) * innerR);
        }
        ctx.closePath();
        ctx.stroke();

        // Center axle
        ctx.fillStyle = `hsla(${hue}, 30%, 50%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, TAU);
        ctx.fill();
    }

    _drawBubble(ctx, x, y, body) {
        const hue = (this.hue + body.hueOffset + 360) % 360;
        const alpha = 0.15 * this.intensity;
        const irid = (Math.sin(body.iridPhase + this.tick * 0.02) + 1) / 2;

        // Iridescent outline
        ctx.strokeStyle = `hsla(${(hue + irid * 120) % 360}, 70%, 75%, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, body.size, 0, TAU);
        ctx.stroke();

        // Highlight
        ctx.fillStyle = `hsla(${(hue + irid * 60) % 360}, 80%, 90%, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(x - body.size * 0.3, y - body.size * 0.3, body.size * 0.25, 0, TAU);
        ctx.fill();

        // Inner fill
        ctx.fillStyle = `hsla(${hue}, 50%, 60%, ${alpha * 0.08})`;
        ctx.beginPath();
        ctx.arc(x, y, body.size, 0, TAU);
        ctx.fill();
    }

    _drawOrreryArm(ctx, cx, cy, body) {
        const bx = cx + Math.cos(body.angle) * body.orbitRadius;
        const by = cy + Math.sin(body.angle) * body.orbitRadius * (1 - body.eccentricity);
        const alpha = 0.08 * this.intensity;

        // Mechanical arm
        ctx.strokeStyle = `hsla(${this.hue + 30}, 30%, 55%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Joint dot
        ctx.fillStyle = `hsla(${this.hue + 30}, 40%, 60%, ${alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, TAU);
        ctx.fill();
    }

    _drawGalaxy(ctx, cx, cy) {
        const stars = this._galaxyStars;
        const count = this._galaxyCount;
        const rotation = this.tick * 0.0005;
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const alpha = 0.15 * this.intensity;

        // Cursor influence
        const mdx = this._mx - cx;
        const mdy = this._my - cy;

        for (let i = 0; i < count; i++) {
            const idx = i * 4;
            const sx = stars[idx];
            const sy = stars[idx + 1];
            const brightness = stars[idx + 2];
            const hueOff = stars[idx + 3];

            // Rotate
            const rx = sx * cosR - sy * sinR + cx;
            const ry = sx * sinR + sy * cosR + cy;

            // Cursor warp
            const dx = rx - this._mx, dy = ry - this._my;
            const distSq = dx * dx + dy * dy;
            let fx = rx, fy = ry;
            if (distSq < 40000) { // 200^2
                const dist = Math.sqrt(distSq);
                const push = (1 - dist / 200) * 15;
                fx += (dx / dist) * push;
                fy += (dy / dist) * push;
            }

            const size = 0.5 + brightness * 1.5;
            const hue = (this.hue + hueOff + 360) % 360;
            const a = brightness * alpha * (0.7 + Math.sin(this.tick * 0.02 + i * 0.1) * 0.3);

            ctx.fillStyle = `hsla(${hue}, 60%, ${60 + brightness * 30}%, ${a})`;
            ctx.fillRect(fx - size / 2, fy - size / 2, size, size);
        }

        // Central bulge glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        grad.addColorStop(0, `hsla(${this.hue + 20}, 80%, 80%, ${alpha * 0.4})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, TAU);
        ctx.fill();
    }
}
