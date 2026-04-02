/**
 * @file magnetic_sand_effects.js
 * @description Thousands of tiny iron filing particles that respond to the cursor
 * as a magnetic source. Different seeds create wildly different pole configurations,
 * particle behaviors, and visual styles. Clicking flips polarity or creates bursts.
 *
 * Modes:
 * 0 - Monopole: single pole at cursor, filings radiate outward/inward
 * 1 - Dipole: classic bar magnet field lines, filings align to curves
 * 2 - Quadrupole: four-fold symmetry with beautiful clover-leaf patterns
 * 3 - Vortex Poles: rotating magnetic field, filings spiral into/out of cursor
 * 4 - Pulsating Field: field strength oscillates, filings breathe in and out
 * 5 - Shattered Magnet: multiple fragments near cursor each with own field
 */

export class MagneticSand {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 30;
        this.saturation = 40;

        // Particle pool
        this.particles = null;
        this.particleCount = 0;

        // Mouse state
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._polarity = 1;

        // Mode params
        this.fieldStrength = 0;
        this.friction = 0;
        this.particleSize = 1;
        this.trailLength = 0;
        this.colorMode = 0; // 0=monochrome metallic, 1=field-colored, 2=speed-colored
        this.dipoleOffset = 40;
        this.rotationSpeed = 0;
        this.pulseFreq = 0;
        this.fragments = null;

        // Performance
        this._updateEvery = 1;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : 30 + Math.floor(rng() * 30);
        this.saturation = 20 + Math.floor(rng() * 50);
        this._polarity = 1;

        this.fieldStrength = 0.3 + rng() * 0.8;
        this.friction = 0.92 + rng() * 0.06;
        this.particleSize = 0.8 + rng() * 1.5;
        this.trailLength = Math.floor(rng() * 4);
        this.colorMode = Math.floor(rng() * 3);

        // Particle count based on screen area (capped for perf)
        const area = window.innerWidth * window.innerHeight;
        this.particleCount = Math.min(2000, Math.floor(area / 600) + Math.floor(rng() * 400));

        // Initialize particles as flat typed arrays for performance
        const n = this.particleCount;
        this.particles = {
            x: new Float32Array(n),
            y: new Float32Array(n),
            vx: new Float32Array(n),
            vy: new Float32Array(n),
            size: new Float32Array(n),
            angle: new Float32Array(n),
        };

        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < n; i++) {
            this.particles.x[i] = rng() * w;
            this.particles.y[i] = rng() * h;
            this.particles.vx[i] = 0;
            this.particles.vy[i] = 0;
            this.particles.size[i] = this.particleSize * (0.5 + rng() * 1.0);
            this.particles.angle[i] = rng() * Math.PI * 2;
        }

        // Mode-specific
        switch (this.mode) {
            case 1: // Dipole
                this.dipoleOffset = 25 + rng() * 50;
                break;
            case 2: // Quadrupole
                this.dipoleOffset = 30 + rng() * 40;
                break;
            case 3: // Vortex
                this.rotationSpeed = 0.02 + rng() * 0.06;
                break;
            case 4: // Pulsating
                this.pulseFreq = 0.015 + rng() * 0.04;
                break;
            case 5: // Shattered
                this.fragments = [];
                const fragCount = 3 + Math.floor(rng() * 4);
                for (let i = 0; i < fragCount; i++) {
                    this.fragments.push({
                        offsetX: (rng() - 0.5) * 120,
                        offsetY: (rng() - 0.5) * 120,
                        strength: 0.5 + rng() * 0.8,
                        polarity: rng() > 0.5 ? 1 : -1,
                    });
                }
                break;
        }

        this._updateEvery = this.particleCount > 1500 ? 1 : 1;
    }

    _fieldForce(px, py, sx, sy, strength, polarity) {
        const dx = sx - px;
        const dy = sy - py;
        const distSq = dx * dx + dy * dy + 100; // softened
        const dist = Math.sqrt(distSq);
        const force = (strength * polarity) / (distSq * 0.01 + dist * 0.1);
        const cappedForce = Math.min(force, 2.5);
        return { fx: (dx / dist) * cappedForce, fy: (dy / dist) * cappedForce };
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mx = mx;
        this._my = my;

        // Click toggles polarity
        if (isClicking && !this._wasClicking) {
            this._polarity *= -1;
        }
        this._wasClicking = isClicking;

        const n = this.particleCount;
        const p = this.particles;
        const str = this.fieldStrength * (isClicking ? 1.8 : 1.0);
        const fric = this.friction;
        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = 0; i < n; i++) {
            let totalFx = 0, totalFy = 0;

            switch (this.mode) {
                case 0: { // Monopole
                    const f = this._fieldForce(p.x[i], p.y[i], mx, my, str, this._polarity);
                    totalFx = f.fx;
                    totalFy = f.fy;
                    break;
                }
                case 1: { // Dipole
                    const off = this.dipoleOffset;
                    const f1 = this._fieldForce(p.x[i], p.y[i], mx - off, my, str, this._polarity);
                    const f2 = this._fieldForce(p.x[i], p.y[i], mx + off, my, str, -this._polarity);
                    totalFx = f1.fx + f2.fx;
                    totalFy = f1.fy + f2.fy;
                    break;
                }
                case 2: { // Quadrupole
                    const off = this.dipoleOffset;
                    const poles = [
                        { x: mx - off, y: my, pol: 1 },
                        { x: mx + off, y: my, pol: -1 },
                        { x: mx, y: my - off, pol: -1 },
                        { x: mx, y: my + off, pol: 1 },
                    ];
                    for (const pole of poles) {
                        const f = this._fieldForce(p.x[i], p.y[i], pole.x, pole.y, str * 0.6, pole.pol * this._polarity);
                        totalFx += f.fx;
                        totalFy += f.fy;
                    }
                    break;
                }
                case 3: { // Vortex
                    const f = this._fieldForce(p.x[i], p.y[i], mx, my, str, this._polarity);
                    const angle = this.tick * this.rotationSpeed;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    totalFx = f.fx * cos - f.fy * sin;
                    totalFy = f.fx * sin + f.fy * cos;
                    break;
                }
                case 4: { // Pulsating
                    const pulse = Math.sin(this.tick * this.pulseFreq) * 0.8 + 0.5;
                    const f = this._fieldForce(p.x[i], p.y[i], mx, my, str * pulse, this._polarity);
                    totalFx = f.fx;
                    totalFy = f.fy;
                    break;
                }
                case 5: { // Shattered
                    for (const frag of this.fragments) {
                        const f = this._fieldForce(
                            p.x[i], p.y[i],
                            mx + frag.offsetX, my + frag.offsetY,
                            str * frag.strength, frag.polarity * this._polarity
                        );
                        totalFx += f.fx;
                        totalFy += f.fy;
                    }
                    break;
                }
            }

            p.vx[i] = (p.vx[i] + totalFx) * fric;
            p.vy[i] = (p.vy[i] + totalFy) * fric;
            p.x[i] += p.vx[i];
            p.y[i] += p.vy[i];

            // Compute alignment angle from velocity + field direction
            const speed = Math.sqrt(p.vx[i] * p.vx[i] + p.vy[i] * p.vy[i]);
            if (speed > 0.1) {
                p.angle[i] = Math.atan2(p.vy[i], p.vx[i]);
            }

            // Wrap around edges
            if (p.x[i] < -10) p.x[i] = w + 10;
            if (p.x[i] > w + 10) p.x[i] = -10;
            if (p.y[i] < -10) p.y[i] = h + 10;
            if (p.y[i] > h + 10) p.y[i] = -10;
        }
    }

    draw(ctx, system) {
        const n = this.particleCount;
        const p = this.particles;
        if (!p) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const mx = this._mx;
        const my = this._my;

        for (let i = 0; i < n; i++) {
            const x = p.x[i];
            const y = p.y[i];
            const sz = p.size[i];
            const angle = p.angle[i];
            const speed = Math.sqrt(p.vx[i] * p.vx[i] + p.vy[i] * p.vy[i]);

            // Distance to cursor for proximity glow
            const dx = x - mx;
            const dy = y - my;
            const distSq = dx * dx + dy * dy;
            const proximity = Math.max(0, 1 - distSq / 90000);

            let alpha, hue, lightness;
            switch (this.colorMode) {
                case 0: // Metallic monochrome
                    hue = this.hue;
                    lightness = 40 + proximity * 30 + speed * 5;
                    alpha = 0.3 + proximity * 0.4 + Math.min(speed * 0.1, 0.3);
                    break;
                case 1: // Field-colored (angle-based)
                    hue = (this.hue + (angle / Math.PI) * 180 + 360) % 360;
                    lightness = 45 + proximity * 25;
                    alpha = 0.25 + proximity * 0.4;
                    break;
                case 2: // Speed-colored
                    hue = (this.hue + Math.min(speed * 30, 120)) % 360;
                    lightness = 40 + Math.min(speed * 10, 30);
                    alpha = 0.2 + proximity * 0.3 + Math.min(speed * 0.15, 0.4);
                    break;
                default:
                    hue = this.hue;
                    lightness = 50;
                    alpha = 0.3;
            }

            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;

            // Draw as oriented line (like iron filings)
            const len = sz * 2 + speed * 0.5;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(x - cos * len, y - sin * len);
            ctx.lineTo(x + cos * len, y + sin * len);
            ctx.lineWidth = sz * 0.6;
            ctx.strokeStyle = ctx.fillStyle;
            ctx.stroke();

            // Bright dot at center for close particles
            if (proximity > 0.3) {
                ctx.beginPath();
                ctx.arc(x, y, sz * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
