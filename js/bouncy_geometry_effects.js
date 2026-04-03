/**
 * @file bouncy_geometry_effects.js
 * @description Physics-based bouncing geometric shapes that collide with screen edges
 * and each other. Cursor acts as a paddle/bumper. Clicking launches new shapes.
 * Shapes leave fading trails and create satisfying impact effects on collision.
 *
 * Modes:
 * 0 - Billiards: Circles that bounce and transfer momentum on collision, pool table feel
 * 1 - Crystal Shatter: Polygons that split into smaller pieces on hard impacts
 * 2 - Jelly Bounce: Soft bodies that squash and stretch on impact, wobbly physics
 * 3 - Pinball Machine: Shapes bounce off bumpers placed around the screen, scoring rings
 * 4 - Zero-G Pong: Shapes float and bounce slowly, leaving long glowing trails
 * 5 - Explosive Bounce: Each collision creates expanding shockwave rings and sparks
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class BouncyGeometry {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this._shapes = [];
        this._maxShapes = 20;

        // Impact effects
        this._impacts = [];
        this._impactPool = [];

        // Trails for zero-G mode
        this._trails = [];

        // Pinball bumpers
        this._bumpers = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 200;
        this.intensity = 0.5 + rng() * 0.5;
        this._shapes = [];
        this._impacts = [];
        this._trails = [];
        this._bumpers = [];

        const W = window.innerWidth, H = window.innerHeight;

        this._maxShapes = this.mode === 1 ? 30 : this.mode === 4 ? 10 : 15;

        // Initial shapes
        const count = this.mode === 4 ? 5 + Math.floor(rng() * 4) : 8 + Math.floor(rng() * 8);
        for (let i = 0; i < count && i < this._maxShapes; i++) {
            this._shapes.push(this._createShape(rng, W, H));
        }

        // Pinball bumpers
        if (this.mode === 3) {
            const bumperCount = 4 + Math.floor(rng() * 4);
            for (let i = 0; i < bumperCount; i++) {
                this._bumpers.push({
                    x: W * 0.15 + rng() * W * 0.7,
                    y: H * 0.15 + rng() * H * 0.7,
                    radius: 20 + rng() * 30,
                    hue: (this.hue + rng() * 60) % 360,
                    flash: 0,
                });
            }
        }
    }

    _createShape(rng, W, H) {
        const sides = this.mode === 0 ? 0 : (3 + Math.floor(rng() * 5)); // 0 = circle
        const speed = this.mode === 4 ? 0.5 + rng() * 1 : 1 + rng() * 3;
        const angle = rng() * TAU;
        return {
            x: W * 0.1 + rng() * W * 0.8,
            y: H * 0.1 + rng() * H * 0.8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: this.mode === 2 ? 12 + rng() * 20 : 6 + rng() * 14,
            sides,
            rotation: rng() * TAU,
            rotSpeed: (rng() - 0.5) * 0.05,
            hueOffset: (rng() - 0.5) * 80,
            mass: 1,
            // Jelly squash
            squashX: 1,
            squashY: 1,
            squashVx: 0,
            squashVy: 0,
            // Trail for zero-G
            trail: [],
        };
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;

        const W = window.innerWidth, H = window.innerHeight;

        // Click to spawn
        if (isClicking && !this._wasClicking && this._shapes.length < this._maxShapes) {
            const seed = this.tick * 43;
            const angle = Math.atan2(my - this._pmy, mx - this._pmx);
            const s = {
                x: mx,
                y: my,
                vx: Math.cos(angle) * 4 + (mx - this._pmx) * 0.3,
                vy: Math.sin(angle) * 4 + (my - this._pmy) * 0.3,
                size: 8 + _prand(seed) * 12,
                sides: this.mode === 0 ? 0 : 3 + Math.floor(_prand(seed + 1) * 5),
                rotation: _prand(seed + 2) * TAU,
                rotSpeed: (_prand(seed + 3) - 0.5) * 0.1,
                hueOffset: (_prand(seed + 4) - 0.5) * 80,
                mass: 1,
                squashX: 1, squashY: 1, squashVx: 0, squashVy: 0,
                trail: [],
            };
            this._shapes.push(s);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Physics update
        for (const s of this._shapes) {
            // Cursor bumper - push shapes away from mouse
            const dx = s.x - mx, dy = s.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const bumperRadius = 40;
            if (dist < bumperRadius + s.size && dist > 0) {
                const overlap = bumperRadius + s.size - dist;
                const nx = dx / dist, ny = dy / dist;
                s.vx += nx * overlap * 0.3;
                s.vy += ny * overlap * 0.3;
                // Add mouse velocity
                s.vx += (mx - this._pmx) * 0.2;
                s.vy += (my - this._pmy) * 0.2;
                this._spawnImpact(s.x, s.y, s.hueOffset);
            }

            // Gravity for non-zero-G modes
            if (this.mode !== 4) {
                s.vy += 0.05; // Slight gravity
            }

            // Wall collisions
            const restitution = this.mode === 2 ? 0.85 : 0.95;
            if (s.x - s.size < 0) { s.x = s.size; s.vx = Math.abs(s.vx) * restitution; this._wallHit(s, 'left'); }
            if (s.x + s.size > W) { s.x = W - s.size; s.vx = -Math.abs(s.vx) * restitution; this._wallHit(s, 'right'); }
            if (s.y - s.size < 0) { s.y = s.size; s.vy = Math.abs(s.vy) * restitution; this._wallHit(s, 'top'); }
            if (s.y + s.size > H) { s.y = H - s.size; s.vy = -Math.abs(s.vy) * restitution; this._wallHit(s, 'bottom'); }

            // Pinball bumpers
            if (this.mode === 3) {
                for (const b of this._bumpers) {
                    const bx = s.x - b.x, by = s.y - b.y;
                    const bd = Math.sqrt(bx * bx + by * by);
                    if (bd < b.radius + s.size && bd > 0) {
                        const nx = bx / bd, ny = by / bd;
                        s.vx += nx * 3;
                        s.vy += ny * 3;
                        b.flash = 1;
                        this._spawnImpact(s.x, s.y, s.hueOffset);
                    }
                }
            }

            // Damping
            const dampFactor = this.mode === 4 ? 0.999 : 0.998;
            s.vx *= dampFactor;
            s.vy *= dampFactor;

            s.x += s.vx;
            s.y += s.vy;
            s.rotation += s.rotSpeed;

            // Jelly squash physics
            if (this.mode === 2) {
                const targetSx = 1 - Math.abs(s.vx) * 0.02;
                const targetSy = 1 - Math.abs(s.vy) * 0.02;
                s.squashVx += (targetSx - s.squashX) * 0.1;
                s.squashVy += (targetSy - s.squashY) * 0.1;
                s.squashVx *= 0.85;
                s.squashVy *= 0.85;
                s.squashX += s.squashVx;
                s.squashY += s.squashVy;
            }

            // Zero-G trails (ring buffer)
            if (this.mode === 4) {
                if (s.trail.length < 60) {
                    s.trail.push(s.x, s.y);
                } else {
                    if (s._tIdx === undefined) s._tIdx = 0;
                    s.trail[s._tIdx] = s.x;
                    s.trail[s._tIdx + 1] = s.y;
                    s._tIdx = (s._tIdx + 2) % 60;
                }
            }
        }

        // Simple shape-to-shape collisions
        for (let i = 0; i < this._shapes.length; i++) {
            for (let j = i + 1; j < this._shapes.length; j++) {
                const a = this._shapes[i], b = this._shapes[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = a.size + b.size;
                if (dist < minDist && dist > 0) {
                    // Elastic collision
                    const nx = dx / dist, ny = dy / dist;
                    const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
                    const dvn = dvx * nx + dvy * ny;
                    if (dvn > 0) {
                        a.vx -= dvn * nx * 0.5;
                        a.vy -= dvn * ny * 0.5;
                        b.vx += dvn * nx * 0.5;
                        b.vy += dvn * ny * 0.5;
                        // Separate
                        const overlap = (minDist - dist) / 2;
                        a.x -= nx * overlap;
                        a.y -= ny * overlap;
                        b.x += nx * overlap;
                        b.y += ny * overlap;

                        this._spawnImpact((a.x + b.x) / 2, (a.y + b.y) / 2, a.hueOffset);
                    }
                }
            }
        }

        // Bumper flash decay
        for (const b of this._bumpers) {
            b.flash *= 0.9;
        }

        // Impact decay
        for (let i = this._impacts.length - 1; i >= 0; i--) {
            const imp = this._impacts[i];
            imp.life--;
            imp.radius += imp.speed;
            if (imp.life <= 0) {
                this._impactPool.push(imp);
                this._impacts[i] = this._impacts[this._impacts.length - 1];
                this._impacts.pop();
            }
        }
    }

    _wallHit(s, side) {
        if (this.mode === 5) {
            this._spawnImpact(
                side === 'left' ? 0 : side === 'right' ? window.innerWidth : s.x,
                side === 'top' ? 0 : side === 'bottom' ? window.innerHeight : s.y,
                s.hueOffset
            );
        }
        if (this.mode === 2) {
            // Jelly squash on wall hit
            const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
            if (side === 'left' || side === 'right') {
                s.squashVx = -speed * 0.1;
                s.squashVy = speed * 0.05;
            } else {
                s.squashVx = speed * 0.05;
                s.squashVy = -speed * 0.1;
            }
        }
    }

    _spawnImpact(x, y, hueOffset) {
        let imp;
        if (this._impacts.length >= 25) {
            // Recycle oldest impact instead of silently dropping
            imp = this._impacts[0];
            this._impacts[0] = this._impacts[this._impacts.length - 1];
            this._impacts.pop();
        } else {
            imp = this._impactPool.length > 0 ? this._impactPool.pop() : {};
        }
        imp.x = x;
        imp.y = y;
        imp.radius = 5;
        imp.speed = this.mode === 5 ? 5 : (this.mode === 2 ? 3 : 2);
        imp.life = this.mode === 5 ? 20 : 15;
        imp.maxLife = imp.life;
        imp.hueOffset = hueOffset;
        this._impacts.push(imp);
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Billiards mode - table edge glow
        if (this.mode === 0) {
            const W = window.innerWidth, H = window.innerHeight;
            ctx.strokeStyle = `hsla(${this.hue + 60}, 40%, 35%, 0.04)`;
            ctx.lineWidth = 6;
            ctx.strokeRect(10, 10, W - 20, H - 20);
        }

        // Zero-G trails with ethereal glow
        if (this.mode === 4) {
            for (const s of this._shapes) {
                if (s.trail.length < 4) continue;
                const hue = (this.hue + s.hueOffset + 360) % 360;
                // Wider glow trail
                ctx.strokeStyle = `hsla(${hue}, 50%, 55%, 0.02)`;
                ctx.lineWidth = s.size * 1.5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(s.trail[0], s.trail[1]);
                for (let t = 2; t < s.trail.length; t += 2) {
                    ctx.lineTo(s.trail[t], s.trail[t + 1]);
                }
                ctx.stroke();
                // Thin bright core trail
                ctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.06)`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Bumpers
        for (const b of this._bumpers) {
            const bAlpha = (0.1 + b.flash * 0.3) * this.intensity;
            ctx.fillStyle = `hsla(${b.hue}, 60%, 60%, ${bAlpha})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, TAU);
            ctx.fill();
            // Ring
            ctx.strokeStyle = `hsla(${b.hue}, 70%, 75%, ${bAlpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius + 3, 0, TAU);
            ctx.stroke();
        }

        // Shapes
        for (const s of this._shapes) {
            const hue = (this.hue + s.hueOffset + 360) % 360;
            const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
            const speedGlow = Math.min(1, speed * 0.15);
            const alpha = (0.15 + speedGlow * 0.15) * this.intensity;

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);

            if (this.mode === 2) {
                ctx.scale(s.squashX, s.squashY);
            }

            // Glow
            if (speedGlow > 0.1) {
                ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(0, 0, s.size * 1.8, 0, TAU);
                ctx.fill();
            }

            // Body
            ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${alpha})`;
            if (s.sides === 0) {
                ctx.beginPath();
                ctx.arc(0, 0, s.size, 0, TAU);
                ctx.fill();
            } else {
                ctx.beginPath();
                for (let v = 0; v <= s.sides; v++) {
                    const a = (v / s.sides) * TAU;
                    if (v === 0) ctx.moveTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
                    else ctx.lineTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
                }
                ctx.closePath();
                ctx.fill();
            }

            // Outline
            ctx.strokeStyle = `hsla(${hue}, 80%, 80%, ${alpha * 0.6})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }

        // Impact rings
        for (const imp of this._impacts) {
            const lifeRatio = imp.life / imp.maxLife;
            const hue = (this.hue + imp.hueOffset + 360) % 360;
            const alpha = lifeRatio * 0.2 * this.intensity;
            ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${alpha})`;
            ctx.lineWidth = this.mode === 5 ? 2 : 1;
            ctx.beginPath();
            ctx.arc(imp.x, imp.y, imp.radius, 0, TAU);
            ctx.stroke();
        }

        ctx.restore();
    }
}
