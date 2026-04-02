/**
 * @file mood_atmosphere.js
 * @description Atmospheric overlays that give each universe a distinct mood and feel.
 * These are full-screen ambient effects that react subtly to mouse position
 * and create a sense of environment. Each seed picks a dramatically different atmosphere.
 *
 * Modes:
 * 0 - God Rays: volumetric light beams emanate from a point, cursor adjusts angle
 * 1 - Electric Storm: lightning bolts crackle across screen on clicks, ambient charge
 * 2 - Aurora Curtain: shimmering ribbons of color flow across the screen
 * 3 - Deep Fog: banks of fog drift across with parallax depth
 * 4 - Ember Field: floating embers and heat distortion rise from bottom
 * 5 - Underwater Caustics: rippling light patterns as if underwater
 */

export class MoodAtmosphere {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 70;
        this._rng = Math.random;
        this._w = window.innerWidth;
        this._h = window.innerHeight;

        // God rays
        this.rayCount = 0;
        this.rays = [];
        this.raySourceX = 0.5;
        this.raySourceY = 0;

        // Electric storm
        this.bolts = [];
        this.boltPool = [];
        this.maxBolts = 6;
        this.ambientCharge = 0;
        this.chargeParticles = [];
        // Pre-allocated segment buffer to avoid recursive allocation
        this._segmentBuffer = [];

        // Aurora
        this.auroraWaves = [];

        // Fog
        this.fogBanks = [];

        // Embers
        this.embers = [];
        this.maxEmbers = 50;
        this.emberPool = [];
        this._peakEmberCount = 0; // smooth threshold tracking

        // Caustics
        this.causticPhase = 0;
        this.causticScale = 0;
        this.causticComplexity = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? (palette[0].h || Math.floor(rng() * 360)) : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this._w = window.innerWidth;
        this._h = window.innerHeight;

        switch (this.mode) {
            case 0: // God rays
                this.rayCount = 4 + Math.floor(rng() * 6);
                this.rays = [];
                this.raySourceX = 0.2 + rng() * 0.6;
                this.raySourceY = rng() * 0.3;
                for (let i = 0; i < this.rayCount; i++) {
                    // Space rays with guaranteed minimum separation
                    const baseAngle = (i / this.rayCount) * Math.PI * 0.8 - Math.PI * 0.4;
                    this.rays.push({
                        angle: baseAngle + (rng() - 0.5) * (Math.PI * 0.6 / this.rayCount),
                        width: 0.02 + rng() * 0.06,
                        intensity: 0.3 + rng() * 0.7,
                        speed: 0.001 + rng() * 0.003,
                        phase: rng() * Math.PI * 2,
                    });
                }
                break;

            case 1: // Electric storm
                this.bolts = [];
                this.ambientCharge = 0;
                this._segmentBuffer = [];
                this.chargeParticles = [];
                for (let i = 0; i < 20; i++) {
                    this.chargeParticles.push({
                        x: rng() * window.innerWidth,
                        y: rng() * window.innerHeight,
                        vx: (rng() - 0.5) * 0.5,
                        vy: (rng() - 0.5) * 0.5,
                        size: 1 + rng() * 2,
                        brightness: 0,
                    });
                }
                break;

            case 2: // Aurora
                this.auroraWaves = [];
                const waveCount = 3 + Math.floor(rng() * 3);
                for (let i = 0; i < waveCount; i++) {
                    this.auroraWaves.push({
                        y: 0.1 + rng() * 0.4,
                        amplitude: 20 + rng() * 40,
                        frequency: 0.005 + rng() * 0.01,
                        speed: 0.005 + rng() * 0.01,
                        phase: rng() * Math.PI * 2,
                        hue: (this.hue + i * 30) % 360,
                        height: 30 + rng() * 60,
                        opacity: 0.06 + rng() * 0.06,
                    });
                }
                break;

            case 3: // Fog
                this.fogBanks = [];
                const bankCount = 4 + Math.floor(rng() * 4);
                for (let i = 0; i < bankCount; i++) {
                    this.fogBanks.push({
                        y: rng() * window.innerHeight,
                        height: 60 + rng() * 120,
                        speed: 0.2 + rng() * 0.6,
                        direction: rng() > 0.5 ? 1 : -1,
                        offset: rng() * window.innerWidth,
                        density: 0.03 + rng() * 0.04,
                        depth: 0.3 + rng() * 0.7,
                        hue: (this.hue + rng() * 20 - 10 + 360) % 360,
                    });
                }
                break;

            case 4: // Embers
                this.embers = [];
                this.maxEmbers = 30 + Math.floor(rng() * 30);
                this._peakEmberCount = 0;
                break;

            case 5: // Caustics
                this.causticPhase = 0;
                this.causticScale = 40 + rng() * 60;
                this.causticComplexity = 3 + Math.floor(rng() * 4);
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;

        switch (this.mode) {
            case 0: this._updateGodRays(mx, my); break;
            case 1: this._updateElectricStorm(mx, my, isClicking); break;
            case 2: break; // Aurora is purely time-based
            case 3: this._updateFog(mx, my); break;
            case 4: this._updateEmbers(mx, my); break;
            case 5: this._updateCaustics(); break;
        }
    }

    _updateGodRays(mx, my) {
        const targetX = mx / this._w;
        const targetY = my / this._h * 0.3;
        this.raySourceX += (targetX - this.raySourceX) * 0.01;
        this.raySourceY += (targetY - this.raySourceY) * 0.01;
    }

    _updateElectricStorm(mx, my, isClicking) {
        const rng = this._rng;
        this.ambientCharge += isClicking ? 0.05 : 0.002;
        if (this.ambientCharge > 1) this.ambientCharge = 1;

        if ((isClicking || (this.ambientCharge > 0.7 && rng() < 0.02)) && this.bolts.length < this.maxBolts) {
            const bolt = this.boltPool.length > 0 ? this.boltPool.pop() : {};
            if (isClicking) {
                bolt.x1 = mx + (rng() - 0.5) * 200;
                bolt.y1 = 0;
                bolt.x2 = mx + (rng() - 0.5) * 100;
                bolt.y2 = my;
            } else {
                bolt.x1 = rng() * this._w;
                bolt.y1 = 0;
                bolt.x2 = rng() * this._w;
                bolt.y2 = this._h * (0.3 + rng() * 0.7);
            }
            bolt.life = 8 + Math.floor(rng() * 8);
            bolt.maxLife = bolt.life;
            bolt.segments = this._generateBoltSegments(bolt.x1, bolt.y1, bolt.x2, bolt.y2);
            this.bolts.push(bolt);
            this.ambientCharge *= 0.3;
        }

        for (let i = this.bolts.length - 1; i >= 0; i--) {
            this.bolts[i].life--;
            if (this.bolts[i].life <= 0) {
                this.boltPool.push(this.bolts[i]);
                this.bolts[i] = this.bolts[this.bolts.length - 1];
                this.bolts.pop();
            }
        }

        for (const p of this.chargeParticles) {
            p.x += p.vx; p.y += p.vy;
            p.vx += (rng() - 0.5) * 0.1;
            p.vy += (rng() - 0.5) * 0.1;
            p.vx *= 0.95; p.vy *= 0.95;
            p.brightness = this.ambientCharge * (0.5 + rng() * 0.5);
            if (p.x < 0) p.x = this._w; if (p.x > this._w) p.x = 0;
            if (p.y < 0) p.y = this._h; if (p.y > this._h) p.y = 0;
        }
    }

    /**
     * Iterative bolt generation - avoids recursive allocation and spread operator GC pressure.
     */
    _generateBoltSegments(x1, y1, x2, y2) {
        const rng = this._rng;
        const segments = [{ x: x1, y: y1 }];
        const queue = [{ x1, y1, x2, y2, depth: 6 }];

        while (queue.length > 0) {
            const { x1: sx, y1: sy, x2: ex, y2: ey, depth } = queue.pop();

            if (depth === 0) {
                segments.push({ x: ex, y: ey });
                continue;
            }

            const midX = (sx + ex) / 2 + (rng() - 0.5) * Math.abs(ex - sx) * 0.4;
            const midY = (sy + ey) / 2 + (rng() - 0.5) * Math.abs(ey - sy) * 0.15;

            queue.push({ x1: midX, y1: midY, x2: ex, y2: ey, depth: depth - 1 });
            queue.push({ x1: sx, y1: sy, x2: midX, y2: midY, depth: depth - 1 });

            // Branch
            if (depth > 2 && rng() < 0.4) {
                segments.push({
                    x: midX, y: midY, branch: true,
                });
                segments.push({
                    x: midX + (rng() - 0.5) * 100,
                    y: midY + 30 + rng() * 80,
                });
            }
        }

        segments.push({ x: x2, y: y2 });
        return segments;
    }

    _updateFog(mx, my) {
        const w = this._w;
        for (const bank of this.fogBanks) {
            bank.offset += bank.speed * bank.direction;
            if (bank.offset > w * 2) bank.offset -= w * 3;
            if (bank.offset < -w) bank.offset += w * 3;

            const dy = my - bank.y;
            if (Math.abs(dy) < bank.height) {
                bank.y += (dy > 0 ? 0.2 : -0.2);
            }
        }
    }

    _updateEmbers(mx, my) {
        // Track peak ember count for smooth heat shimmer
        this._peakEmberCount = Math.max(this._peakEmberCount * 0.995, this.embers.length);
        const rng = this._rng;

        // Spawn embers from bottom
        if (this.tick % 4 === 0 && this.embers.length < this.maxEmbers) {
            const ember = this.emberPool.length > 0 ? this.emberPool.pop() : {};
            ember.x = rng() * this._w;
            ember.y = this._h + 10;
            ember.vx = (rng() - 0.5) * 0.5;
            ember.vy = -(0.5 + rng() * 1.5);
            ember.life = 1.0;
            ember.decay = 0.002 + rng() * 0.003;
            ember.size = 1 + rng() * 3;
            ember.wobble = rng() * Math.PI * 2;
            ember.wobbleSpeed = 0.02 + rng() * 0.04;
            ember.hueOffset = rng() * 30 - 15;
            this.embers.push(ember);
        }

        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.wobble += e.wobbleSpeed;
            e.x += e.vx + Math.sin(e.wobble) * 0.5;
            e.y += e.vy;
            e.vy *= 0.999;

            // Mouse heat pushes embers away
            const dx = e.x - mx, dy = e.y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < 10000) {
                const dist = Math.sqrt(distSq) + 1;
                e.vx += dx / dist * 0.1;
                e.vy += dy / dist * 0.1;
            }

            e.life -= e.decay;
            if (e.life <= 0 || e.y < -20) {
                this.emberPool.push(e);
                this.embers[i] = this.embers[this.embers.length - 1];
                this.embers.pop();
            }
        }
    }

    _updateCaustics() {
        this.causticPhase += 0.015;
        // Normalize phase to prevent float precision issues over long sessions
        if (this.causticPhase > Math.PI * 200) {
            this.causticPhase -= Math.PI * 200;
        }
    }

    draw(ctx, system) {
        const w = system.width, h = system.height;

        ctx.save();

        switch (this.mode) {
            case 0: this._drawGodRays(ctx, w, h); break;
            case 1: this._drawElectricStorm(ctx, w, h); break;
            case 2: this._drawAurora(ctx, w, h); break;
            case 3: this._drawFog(ctx, w, h); break;
            case 4: this._drawEmbers(ctx, w, h); break;
            case 5: this._drawCaustics(ctx, w, h); break;
        }

        ctx.restore();
    }

    _drawGodRays(ctx, w, h) {
        const srcX = this.raySourceX * w;
        const srcY = this.raySourceY * h;

        ctx.globalCompositeOperation = 'lighter';

        for (const ray of this.rays) {
            const oscillation = Math.sin(this.tick * ray.speed + ray.phase);
            const angle = ray.angle + oscillation * 0.1;
            const intensity = ray.intensity * (0.7 + oscillation * 0.3);
            const alpha = intensity * 0.04;

            const length = Math.max(w, h) * 1.5;
            const halfWidth = ray.width * length;

            const endX = srcX + Math.cos(angle + Math.PI / 2) * length;
            const endY = srcY + Math.sin(angle + Math.PI / 2) * length;
            const leftX = endX + Math.cos(angle) * halfWidth;
            const leftY = endY + Math.sin(angle) * halfWidth;
            const rightX = endX - Math.cos(angle) * halfWidth;
            const rightY = endY - Math.sin(angle) * halfWidth;

            const grad = ctx.createLinearGradient(srcX, srcY, endX, endY);
            grad.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 80%, ${alpha})`);
            grad.addColorStop(0.3, `hsla(${this.hue}, ${this.saturation}%, 60%, ${alpha * 0.7})`);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(srcX, srcY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            ctx.fill();
        }

        // Subtle source glow
        const sourceGlow = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, 60);
        sourceGlow.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 90%, 0.06)`);
        sourceGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = sourceGlow;
        ctx.fillRect(srcX - 60, srcY - 60, 120, 120);
    }

    _drawElectricStorm(ctx, w, h) {
        // Ambient charge glow at top
        if (this.ambientCharge > 0.1) {
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createLinearGradient(0, 0, 0, h * 0.3);
            grad.addColorStop(0, `hsla(${(this.hue + 200) % 360}, 60%, 50%, ${this.ambientCharge * 0.04})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h * 0.3);
        }

        // Draw charge particles
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.chargeParticles) {
            if (p.brightness < 0.05) continue;
            ctx.fillStyle = `hsla(${(this.hue + 200) % 360}, 80%, 80%, ${p.brightness * 0.15})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw lightning bolts
        for (const bolt of this.bolts) {
            const alpha = (bolt.life / bolt.maxLife);
            ctx.globalCompositeOperation = 'lighter';

            // Glow pass
            ctx.strokeStyle = `hsla(${(this.hue + 200) % 360}, 80%, 80%, ${alpha * 0.3})`;
            ctx.lineWidth = 4;
            this._strokeBoltSegments(ctx, bolt.segments);

            // Core pass
            ctx.strokeStyle = `hsla(${(this.hue + 200) % 360}, 60%, 95%, ${alpha * 0.7})`;
            ctx.lineWidth = 1.5;
            this._strokeBoltSegments(ctx, bolt.segments);

            // Flash at impact point
            if (bolt.life > bolt.maxLife - 3) {
                const flashAlpha = (bolt.life - bolt.maxLife + 3) / 3 * 0.1;
                ctx.fillStyle = `hsla(${(this.hue + 200) % 360}, 50%, 90%, ${flashAlpha})`;
                ctx.fillRect(0, 0, w, h);
            }
        }
    }

    _strokeBoltSegments(ctx, segments) {
        ctx.beginPath();
        let branching = false;
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (seg.branch) { branching = true; ctx.stroke(); ctx.beginPath(); continue; }
            if (i === 0 || branching) { ctx.moveTo(seg.x, seg.y); branching = false; }
            else ctx.lineTo(seg.x, seg.y);
        }
        ctx.stroke();
    }

    _drawAurora(ctx, w, h) {
        ctx.globalCompositeOperation = 'lighter';

        for (const wave of this.auroraWaves) {
            const baseY = wave.y * h;
            const points = Math.ceil(w / 20);

            ctx.beginPath();
            ctx.moveTo(0, baseY);

            for (let i = 0; i <= points; i++) {
                const x = (i / points) * w;
                const y = baseY + Math.sin(x * wave.frequency + this.tick * wave.speed + wave.phase) * wave.amplitude
                    + Math.sin(x * wave.frequency * 2.3 + this.tick * wave.speed * 0.7) * wave.amplitude * 0.3;
                ctx.lineTo(x, y);
            }

            ctx.lineTo(w, baseY + wave.height);
            for (let i = points; i >= 0; i--) {
                const x = (i / points) * w;
                const y = baseY + wave.height + Math.sin(x * wave.frequency * 0.8 + this.tick * wave.speed * 0.5 + wave.phase + 1) * wave.amplitude * 0.5;
                ctx.lineTo(x, y);
            }
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, baseY - wave.amplitude, 0, baseY + wave.height + wave.amplitude);
            grad.addColorStop(0, `hsla(${wave.hue}, ${this.saturation}%, 60%, 0)`);
            grad.addColorStop(0.3, `hsla(${wave.hue}, ${this.saturation}%, 55%, ${wave.opacity})`);
            grad.addColorStop(0.6, `hsla(${(wave.hue + 30) % 360}, ${this.saturation}%, 50%, ${wave.opacity * 0.8})`);
            grad.addColorStop(1, `hsla(${(wave.hue + 60) % 360}, ${this.saturation}%, 40%, 0)`);

            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    _drawFog(ctx, w, h) {
        ctx.globalCompositeOperation = 'source-over';

        for (const bank of this.fogBanks) {
            const grad = ctx.createLinearGradient(0, bank.y - bank.height / 2, 0, bank.y + bank.height / 2);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.3, `hsla(${bank.hue}, 15%, 30%, ${bank.density * bank.depth})`);
            grad.addColorStop(0.5, `hsla(${bank.hue}, 15%, 25%, ${bank.density * bank.depth * 1.5})`);
            grad.addColorStop(0.7, `hsla(${bank.hue}, 15%, 30%, ${bank.density * bank.depth})`);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.save();
            ctx.translate(bank.offset - w, 0);
            ctx.fillRect(0, bank.y - bank.height / 2, w * 3, bank.height);
            ctx.restore();
        }
    }

    _drawEmbers(ctx, w, h) {
        ctx.globalCompositeOperation = 'lighter';

        for (const e of this.embers) {
            const hue = (this.hue + e.hueOffset + 360) % 360;
            const alpha = e.life * 0.5;

            // Glow
            ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha * 0.2})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Heat shimmer at bottom - smooth threshold based on peak count
        if (this._peakEmberCount > 2) {
            const shimmerIntensity = Math.min(1, this._peakEmberCount / this.maxEmbers);
            const grad = ctx.createLinearGradient(0, h, 0, h * 0.7);
            grad.addColorStop(0, `hsla(${this.hue}, 80%, 30%, ${0.02 + shimmerIntensity * 0.03})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, h * 0.7, w, h * 0.3);
        }
    }

    _drawCaustics(ctx, w, h) {
        ctx.globalCompositeOperation = 'lighter';

        const scale = this.causticScale;
        const cols = Math.ceil(w / scale) + 1;
        const rows = Math.ceil(h / scale) + 1;
        const complexity = this.causticComplexity;
        const phase = this.causticPhase;

        // Pre-compute sine table for the current phase to reduce per-cell trig
        ctx.lineWidth = 0.8;

        // Skip every other cell at lower quality for performance
        const step = (cols * rows > 300) ? 2 : 1;

        for (let y = 0; y < rows; y += step) {
            for (let x = 0; x < cols; x += step) {
                const px = x * scale;
                const py = y * scale;

                // Layered sine waves for caustic pattern
                let val = 0;
                for (let c = 1; c <= complexity; c++) {
                    val += Math.sin(px * 0.02 * c + phase * c) *
                           Math.cos(py * 0.02 * c + phase * 0.7 * c) * (1 / c);
                }
                val = (val + complexity) / (complexity * 2);
                val = val * val; // sharpen

                if (val < 0.15) continue;

                const alpha = val * 0.08;
                const hue = (this.hue + val * 40) % 360;
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;

                const drawScale = scale * step;
                const nextVal = Math.sin(px * 0.02 + phase) * Math.cos((py + drawScale) * 0.02 + phase * 0.7);
                const curve = nextVal * 10;

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.quadraticCurveTo(px + curve, py + drawScale / 2, px + drawScale, py + drawScale);
                ctx.stroke();
            }
        }
    }
}
