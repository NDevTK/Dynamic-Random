/**
 * @file firework_orchestra_effects.js
 * @description Multi-stage firework system where clicks launch rockets that explode
 * into seed-dependent patterns. Each universe gets a unique firework "choreography"
 * with different shell types, colors, and burst geometries.
 *
 * Modes:
 * 0 - Classic: Traditional round bursts with glitter trails and gravity
 * 1 - Chrysanthemum: Long-tailed streaming bursts that droop like flowers
 * 2 - Willow: Graceful arching trails that weep downward with golden sparkle
 * 3 - Peony Ring: Double-ring explosions with inner/outer color contrast
 * 4 - Crossette: Fragments that re-explode into smaller cross patterns
 * 5 - Kamuro: Massive golden cascading falls with long-lived sparks
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class FireworkOrchestra {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 30;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Active rockets ascending
        this.rockets = [];
        this._rocketPool = [];
        this.maxRockets = 8;

        // Active burst particles
        this.bursts = [];
        this._burstPool = [];
        this.maxBursts = 600;

        // Secondary explosions queue
        this._reExplodeQueue = [];

        // Auto-launch timer
        this._autoTimer = 0;
        this._autoInterval = 60;

        // Palette for this seed
        this._palette = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 30;
        this.intensity = 0.5 + rng() * 0.5;
        this.rockets = [];
        this.bursts = [];
        this._reExplodeQueue = [];
        this._autoInterval = 40 + Math.floor(rng() * 80);
        this._autoTimer = Math.floor(rng() * this._autoInterval);

        // Build a color palette of 4-6 firework colors
        this._palette = [];
        const count = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
            this._palette.push({
                h: (this.hue + i * (360 / count) + rng() * 30) % 360,
                s: 60 + rng() * 30,
                l: 55 + rng() * 25,
            });
        }
    }

    _pickColor(seed) {
        return this._palette[Math.floor(_prand(seed) * this._palette.length)] || { h: this.hue, s: 80, l: 70 };
    }

    _launchRocket(x, targetY) {
        if (this.rockets.length >= this.maxRockets) return;
        const rocket = this._rocketPool.length > 0 ? this._rocketPool.pop() : {};
        const W = window.innerWidth;
        const H = window.innerHeight;
        rocket.x = x || (W * 0.2 + _prand(this.tick * 37) * W * 0.6);
        rocket.y = H + 10;
        rocket.targetY = targetY || (H * 0.15 + _prand(this.tick * 53) * H * 0.35);
        rocket.vx = (_prand(this.tick * 71) - 0.5) * 2;
        rocket.vy = -(6 + _prand(this.tick * 91) * 4);
        rocket.trail = [];
        rocket.maxTrail = 12;
        rocket.hue = this._pickColor(this.tick * 13).h;
        rocket.exploded = false;
        rocket.seed = this.tick;
        this.rockets.push(rocket);
    }

    _explode(x, y, seed) {
        const color = this._pickColor(seed);
        const color2 = this._pickColor(seed + 7);

        if (this.mode === 0) {
            this._burstClassic(x, y, seed, color);
        } else if (this.mode === 1) {
            this._burstChrysanthemum(x, y, seed, color);
        } else if (this.mode === 2) {
            this._burstWillow(x, y, seed, color);
        } else if (this.mode === 3) {
            this._burstPeonyRing(x, y, seed, color, color2);
        } else if (this.mode === 4) {
            this._burstCrossette(x, y, seed, color);
        } else if (this.mode === 5) {
            this._burstKamuro(x, y, seed, color);
        }
    }

    _spawnBurst(x, y, vx, vy, life, color, size, type) {
        if (this.bursts.length >= this.maxBursts) return;
        const b = this._burstPool.length > 0 ? this._burstPool.pop() : {};
        b.x = x; b.y = y;
        b.vx = vx; b.vy = vy;
        b.life = life; b.maxLife = life;
        b.h = color.h; b.s = color.s; b.l = color.l;
        b.size = size;
        b.type = type || 'dot'; // 'dot', 'streak', 'glitter', 'crossette'
        b.trail = [];
        b.maxTrail = type === 'streak' ? 8 : (type === 'glitter' ? 4 : 0);
        this.bursts.push(b);
    }

    _burstClassic(x, y, seed, color) {
        const count = 40 + Math.floor(_prand(seed) * 30);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU + _prand(seed + i) * 0.3;
            const speed = 3 + _prand(seed + i + 100) * 5;
            const life = 30 + _prand(seed + i + 200) * 30;
            this._spawnBurst(x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                life, color, 1.5 + _prand(seed + i + 300) * 2, 'dot');
        }
        // Glitter core
        for (let i = 0; i < 10; i++) {
            const angle = _prand(seed + i + 500) * TAU;
            const speed = 1 + _prand(seed + i + 600) * 2;
            this._spawnBurst(x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                50 + _prand(seed + i + 700) * 30,
                { h: (color.h + 30) % 360, s: 40, l: 90 }, 1, 'glitter');
        }
    }

    _burstChrysanthemum(x, y, seed, color) {
        const count = 60 + Math.floor(_prand(seed) * 40);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU + _prand(seed + i) * 0.2;
            const speed = 2 + _prand(seed + i + 100) * 4;
            const life = 50 + _prand(seed + i + 200) * 40;
            this._spawnBurst(x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                life, color, 1 + _prand(seed + i + 300) * 1.5, 'streak');
        }
    }

    _burstWillow(x, y, seed, color) {
        const count = 50 + Math.floor(_prand(seed) * 30);
        const gold = { h: 42, s: 90, l: 70 };
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU + _prand(seed + i) * 0.15;
            const speed = 1.5 + _prand(seed + i + 100) * 3;
            const life = 70 + _prand(seed + i + 200) * 50;
            this._spawnBurst(x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                life, _prand(seed + i + 400) > 0.5 ? gold : color,
                1 + _prand(seed + i + 300) * 1, 'streak');
        }
    }

    _burstPeonyRing(x, y, seed, color1, color2) {
        // Outer ring
        const outerCount = 30;
        const outerR = 5 + _prand(seed) * 3;
        for (let i = 0; i < outerCount; i++) {
            const angle = (i / outerCount) * TAU;
            this._spawnBurst(x, y,
                Math.cos(angle) * outerR, Math.sin(angle) * outerR,
                35 + _prand(seed + i + 100) * 20, color1, 2, 'dot');
        }
        // Inner ring
        const innerCount = 20;
        const innerR = 2.5 + _prand(seed + 50) * 2;
        for (let i = 0; i < innerCount; i++) {
            const angle = (i / innerCount) * TAU + Math.PI / innerCount;
            this._spawnBurst(x, y,
                Math.cos(angle) * innerR, Math.sin(angle) * innerR,
                40 + _prand(seed + i + 300) * 25, color2, 2.5, 'dot');
        }
    }

    _burstCrossette(x, y, seed, color, depth) {
        if (depth === undefined) depth = 0;
        if (depth >= 2) return; // Cap recursion at 2 levels
        const arms = 4 + Math.floor(_prand(seed) * 4);
        for (let i = 0; i < arms; i++) {
            const angle = (i / arms) * TAU + _prand(seed + 10) * 0.5;
            const speed = (5 - depth * 1.5) + _prand(seed + i + 100) * 3;
            const b = {};
            b.x = x; b.y = y;
            b.vx = Math.cos(angle) * speed;
            b.vy = Math.sin(angle) * speed;
            b.life = 18 - depth * 4;
            b.maxLife = b.life;
            b.h = color.h; b.s = color.s; b.l = color.l;
            b.size = 2 - depth * 0.5;
            b.type = 'crossette';
            b.trail = [];
            b.maxTrail = 6;
            b._seed = seed + i * 31;
            b._depth = depth;
            if (this.bursts.length < this.maxBursts) this.bursts.push(b);
        }
    }

    _burstKamuro(x, y, seed, color) {
        const count = 80 + Math.floor(_prand(seed) * 40);
        const gold = { h: 45, s: 95, l: 65 };
        const silver = { h: 45, s: 20, l: 85 };
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU + _prand(seed + i) * 0.25;
            // Higher initial speed for dramatic cascade arc
            const speed = 2 + _prand(seed + i + 100) * 5;
            // Very long life for the cascading waterfall effect
            const life = 120 + _prand(seed + i + 200) * 80;
            const particleColor = _prand(seed + i + 400) > 0.15 ? gold : silver;
            this._spawnBurst(x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5,
                life, particleColor, 1 + _prand(seed + i + 300) * 1.5, 'streak');
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mx = mx;
        this._my = my;

        // Click launches - target height fully deterministic from tick seed
        if (isClicking && !this._wasClicking) {
            const targetY = window.innerHeight * (0.1 + _prand(this.tick * 19) * 0.4);
            this._launchRocket(mx, targetY);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Auto-launch
        this._autoTimer++;
        if (this._autoTimer >= this._autoInterval) {
            this._autoTimer = 0;
            this._launchRocket();
        }

        // Update rockets
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const r = this.rockets[i];
            r.x += r.vx;
            r.y += r.vy;
            r.vy += 0.03; // slow gravity on ascent

            // Trail
            if (r.trail.length < r.maxTrail) {
                r.trail.push(r.x, r.y);
            } else {
                if (r._tIdx === undefined) r._tIdx = 0;
                r.trail[r._tIdx] = r.x;
                r.trail[r._tIdx + 1] = r.y;
                r._tIdx = (r._tIdx + 2) % (r.maxTrail * 2);
            }

            if (r.y <= r.targetY || r.vy >= 0) {
                this._explode(r.x, r.y, r.seed);
                // Store explosion flash for visual impact
                if (!this._flashes) this._flashes = [];
                if (this._flashes.length < 10) {
                    this._flashes.push({ x: r.x, y: r.y, life: 8, maxLife: 8, hue: r.hue });
                }
                this._rocketPool.push(r);
                this.rockets[i] = this.rockets[this.rockets.length - 1];
                this.rockets.pop();
            }
        }

        // Update bursts
        const gravity = this.mode === 2 ? 0.06 : (this.mode === 5 ? 0.04 : 0.05);
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const b = this.bursts[i];
            b.x += b.vx;
            b.y += b.vy;
            b.vy += gravity;
            b.vx *= 0.99;
            b.vy *= 0.99;
            b.life--;

            // Trail for streak type
            if (b.maxTrail > 0) {
                if (b.trail.length < b.maxTrail * 2) {
                    b.trail.push(b.x, b.y);
                } else {
                    if (b._tIdx === undefined) b._tIdx = 0;
                    b.trail[b._tIdx] = b.x;
                    b.trail[b._tIdx + 1] = b.y;
                    b._tIdx = (b._tIdx + 2) % (b.maxTrail * 2);
                }
            }

            // Crossette re-explosion with depth limit
            if (b.type === 'crossette' && b.life <= 0) {
                const depth = (b._depth || 0) + 1;
                if (depth < 2) {
                    // Re-explode into smaller crossettes
                    this._burstCrossette(b.x, b.y, b._seed || this.tick,
                        { h: b.h, s: b.s, l: Math.min(100, b.l + 10) }, depth);
                } else {
                    // Final level: small dot burst
                    const seed = b._seed || this.tick;
                    const subCount = 4;
                    for (let j = 0; j < subCount; j++) {
                        const angle = (j / subCount) * TAU + _prand(seed + j) * 0.5;
                        const speed = 1.5 + _prand(seed + j + 10) * 1.5;
                        this._spawnBurst(b.x, b.y,
                            Math.cos(angle) * speed, Math.sin(angle) * speed,
                            15 + _prand(seed + j + 20) * 10,
                            { h: b.h, s: b.s, l: Math.min(100, b.l + 15) }, 1, 'dot');
                    }
                }
            }

            if (b.life <= 0) {
                this._burstPool.push(b);
                this.bursts[i] = this.bursts[this.bursts.length - 1];
                this.bursts.pop();
            }
        }

        // Update explosion flashes
        if (this._flashes) {
            for (let i = this._flashes.length - 1; i >= 0; i--) {
                this._flashes[i].life--;
                if (this._flashes[i].life <= 0) {
                    this._flashes[i] = this._flashes[this._flashes.length - 1];
                    this._flashes.pop();
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw rockets
        for (const r of this.rockets) {
            const alpha = 0.8 * this.intensity;
            ctx.fillStyle = `hsla(${r.hue}, 90%, 85%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 2, 0, TAU);
            ctx.fill();

            // Rocket trail
            if (r.trail.length >= 4) {
                ctx.strokeStyle = `hsla(${r.hue}, 70%, 70%, ${0.3 * this.intensity})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(r.trail[0], r.trail[1]);
                for (let j = 2; j < r.trail.length; j += 2) {
                    ctx.lineTo(r.trail[j], r.trail[j + 1]);
                }
                ctx.stroke();
            }
        }

        // Draw bursts
        for (const b of this.bursts) {
            const ratio = b.life / b.maxLife;
            const alpha = ratio * 0.7 * this.intensity;

            if (b.type === 'glitter') {
                // Twinkling glitter - twinkle faster near end of life for sparkle effect
                const twinkleSpeed = 0.5 + (1 - ratio) * 2; // faster as it dies
                const twinkle = Math.sin(this.tick * twinkleSpeed + b.x * 0.1 + b.y * 0.07) > 0 ? 1 : 0.2;
                ctx.fillStyle = `hsla(${b.h}, ${b.s}%, ${b.l}%, ${alpha * twinkle})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size * ratio, 0, TAU);
                ctx.fill();
            } else if (b.type === 'streak' && b.trail.length >= 4) {
                // Streaking trail
                ctx.strokeStyle = `hsla(${b.h}, ${b.s}%, ${b.l}%, ${alpha * 0.4})`;
                ctx.lineWidth = b.size * ratio;
                ctx.beginPath();
                ctx.moveTo(b.trail[0], b.trail[1]);
                for (let j = 2; j < b.trail.length; j += 2) {
                    ctx.lineTo(b.trail[j], b.trail[j + 1]);
                }
                ctx.stroke();

                // Bright head
                ctx.fillStyle = `hsla(${b.h}, ${b.s}%, ${Math.min(100, b.l + 20)}%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size * ratio, 0, TAU);
                ctx.fill();
            } else {
                // Standard dot
                ctx.fillStyle = `hsla(${b.h}, ${b.s}%, ${b.l}%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size * ratio, 0, TAU);
                ctx.fill();
            }
        }

        // Draw explosion flashes (bright burst at detonation point)
        if (this._flashes) {
            for (const f of this._flashes) {
                const ratio = f.life / f.maxLife;
                const flashR = (1 - ratio) * 40 + 5;
                const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, flashR);
                grad.addColorStop(0, `hsla(${f.hue}, 80%, 95%, ${ratio * 0.5 * this.intensity})`);
                grad.addColorStop(0.4, `hsla(${f.hue}, 70%, 70%, ${ratio * 0.2 * this.intensity})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(f.x, f.y, flashR, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
