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

        // Aurora
        this.auroraWaves = [];

        // Fog
        this.fogBanks = [];

        // Embers
        this.embers = [];
        this.maxEmbers = 50;
        this.emberPool = [];

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

        switch (this.mode) {
            case 0: // God rays
                this.rayCount = 4 + Math.floor(rng() * 6);
                this.rays = [];
                this.raySourceX = 0.2 + rng() * 0.6;
                this.raySourceY = rng() * 0.3;
                for (let i = 0; i < this.rayCount; i++) {
                    this.rays.push({
                        angle: (i / this.rayCount) * Math.PI * 0.8 - Math.PI * 0.4 + (rng() - 0.5) * 0.2,
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
                        hue: (this.hue + rng() * 20 - 10) % 360,
                    });
                }
                break;

            case 4: // Embers
                this.embers = [];
                this.maxEmbers = 30 + Math.floor(rng() * 30);
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
        // Slowly shift ray source toward mouse (subtle parallax)
        const targetX = mx / window.innerWidth;
        const targetY = my / window.innerHeight * 0.3;
        this.raySourceX += (targetX - this.raySourceX) * 0.01;
        this.raySourceY += (targetY - this.raySourceY) * 0.01;
    }

    _updateElectricStorm(mx, my, isClicking) {
        // Build ambient charge
        this.ambientCharge += isClicking ? 0.05 : 0.002;
        if (this.ambientCharge > 1) this.ambientCharge = 1;

        // Spawn bolt on click or randomly when charged
        if ((isClicking || (this.ambientCharge > 0.7 && Math.random() < 0.02)) && this.bolts.length < this.maxBolts) {
            const bolt = this.boltPool.length > 0 ? this.boltPool.pop() : {};
            // Random start/end points, biased toward cursor for clicks
            if (isClicking) {
                bolt.x1 = mx + (Math.random() - 0.5) * 200;
                bolt.y1 = 0;
                bolt.x2 = mx + (Math.random() - 0.5) * 100;
                bolt.y2 = my;
            } else {
                bolt.x1 = Math.random() * window.innerWidth;
                bolt.y1 = 0;
                bolt.x2 = Math.random() * window.innerWidth;
                bolt.y2 = window.innerHeight * (0.3 + Math.random() * 0.7);
            }
            bolt.life = 8 + Math.floor(Math.random() * 8);
            bolt.maxLife = bolt.life;
            bolt.segments = this._generateBoltSegments(bolt.x1, bolt.y1, bolt.x2, bolt.y2, 6);
            this.bolts.push(bolt);
            this.ambientCharge *= 0.3;
        }

        // Update bolts
        for (let i = this.bolts.length - 1; i >= 0; i--) {
            this.bolts[i].life--;
            if (this.bolts[i].life <= 0) {
                this.boltPool.push(this.bolts[i]);
                this.bolts[i] = this.bolts[this.bolts.length - 1];
                this.bolts.pop();
            }
        }

        // Update charge particles
        for (const p of this.chargeParticles) {
            p.x += p.vx; p.y += p.vy;
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy += (Math.random() - 0.5) * 0.1;
            p.vx *= 0.95; p.vy *= 0.95;
            p.brightness = this.ambientCharge * (0.5 + Math.random() * 0.5);
            const w = window.innerWidth, h = window.innerHeight;
            if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        }
    }

    _generateBoltSegments(x1, y1, x2, y2, depth) {
        if (depth === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];

        const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * Math.abs(x2 - x1) * 0.4;
        const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * Math.abs(y2 - y1) * 0.15;

        const left = this._generateBoltSegments(x1, y1, midX, midY, depth - 1);
        const right = this._generateBoltSegments(midX, midY, x2, y2, depth - 1);

        // Add branch
        const segments = [...left, ...right.slice(1)];
        if (depth > 2 && Math.random() < 0.4) {
            const branchStart = segments[Math.floor(segments.length / 2)];
            const branchEnd = {
                x: branchStart.x + (Math.random() - 0.5) * 100,
                y: branchStart.y + 30 + Math.random() * 80,
            };
            segments.push({ x: branchStart.x, y: branchStart.y, branch: true });
            segments.push(branchEnd);
        }
        return segments;
    }

    _updateFog(mx, my) {
        const w = window.innerWidth;
        for (const bank of this.fogBanks) {
            bank.offset += bank.speed * bank.direction;
            if (bank.offset > w * 2) bank.offset -= w * 3;
            if (bank.offset < -w) bank.offset += w * 3;

            // Mouse pushes fog slightly
            const dy = my - bank.y;
            if (Math.abs(dy) < bank.height) {
                bank.y += (dy > 0 ? 0.2 : -0.2);
            }
        }
    }

    _updateEmbers(mx, my) {
        // Spawn embers from bottom
        if (this.tick % 4 === 0 && this.embers.length < this.maxEmbers) {
            const ember = this.emberPool.length > 0 ? this.emberPool.pop() : {};
            const w = window.innerWidth, h = window.innerHeight;
            ember.x = Math.random() * w;
            ember.y = h + 10;
            ember.vx = (Math.random() - 0.5) * 0.5;
            ember.vy = -(0.5 + Math.random() * 1.5);
            ember.life = 1.0;
            ember.decay = 0.002 + Math.random() * 0.003;
            ember.size = 1 + Math.random() * 3;
            ember.wobble = Math.random() * Math.PI * 2;
            ember.wobbleSpeed = 0.02 + Math.random() * 0.04;
            ember.hueOffset = Math.random() * 30 - 15;
            this.embers.push(ember);
        }

        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.wobble += e.wobbleSpeed;
            e.x += e.vx + Math.sin(e.wobble) * 0.5;
            e.y += e.vy;
            e.vy *= 0.999; // slow down slightly

            // Mouse heat pushes embers away
            const dx = e.x - mx, dy = e.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            if (dist < 100) {
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

            // Draw ray as a triangle from source expanding outward
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
    }

    _drawElectricStorm(ctx, w, h) {
        // Ambient charge glow at top
        if (this.ambientCharge > 0.1) {
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createLinearGradient(0, 0, 0, h * 0.3);
            grad.addColorStop(0, `hsla(${this.hue + 200}, 60%, 50%, ${this.ambientCharge * 0.04})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h * 0.3);
        }

        // Draw charge particles
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.chargeParticles) {
            if (p.brightness < 0.05) continue;
            ctx.fillStyle = `hsla(${this.hue + 200}, 80%, 80%, ${p.brightness * 0.15})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw lightning bolts
        for (const bolt of this.bolts) {
            const alpha = (bolt.life / bolt.maxLife);
            ctx.globalCompositeOperation = 'lighter';

            // Glow
            ctx.strokeStyle = `hsla(${this.hue + 200}, 80%, 80%, ${alpha * 0.3})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            let branching = false;
            for (let i = 0; i < bolt.segments.length; i++) {
                const seg = bolt.segments[i];
                if (seg.branch) { branching = true; ctx.stroke(); ctx.beginPath(); continue; }
                if (i === 0 || branching) { ctx.moveTo(seg.x, seg.y); branching = false; }
                else ctx.lineTo(seg.x, seg.y);
            }
            ctx.stroke();

            // Core
            ctx.strokeStyle = `hsla(${this.hue + 200}, 60%, 95%, ${alpha * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            branching = false;
            for (let i = 0; i < bolt.segments.length; i++) {
                const seg = bolt.segments[i];
                if (seg.branch) { branching = true; ctx.stroke(); ctx.beginPath(); continue; }
                if (i === 0 || branching) { ctx.moveTo(seg.x, seg.y); branching = false; }
                else ctx.lineTo(seg.x, seg.y);
            }
            ctx.stroke();

            // Flash at impact point
            if (bolt.life > bolt.maxLife - 3) {
                const flashAlpha = (bolt.life - bolt.maxLife + 3) / 3 * 0.1;
                ctx.fillStyle = `hsla(${this.hue + 200}, 50%, 90%, ${flashAlpha})`;
                ctx.fillRect(0, 0, w, h);
            }
        }
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

            // Close bottom of curtain
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
            // Draw shifted by offset for horizontal movement
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

        // Heat shimmer at bottom
        if (this.embers.length > 5) {
            const grad = ctx.createLinearGradient(0, h, 0, h * 0.7);
            grad.addColorStop(0, `hsla(${this.hue}, 80%, 30%, 0.04)`);
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

        ctx.lineWidth = 0.8;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const px = x * scale;
                const py = y * scale;

                // Layered sine waves for caustic pattern
                let val = 0;
                for (let c = 1; c <= this.causticComplexity; c++) {
                    val += Math.sin(px * 0.02 * c + this.causticPhase * c) *
                           Math.cos(py * 0.02 * c + this.causticPhase * 0.7 * c) * (1 / c);
                }
                val = (val + this.causticComplexity) / (this.causticComplexity * 2); // normalize to 0-1
                val = Math.pow(val, 2); // sharpen

                if (val < 0.15) continue;

                const alpha = val * 0.08;
                const hue = (this.hue + val * 40) % 360;
                ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 65%, ${alpha})`;

                // Draw as small curved line segment
                const nextVal = Math.sin(px * 0.02 + this.causticPhase) * Math.cos((py + scale) * 0.02 + this.causticPhase * 0.7);
                const curve = nextVal * 10;

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.quadraticCurveTo(px + curve, py + scale / 2, px + scale, py + scale);
                ctx.stroke();
            }
        }
    }
}
