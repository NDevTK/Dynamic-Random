/**
 * @file gravitational_lens_effects.js
 * @description Space-warping visual distortions around the cursor that make the
 * background feel like it's being bent by gravity. Each seed produces a wildly
 * different lens personality - from gentle rippling water to aggressive reality-tearing.
 *
 * Modes:
 * 0 - Black Hole Lens: circular distortion pulls nearby pixels toward cursor center
 * 1 - Chromatic Rift: splits RGB channels apart in a prism-like rainbow splay
 * 2 - Liquid Glass: wobbly refraction like looking through uneven glass
 * 3 - Reality Fracture: jagged cracks radiate from cursor showing "underneath" layer
 * 4 - Temporal Smear: motion-blur streaks trail behind cursor movement
 * 5 - Gravity Rings: concentric rings of alternating magnification/minification
 */

export class GravitationalLens {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 70;
        this.intensity = 1;

        // Shared
        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;

        // Black Hole
        this.lensRadius = 120;
        this.lensStrength = 0.4;
        this.eventHorizonRatio = 0.15;

        // Chromatic Rift
        this.riftSpread = 8;
        this.riftAngle = 0;
        this.riftRotationSpeed = 0.02;

        // Liquid Glass
        this.glassWobbleFreq = 0.05;
        this.glassWobbleAmp = 6;
        this.glassPhase = 0;

        // Reality Fracture
        this.fractures = [];
        this.fracturePool = [];
        this.maxFractures = 12;
        this.fractureDecay = 0.97;

        // Temporal Smear
        this.smearHistory = [];
        this.smearHistoryMax = 20;
        this.smearWidth = 30;

        // Gravity Rings
        this.ringCount = 5;
        this.ringPulseSpeed = 0.03;
        this.ringSpacing = 25;
    }

    configure(rng, hues) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[Math.floor(rng() * hues.length)].h : Math.floor(rng() * 360);
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.5 + rng() * 1.0;
        this.fractures = [];
        this.smearHistory = [];

        // Mode-specific seeded parameters
        switch (this.mode) {
            case 0: // Black Hole
                this.lensRadius = 80 + rng() * 120;
                this.lensStrength = 0.2 + rng() * 0.6;
                this.eventHorizonRatio = 0.08 + rng() * 0.2;
                break;
            case 1: // Chromatic Rift
                this.riftSpread = 4 + rng() * 16;
                this.riftAngle = rng() * Math.PI * 2;
                this.riftRotationSpeed = 0.01 + rng() * 0.04;
                break;
            case 2: // Liquid Glass
                this.glassWobbleFreq = 0.02 + rng() * 0.08;
                this.glassWobbleAmp = 3 + rng() * 10;
                this.glassPhase = rng() * Math.PI * 2;
                break;
            case 3: // Reality Fracture
                this.fractureDecay = 0.94 + rng() * 0.04;
                this.maxFractures = 6 + Math.floor(rng() * 12);
                break;
            case 4: // Temporal Smear
                this.smearHistoryMax = 10 + Math.floor(rng() * 20);
                this.smearWidth = 15 + rng() * 40;
                break;
            case 5: // Gravity Rings
                this.ringCount = 3 + Math.floor(rng() * 6);
                this.ringPulseSpeed = 0.015 + rng() * 0.04;
                this.ringSpacing = 15 + rng() * 30;
                break;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._prevMouseX = this._mouseX;
        this._prevMouseY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;
        this._isClicking = isClicking;

        const dx = mx - this._prevMouseX;
        const dy = my - this._prevMouseY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        if (this.mode === 3) {
            // Spawn fractures on fast movement or clicks
            if ((this._mouseSpeed > 8 || isClicking) && this.fractures.length < this.maxFractures) {
                const fracture = this.fracturePool.length > 0 ? this.fracturePool.pop() : {};
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
                fracture.x = mx;
                fracture.y = my;
                fracture.angle = angle;
                fracture.length = 30 + Math.random() * 80;
                fracture.life = 1.0;
                fracture.width = 1 + Math.random() * 3;
                fracture.branches = Math.floor(Math.random() * 3);
                this.fractures.push(fracture);
            }
            // Update fractures
            for (let i = this.fractures.length - 1; i >= 0; i--) {
                this.fractures[i].life *= this.fractureDecay;
                if (this.fractures[i].life < 0.01) {
                    this.fracturePool.push(this.fractures[i]);
                    this.fractures[i] = this.fractures[this.fractures.length - 1];
                    this.fractures.pop();
                }
            }
        }

        if (this.mode === 4) {
            // Record smear history
            this.smearHistory.push({ x: mx, y: my });
            if (this.smearHistory.length > this.smearHistoryMax + 10) {
                this.smearHistory = this.smearHistory.slice(-this.smearHistoryMax);
            }
        }
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;
        const mx = this._mouseX;
        const my = this._mouseY;

        switch (this.mode) {
            case 0: this._drawBlackHoleLens(ctx, mx, my, w, h); break;
            case 1: this._drawChromaticRift(ctx, mx, my, w, h); break;
            case 2: this._drawLiquidGlass(ctx, mx, my, w, h); break;
            case 3: this._drawRealityFracture(ctx, mx, my, w, h); break;
            case 4: this._drawTemporalSmear(ctx, mx, my, w, h); break;
            case 5: this._drawGravityRings(ctx, mx, my, w, h); break;
        }
    }

    _drawBlackHoleLens(ctx, mx, my, w, h) {
        const r = this.lensRadius * (1 + this._mouseSpeed * 0.01);
        const clickBoost = this._isClicking ? 1.5 : 1;
        const strength = this.lensStrength * clickBoost * this.intensity;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Outer glow ring
        const grad = ctx.createRadialGradient(mx, my, r * this.eventHorizonRatio, mx, my, r);
        grad.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 70%, ${0.15 * strength})`);
        grad.addColorStop(0.3, `hsla(${this.hue + 30}, ${this.saturation}%, 50%, ${0.1 * strength})`);
        grad.addColorStop(0.7, `hsla(${this.hue + 60}, ${this.saturation}%, 40%, ${0.05 * strength})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();

        // Gravitational lensing ring (bright ring at the Schwarzschild radius)
        const ringR = r * 0.5 + Math.sin(this.tick * 0.03) * 5;
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, ${0.2 * strength})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Accretion disk - rotating ellipse
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(this.tick * 0.01);
        ctx.scale(1, 0.3);
        const diskGrad = ctx.createRadialGradient(0, 0, ringR * 0.7, 0, 0, ringR * 1.3);
        diskGrad.addColorStop(0, `hsla(${this.hue + 40}, 90%, 70%, ${0.15 * strength})`);
        diskGrad.addColorStop(0.5, `hsla(${this.hue}, 80%, 50%, ${0.1 * strength})`);
        diskGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(0, 0, ringR * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Event horizon (dark center)
        ctx.globalCompositeOperation = 'destination-out';
        const horizonR = r * this.eventHorizonRatio;
        const horizonGrad = ctx.createRadialGradient(mx, my, 0, mx, my, horizonR);
        horizonGrad.addColorStop(0, `rgba(0, 0, 0, ${0.3 * strength})`);
        horizonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = horizonGrad;
        ctx.beginPath();
        ctx.arc(mx, my, horizonR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawChromaticRift(ctx, mx, my, w, h) {
        const angle = this.riftAngle + this.tick * this.riftRotationSpeed;
        const spread = this.riftSpread * (1 + this._mouseSpeed * 0.05) * this.intensity;
        const clickSpread = this._isClicking ? spread * 2 : spread;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.08 * this.intensity;

        // Draw three offset circles for RGB separation
        const colors = [
            { color: `hsl(${this.hue}, 100%, 60%)`, offset: 1 },
            { color: `hsl(${(this.hue + 120) % 360}, 100%, 60%)`, offset: 0 },
            { color: `hsl(${(this.hue + 240) % 360}, 100%, 60%)`, offset: -1 },
        ];

        const radius = 60 + this._mouseSpeed * 2;
        for (const ch of colors) {
            const ox = Math.cos(angle) * clickSpread * ch.offset;
            const oy = Math.sin(angle) * clickSpread * ch.offset;
            const grad = ctx.createRadialGradient(mx + ox, my + oy, 0, mx + ox, my + oy, radius);
            grad.addColorStop(0, ch.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(mx + ox, my + oy, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Prismatic rays extending outward
        const rayCount = 6;
        ctx.lineWidth = 1;
        for (let i = 0; i < rayCount; i++) {
            const a = angle + (i / rayCount) * Math.PI * 2;
            const len = 40 + Math.sin(this.tick * 0.05 + i) * 20 + this._mouseSpeed * 3;
            const hueShift = (this.hue + i * 60) % 360;
            ctx.strokeStyle = `hsla(${hueShift}, 100%, 70%, ${0.15 * this.intensity})`;
            ctx.beginPath();
            ctx.moveTo(mx + Math.cos(a) * 10, my + Math.sin(a) * 10);
            ctx.lineTo(mx + Math.cos(a) * len, my + Math.sin(a) * len);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawLiquidGlass(ctx, mx, my, w, h) {
        this.glassPhase += 0.02;
        const amp = this.glassWobbleAmp * (1 + this._mouseSpeed * 0.03) * this.intensity;
        const freq = this.glassWobbleFreq;
        const clickAmp = this._isClicking ? amp * 2 : amp;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw wobbling concentric distortion rings
        const rings = 8;
        for (let i = rings; i > 0; i--) {
            const baseR = i * 15;
            const alpha = (1 - i / rings) * 0.06 * this.intensity;
            const hueShift = (this.hue + i * 15 + this.tick * 0.5) % 360;

            ctx.strokeStyle = `hsla(${hueShift}, ${this.saturation}%, 65%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            const segments = 32;
            for (let j = 0; j <= segments; j++) {
                const a = (j / segments) * Math.PI * 2;
                const wobble = Math.sin(a * 3 + this.glassPhase + i * 0.5) * clickAmp;
                const wobble2 = Math.cos(a * 5 + this.glassPhase * 1.3) * clickAmp * 0.5;
                const r = baseR + wobble + wobble2;
                const px = mx + Math.cos(a) * r;
                const py = my + Math.sin(a) * r;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Central caustic highlight
        const causticGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 40);
        causticGrad.addColorStop(0, `hsla(${this.hue}, 60%, 85%, ${0.1 * this.intensity})`);
        causticGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = causticGrad;
        ctx.beginPath();
        ctx.arc(mx, my, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawRealityFracture(ctx, mx, my, w, h) {
        if (this.fractures.length === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const f of this.fractures) {
            const alpha = f.life * 0.4 * this.intensity;
            const endX = f.x + Math.cos(f.angle) * f.length * f.life;
            const endY = f.y + Math.sin(f.angle) * f.length * f.life;

            // Main fracture line with manual glow (avoids expensive shadowBlur)
            // Glow pass (wider, dimmer)
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 70%, ${alpha * 0.3})`;
            ctx.lineWidth = f.width * f.life + 6 * f.life;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);

            // Jagged line - cache jag points for reuse in core pass
            const steps = 5;
            const jagPts = [{ x: f.x, y: f.y }];
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const jx = f.x + (endX - f.x) * t + (Math.random() - 0.5) * 10 * f.life;
                const jy = f.y + (endY - f.y) * t + (Math.random() - 0.5) * 10 * f.life;
                ctx.lineTo(jx, jy);
                jagPts.push({ x: jx, y: jy });
            }
            ctx.stroke();

            // Core pass (thinner, brighter)
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 90%, ${alpha})`;
            ctx.lineWidth = f.width * f.life;
            ctx.beginPath();
            ctx.moveTo(jagPts[0].x, jagPts[0].y);
            for (let s = 1; s < jagPts.length; s++) {
                ctx.lineTo(jagPts[s].x, jagPts[s].y);
            }
            ctx.stroke();

            // Branches
            for (let b = 0; b < f.branches; b++) {
                const branchT = 0.3 + Math.random() * 0.5;
                const bx = f.x + (endX - f.x) * branchT;
                const by = f.y + (endY - f.y) * branchT;
                const ba = f.angle + (Math.random() - 0.5) * 1.5;
                const bl = f.length * 0.3 * f.life;

                ctx.lineWidth = f.width * 0.5 * f.life;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl);
                ctx.stroke();
            }

            // "Otherworld" glow at fracture origin
            const glowGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 20 * f.life);
            glowGrad.addColorStop(0, `hsla(${(this.hue + 180) % 360}, 90%, 70%, ${alpha * 0.5})`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 20 * f.life, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawTemporalSmear(ctx, mx, my, w, h) {
        if (this.smearHistory.length < 2) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const len = this.smearHistory.length;
        const smearW = this.smearWidth * this.intensity;
        const clickBoost = this._isClicking ? 1.5 : 1;

        // Draw motion trail as a tapered ribbon
        for (let i = 1; i < len; i++) {
            const t = i / len;
            const p = this.smearHistory[i];
            const pp = this.smearHistory[i - 1];
            const alpha = t * 0.08 * this.intensity * clickBoost;
            const width = smearW * (1 - t) * clickBoost;
            const hueShift = (this.hue + t * 60) % 360;

            // Direction perpendicular to movement
            const dx = p.x - pp.x;
            const dy = p.y - pp.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const nx = -dy / dist;
            const ny = dx / dist;

            // Smear quad
            ctx.fillStyle = `hsla(${hueShift}, ${this.saturation}%, 65%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pp.x + nx * width, pp.y + ny * width);
            ctx.lineTo(p.x + nx * width * 0.8, p.y + ny * width * 0.8);
            ctx.lineTo(p.x - nx * width * 0.8, p.y - ny * width * 0.8);
            ctx.lineTo(pp.x - nx * width, pp.y - ny * width);
            ctx.closePath();
            ctx.fill();
        }

        // Speed-dependent afterimage at current position
        if (this._mouseSpeed > 3) {
            const afterGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 30 + this._mouseSpeed * 2);
            afterGrad.addColorStop(0, `hsla(${this.hue}, 80%, 75%, ${0.1 * this.intensity})`);
            afterGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = afterGrad;
            ctx.beginPath();
            ctx.arc(mx, my, 30 + this._mouseSpeed * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawGravityRings(ctx, mx, my, w, h) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const clickPulse = this._isClicking ? 1.5 : 1;
        const speedPulse = 1 + this._mouseSpeed * 0.02;

        for (let i = 0; i < this.ringCount; i++) {
            const phase = this.tick * this.ringPulseSpeed + i * 0.8;
            const pulse = Math.sin(phase) * 0.5 + 0.5;
            const r = (i + 1) * this.ringSpacing * speedPulse * clickPulse;
            const alpha = (1 - i / this.ringCount) * 0.12 * pulse * this.intensity;
            const lineW = (1 - i / this.ringCount) * 2 + 0.5;
            const hueShift = (this.hue + i * 25 + this.tick * 0.3) % 360;

            // Alternating magnification glow
            if (i % 2 === 0) {
                const ringGrad = ctx.createRadialGradient(mx, my, r - 5, mx, my, r + 5);
                ringGrad.addColorStop(0, 'transparent');
                ringGrad.addColorStop(0.5, `hsla(${hueShift}, ${this.saturation}%, 65%, ${alpha})`);
                ringGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = ringGrad;
                ctx.beginPath();
                ctx.arc(mx, my, r + 5, 0, Math.PI * 2);
                ctx.arc(mx, my, Math.max(0, r - 5), 0, Math.PI * 2, true);
                ctx.fill();
            }

            // Ring outline
            ctx.strokeStyle = `hsla(${hueShift}, ${this.saturation}%, 75%, ${alpha})`;
            ctx.lineWidth = lineW;
            ctx.beginPath();
            ctx.arc(mx, my, r, 0, Math.PI * 2);
            ctx.stroke();

            // Orbital dots on ring
            const dotCount = 3 + i;
            for (let d = 0; d < dotCount; d++) {
                const da = (d / dotCount) * Math.PI * 2 + this.tick * 0.02 * (i % 2 === 0 ? 1 : -1);
                const dx = mx + Math.cos(da) * r;
                const dy = my + Math.sin(da) * r;
                ctx.fillStyle = `hsla(${hueShift}, ${this.saturation}%, 85%, ${alpha * 1.5})`;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
