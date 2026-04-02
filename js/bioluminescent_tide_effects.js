/**
 * @file bioluminescent_tide_effects.js
 * @description Organic, ocean-like bioluminescent waves that react to mouse movement
 * like disturbing plankton in dark water. Creates ethereal trailing glow patterns,
 * creature-like autonomous swimmers, and tide-driven wave patterns.
 *
 * Modes:
 * 0 - Plankton Swirl: thousands of tiny lights disturbed by cursor like ocean water
 * 1 - Jellyfish Drift: translucent jellyfish-like entities that pulse and drift
 * 2 - Deep Sea Vents: thermal plumes of glowing particles rising from screen bottom
 * 3 - Biolume Waves: rolling waves of light that wash across the screen like tides
 * 4 - Coral Bloom: branching coral-like structures that grow toward cursor light
 * 5 - Abyss Creatures: large deep-sea creature silhouettes with glowing lure lights
 */

const TAU = Math.PI * 2;

export class BioluminescentTide {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 180;
        this.saturation = 70;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._rng = Math.random;

        // Plankton
        this.plankton = [];
        this.planktonCount = 200;

        // Jellyfish
        this.jellies = [];

        // Vents
        this.vents = [];
        this.ventParticles = [];
        this.ventParticlePool = [];

        // Waves
        this.waveBands = [];
        this.waveIntensityMap = null;

        // Coral
        this.branches = [];
        this.growthPoints = [];

        // Abyss creatures
        this.creatures = [];
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[Math.floor(rng() * palette.length)].h : 180;
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.8;
        this.tick = 0;

        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this.mode === 0) {
            this.planktonCount = 150 + Math.floor(rng() * 100);
            this.plankton = [];
            for (let i = 0; i < this.planktonCount; i++) {
                this.plankton.push({
                    x: rng() * w, y: rng() * h,
                    vx: 0, vy: 0,
                    brightness: 0,
                    maxBright: 0.1 + rng() * 0.4,
                    decayRate: 0.93 + rng() * 0.05,
                    size: 0.5 + rng() * 2,
                    hueShift: rng() * 30 - 15
                });
            }
        } else if (this.mode === 1) {
            const jellyCount = 3 + Math.floor(rng() * 4);
            this.jellies = [];
            for (let i = 0; i < jellyCount; i++) {
                const tentacleCount = 4 + Math.floor(rng() * 6);
                this.jellies.push({
                    x: rng() * w, y: rng() * h,
                    vx: (rng() - 0.5) * 0.3, vy: -0.2 - rng() * 0.3,
                    size: 20 + rng() * 30,
                    pulsePhase: rng() * TAU,
                    pulseSpeed: 0.03 + rng() * 0.03,
                    hueShift: rng() * 40 - 20,
                    tentacles: Array.from({ length: tentacleCount }, () => ({
                        length: 30 + rng() * 50,
                        amplitude: 5 + rng() * 10,
                        phase: rng() * TAU,
                        speed: 0.02 + rng() * 0.03
                    }))
                });
            }
        } else if (this.mode === 2) {
            const ventCount = 2 + Math.floor(rng() * 3);
            this.vents = [];
            this.ventParticles = [];
            for (let i = 0; i < ventCount; i++) {
                this.vents.push({
                    x: w * (0.15 + rng() * 0.7),
                    y: h,
                    width: 15 + rng() * 25,
                    rate: 2 + Math.floor(rng() * 3),
                    hueShift: rng() * 30 - 15,
                    turbulence: 0.5 + rng() * 1.5
                });
            }
        } else if (this.mode === 3) {
            this.waveBands = [];
            const bandCount = 4 + Math.floor(rng() * 4);
            for (let i = 0; i < bandCount; i++) {
                this.waveBands.push({
                    y: h * (0.1 + rng() * 0.8),
                    amplitude: 20 + rng() * 40,
                    wavelength: 0.003 + rng() * 0.006,
                    speed: 0.5 + rng() * 1.5,
                    direction: rng() > 0.5 ? 1 : -1,
                    thickness: 20 + rng() * 40,
                    brightness: 0.03 + rng() * 0.05,
                    hueShift: rng() * 40 - 20
                });
            }
        } else if (this.mode === 4) {
            this.branches = [];
            this.growthPoints = [];
            // Seed initial coral bases at bottom
            const baseCount = 3 + Math.floor(rng() * 3);
            for (let i = 0; i < baseCount; i++) {
                const bx = w * (0.1 + rng() * 0.8);
                const by = h - 20;
                this.growthPoints.push({ x: bx, y: by, angle: -Math.PI / 2, gen: 0, maxGen: 6 + Math.floor(rng() * 4) });
            }
        } else if (this.mode === 5) {
            this.creatures = [];
            const cCount = 2 + Math.floor(rng() * 2);
            for (let i = 0; i < cCount; i++) {
                this.creatures.push({
                    x: rng() * w, y: rng() * h,
                    vx: (rng() - 0.5) * 0.5, vy: (rng() - 0.5) * 0.3,
                    bodyLength: 60 + rng() * 80,
                    bodyWidth: 15 + rng() * 20,
                    lureOffset: 40 + rng() * 30,
                    lureSize: 3 + rng() * 4,
                    lurePulse: rng() * TAU,
                    lurePulseSpeed: 0.04 + rng() * 0.04,
                    segments: 8 + Math.floor(rng() * 6),
                    segmentAngles: [],
                    hueShift: rng() * 30 - 15,
                    angle: rng() * TAU
                });
                // Initialize segment angles
                for (let s = 0; s < this.creatures[i].segments; s++) {
                    this.creatures[i].segmentAngles.push(0);
                }
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

        if (this.mode === 0) this._updatePlankton();
        else if (this.mode === 1) this._updateJellyfish();
        else if (this.mode === 2) this._updateVents();
        else if (this.mode === 3) this._updateWaves();
        else if (this.mode === 4) this._updateCoral();
        else if (this.mode === 5) this._updateCreatures();
    }

    _updatePlankton() {
        const mx = this._mouseX, my = this._mouseY;
        const speed = this._mouseSpeed;

        for (const p of this.plankton) {
            const dx = mx - p.x, dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Mouse disturbs plankton - they light up when agitated
            if (dist < 120) {
                const force = (120 - dist) / 120;
                // Push away from cursor
                p.vx -= (dx / dist) * force * 0.8;
                p.vy -= (dy / dist) * force * 0.8;
                // Light up based on disturbance
                p.brightness = Math.min(p.maxBright, p.brightness + force * 0.15 + speed * 0.005);
            }

            // Clicking creates a light burst
            if (this._isClicking && dist < 200) {
                p.brightness = p.maxBright;
            }

            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.96; p.vy *= 0.96;
            p.brightness *= p.decayRate;

            // Slow drift current
            p.vx += Math.sin(this.tick * 0.001 + p.y * 0.01) * 0.01;
            p.vy += Math.cos(this.tick * 0.0008 + p.x * 0.01) * 0.005;

            // Wrap
            const w = window.innerWidth, h = window.innerHeight;
            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;
            if (p.y < -10) p.y = h + 10;
            if (p.y > h + 10) p.y = -10;
        }
    }

    _updateJellyfish() {
        const w = window.innerWidth, h = window.innerHeight;
        for (const j of this.jellies) {
            // Gentle cursor avoidance
            const dx = j.x - this._mouseX, dy = j.y - this._mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 0) {
                j.vx += (dx / dist) * 0.05;
                j.vy += (dy / dist) * 0.05;
            }

            // Click: jellyfish pulse-jet away quickly
            if (this._isClicking && dist < 250) {
                j.pulsePhase += 0.5; // Force a pulse
                j.vx += (dx / (dist || 1)) * 2;
                j.vy += (dy / (dist || 1)) * 2;
            }

            j.x += j.vx; j.y += j.vy;
            j.vy -= 0.002; // Slight upward drift

            // Wrap vertically - use sin-based position instead of Math.random
            if (j.y < -j.size * 2) {
                j.y = h + j.size;
                j.x = Math.abs(Math.sin(this.tick * 0.1 + j.pulsePhase)) * w;
            }
            if (j.x < -j.size) j.x = w + j.size;
            if (j.x > w + j.size) j.x = -j.size;

            j.vx *= 0.99; j.vy *= 0.99;
        }
    }

    _updateVents() {
        // Click: eruption burst from nearest vent
        const erupting = this._isClicking;

        // Spawn vent particles (check cap before spawning)
        for (const v of this.vents) {
            if (this.ventParticles.length >= 400) break;
            const spawnRate = erupting ? v.rate * 4 : v.rate;
            for (let i = 0; i < spawnRate && this.ventParticles.length < 400; i++) {
                const p = this.ventParticlePool.length > 0 ? this.ventParticlePool.pop() : {};
                p.x = v.x + (Math.random() - 0.5) * v.width;
                p.y = v.y;
                p.vx = (Math.random() - 0.5) * v.turbulence * (erupting ? 3 : 1);
                p.vy = -(1 + Math.random() * 2) * (erupting ? 2.5 : 1);
                p.life = 80 + Math.floor(Math.random() * 60);
                p.maxLife = p.life;
                p.size = 1 + Math.random() * 3 + (erupting ? 2 : 0);
                p.hueShift = v.hueShift + Math.random() * 10;
                this.ventParticles.push(p);
            }
        }

        // Mouse turbulence
        const mx = this._mouseX, my = this._mouseY;
        for (let i = this.ventParticles.length - 1; i >= 0; i--) {
            const p = this.ventParticles[i];
            const dx = mx - p.x, dy = my - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100 && dist > 0) {
                p.vx += (dx / dist) * 0.2;
                p.vy += (dy / dist) * 0.1;
            }

            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.98; p.vy *= 0.99;
            p.vy -= 0.01; // Buoyancy
            p.life--;

            if (p.life <= 0) {
                this.ventParticlePool.push(p);
                this.ventParticles[i] = this.ventParticles[this.ventParticles.length - 1];
                this.ventParticles.pop();
            }
        }
    }

    _updateWaves() {
        // Click: temporarily boost wave amplitude and brightness
        if (this._isClicking) {
            for (const band of this.waveBands) {
                band.amplitude = Math.min(80, band.amplitude + 0.5);
                band.brightness = Math.min(0.12, band.brightness + 0.002);
            }
        } else {
            for (const band of this.waveBands) {
                band.amplitude *= 0.998; // Slowly decay back
                band.amplitude = Math.max(20, band.amplitude);
                band.brightness *= 0.999;
                band.brightness = Math.max(0.03, band.brightness);
            }
        }
    }

    _updateCoral() {
        // Click accelerates growth rate dramatically
        const growthInterval = this._isClicking ? 2 : 8;
        if (this.tick % growthInterval === 0 && this.growthPoints.length > 0 && this.branches.length < 800) {
            const newPoints = [];
            for (let i = this.growthPoints.length - 1; i >= 0; i--) {
                const gp = this.growthPoints[i];
                if (gp.gen >= gp.maxGen) {
                    this.growthPoints[i] = this.growthPoints[this.growthPoints.length - 1];
                    this.growthPoints.pop();
                    continue;
                }

                // Phototropism - bend toward cursor
                const dx = this._mouseX - gp.x, dy = this._mouseY - gp.y;
                const toCursor = Math.atan2(dy, dx);
                const angleDiff = toCursor - gp.angle;
                const correctedAngle = gp.angle + Math.sin(angleDiff) * 0.1;

                const len = 8 + Math.random() * 12;
                const endX = gp.x + Math.cos(correctedAngle) * len;
                const endY = gp.y + Math.sin(correctedAngle) * len;

                this.branches.push({
                    x1: gp.x, y1: gp.y, x2: endX, y2: endY,
                    gen: gp.gen, thickness: Math.max(0.5, 3 - gp.gen * 0.3),
                    hueShift: Math.random() * 20 - 10,
                    glow: 0.3 - gp.gen * 0.03
                });

                // Branch?
                const branchChance = gp.gen < 2 ? 0.7 : 0.4;
                if (Math.random() < branchChance) {
                    const spread = 0.3 + Math.random() * 0.5;
                    newPoints.push({ x: endX, y: endY, angle: correctedAngle - spread, gen: gp.gen + 1, maxGen: gp.maxGen });
                    newPoints.push({ x: endX, y: endY, angle: correctedAngle + spread, gen: gp.gen + 1, maxGen: gp.maxGen });
                    this.growthPoints[i] = this.growthPoints[this.growthPoints.length - 1];
                    this.growthPoints.pop();
                } else {
                    gp.x = endX; gp.y = endY;
                    gp.angle = correctedAngle + (Math.random() - 0.5) * 0.3;
                    gp.gen++;
                }
            }
            this.growthPoints.push(...newPoints);
        }
    }

    _updateCreatures() {
        const w = window.innerWidth, h = window.innerHeight;
        for (const c of this.creatures) {
            // Lure attracted to cursor
            const dx = this._mouseX - c.x, dy = this._mouseY - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 50) {
                // Click: creatures rush toward cursor (feeding frenzy)
                const attraction = this._isClicking ? 0.05 : 0.01;
                c.vx += (dx / dist) * attraction;
                c.vy += (dy / dist) * attraction;
            }
            // Click also brightens lure pulse
            if (this._isClicking) {
                c.lurePulseSpeed = 0.12; // Rapid pulsing
            } else {
                c.lurePulseSpeed = Math.max(0.04, c.lurePulseSpeed * 0.99);
            }
            // Slow wandering
            c.vx += Math.sin(this.tick * 0.005 + c.lurePulse) * 0.005;
            c.vy += Math.cos(this.tick * 0.004 + c.lurePulse) * 0.003;

            c.x += c.vx; c.y += c.vy;
            c.vx *= 0.98; c.vy *= 0.98;

            c.angle = Math.atan2(c.vy, c.vx);

            // Snake-like body movement
            for (let s = 0; s < c.segments; s++) {
                c.segmentAngles[s] = Math.sin(this.tick * 0.03 - s * 0.4 + c.lurePulse) * 0.2;
            }

            // Wrap
            if (c.x < -c.bodyLength) c.x = w + c.bodyLength;
            if (c.x > w + c.bodyLength) c.x = -c.bodyLength;
            if (c.y < -c.bodyLength) c.y = h + c.bodyLength;
            if (c.y > h + c.bodyLength) c.y = -c.bodyLength;
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.mode === 0) this._drawPlankton(ctx);
        else if (this.mode === 1) this._drawJellyfish(ctx);
        else if (this.mode === 2) this._drawVents(ctx);
        else if (this.mode === 3) this._drawWaves(ctx, system);
        else if (this.mode === 4) this._drawCoral(ctx);
        else if (this.mode === 5) this._drawCreatures(ctx);

        ctx.restore();
    }

    _drawPlankton(ctx) {
        for (const p of this.plankton) {
            if (p.brightness < 0.005) continue;
            const hue = (this.hue + p.hueShift + 360) % 360;
            const alpha = p.brightness * this.intensity;

            // Glow
            if (p.brightness > 0.05) {
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, TAU);
                ctx.fill();
            }
            // Core
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 90%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TAU);
            ctx.fill();
        }
    }

    _drawJellyfish(ctx) {
        for (const j of this.jellies) {
            const hue = (this.hue + j.hueShift + 360) % 360;
            const pulse = 0.7 + 0.3 * Math.sin(this.tick * j.pulseSpeed + j.pulsePhase);
            const bellW = j.size * pulse;
            const bellH = j.size * 0.6 * (2 - pulse);

            // Bell glow
            const g = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, bellW * 1.5);
            g.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 80%, ${0.08 * this.intensity})`);
            g.addColorStop(0.5, `hsla(${hue}, ${this.saturation}%, 60%, ${0.04 * this.intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(j.x, j.y, bellW * 1.5, 0, TAU);
            ctx.fill();

            // Bell body (top half dome)
            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 75%, ${0.12 * this.intensity})`;
            ctx.beginPath();
            ctx.ellipse(j.x, j.y, bellW, bellH, 0, Math.PI, TAU);
            ctx.fill();

            // Bell rim - a wide arc across the bottom of the bell
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation + 10}%, 85%, ${0.2 * this.intensity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(j.x, j.y + bellH * 0.1, bellW * 0.9, bellH * 0.15, 0, 0, Math.PI);
            ctx.stroke();

            // Tentacles
            for (let t = 0; t < j.tentacles.length; t++) {
                const tent = j.tentacles[t];
                const startAngle = Math.PI * (0.2 + 0.6 * (t / j.tentacles.length));
                const sx = j.x + Math.cos(startAngle) * bellW * 0.8;
                const sy = j.y + Math.sin(startAngle) * bellH * 0.5;

                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${0.08 * this.intensity})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(sx, sy);

                const segments = 6;
                let cx = sx, cy = sy;
                for (let s = 0; s < segments; s++) {
                    const segLen = tent.length / segments;
                    const wobble = Math.sin(this.tick * tent.speed + tent.phase + s * 0.8) * tent.amplitude;
                    cx += wobble;
                    cy += segLen;
                    ctx.lineTo(cx, cy);
                }
                ctx.stroke();
            }
        }
    }

    _drawVents(ctx) {
        // Vent glow at base
        for (const v of this.vents) {
            const hue = (this.hue + v.hueShift + 360) % 360;
            const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.width * 3);
            g.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 60%, ${0.1 * this.intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(v.x, v.y, v.width * 3, 0, TAU);
            ctx.fill();
        }

        // Vent particles
        for (const p of this.ventParticles) {
            const hue = (this.hue + p.hueShift + 360) % 360;
            const lifeRatio = p.life / p.maxLife;
            const alpha = lifeRatio * 0.25 * this.intensity;

            // Particle with warm-to-cool color shift
            const coolHue = (hue + 40 * (1 - lifeRatio)) % 360;
            ctx.fillStyle = `hsla(${coolHue}, ${this.saturation}%, ${50 + lifeRatio * 30}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.5 + lifeRatio * 0.5), 0, TAU);
            ctx.fill();
        }
    }

    _drawWaves(ctx, system) {
        const w = system.width;
        for (const band of this.waveBands) {
            const hue = (this.hue + band.hueShift + 360) % 360;

            // Mouse proximity boost
            const dy = Math.abs(this._mouseY - band.y);
            const mouseBoost = dy < 100 ? (1 - dy / 100) * 0.05 : 0;

            ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${(band.brightness + mouseBoost) * this.intensity})`;

            const step = 6;
            for (let x = 0; x < w; x += step) {
                const wave1 = Math.sin(x * band.wavelength + this.tick * 0.02 * band.speed * band.direction) * band.amplitude;
                const wave2 = Math.sin(x * band.wavelength * 1.7 + this.tick * 0.015 * band.speed) * band.amplitude * 0.3;
                const y = band.y + wave1 + wave2;

                // Mouse disturbance
                const mdx = x - this._mouseX;
                const mdy = y - this._mouseY;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                const distort = mDist < 150 ? Math.sin(mDist * 0.05) * (1 - mDist / 150) * 20 : 0;

                ctx.fillRect(x, y + distort - band.thickness / 2, step, band.thickness);
            }
        }
    }

    _drawCoral(ctx) {
        for (const b of this.branches) {
            const hue = (this.hue + b.hueShift + 360) % 360;
            const alpha = b.glow * this.intensity;

            // Branch glow
            if (b.gen < 3) {
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 50%, ${alpha * 0.3})`;
                ctx.lineWidth = b.thickness + 2;
                ctx.beginPath();
                ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2);
                ctx.stroke();
            }

            // Branch core
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 70%, ${alpha})`;
            ctx.lineWidth = b.thickness;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
        }

        // Growth point tips glow
        for (const gp of this.growthPoints) {
            const g = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, 6);
            g.addColorStop(0, `hsla(${this.hue + 30}, 90%, 90%, ${0.3 * this.intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(gp.x, gp.y, 6, 0, TAU);
            ctx.fill();
        }
    }

    _drawCreatures(ctx) {
        for (const c of this.creatures) {
            const hue = (this.hue + c.hueShift + 360) % 360;

            // Draw body segments from tail to head
            let segX = c.x - Math.cos(c.angle) * c.bodyLength;
            let segY = c.y - Math.sin(c.angle) * c.bodyLength;
            const segLen = c.bodyLength / c.segments;

            for (let s = c.segments - 1; s >= 0; s--) {
                const segAngle = c.angle + c.segmentAngles[s];
                const nextX = segX + Math.cos(segAngle) * segLen;
                const nextY = segY + Math.sin(segAngle) * segLen;
                const width = c.bodyWidth * (0.3 + 0.7 * (1 - s / c.segments));

                // Segment body - dark silhouette with subtle glow edge
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 30%, ${0.06 * this.intensity})`;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(segX, segY); ctx.lineTo(nextX, nextY);
                ctx.stroke();

                // Bioluminescent dots along body
                if (s % 2 === 0) {
                    ctx.fillStyle = `hsla(${hue + 20}, ${this.saturation + 10}%, 80%, ${0.15 * this.intensity})`;
                    ctx.beginPath();
                    ctx.arc((segX + nextX) / 2, (segY + nextY) / 2, width * 0.15, 0, TAU);
                    ctx.fill();
                }

                segX = nextX; segY = nextY;
            }

            // Anglerfish-style lure
            const lureX = c.x + Math.cos(c.angle) * c.lureOffset;
            const lureY = c.y + Math.sin(c.angle) * c.lureOffset;
            const lurePulse = 0.5 + 0.5 * Math.sin(this.tick * c.lurePulseSpeed + c.lurePulse);

            // Lure stalk
            ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 50%, ${0.08 * this.intensity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            const cpx = (c.x + lureX) / 2 + Math.sin(this.tick * 0.02) * 10;
            const cpy = (c.y + lureY) / 2 + Math.cos(this.tick * 0.025) * 10;
            ctx.quadraticCurveTo(cpx, cpy, lureX, lureY);
            ctx.stroke();

            // Lure glow
            const lureR = c.lureSize * (1 + lurePulse);
            const g = ctx.createRadialGradient(lureX, lureY, 0, lureX, lureY, lureR * 4);
            g.addColorStop(0, `hsla(${hue + 60}, 90%, 90%, ${lurePulse * 0.3 * this.intensity})`);
            g.addColorStop(0.4, `hsla(${hue + 40}, 80%, 70%, ${lurePulse * 0.1 * this.intensity})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(lureX, lureY, lureR * 4, 0, TAU);
            ctx.fill();

            // Lure core
            ctx.fillStyle = `hsla(${hue + 60}, 95%, 95%, ${(0.3 + lurePulse * 0.4) * this.intensity})`;
            ctx.beginPath();
            ctx.arc(lureX, lureY, c.lureSize, 0, TAU);
            ctx.fill();
        }
    }
}
