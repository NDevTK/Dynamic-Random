/**
 * @file ferrofluid_effects.js
 * @description Simulates magnetic ferrofluid behavior - viscous metallic spikes that
 * form around the cursor like a magnetic field, with surface tension and reflective
 * sheen. The seed controls spike count, viscosity, color, magnetic strength, and
 * surface behavior.
 *
 * Modes:
 * 0 - Classic Ferrofluid: Dark metallic spikes reaching toward cursor
 * 1 - Solar Corona: Bright plasma spikes erupting from a central mass
 * 2 - Sea Urchin: Organic spines that pulse and breathe rhythmically
 * 3 - Electric Crown: Neon-colored spikes with electrical discharge between tips
 * 4 - Frozen Shatter: Crystalline ice spikes that crack and reform
 * 5 - Ink Thorns: Calligraphic brush-stroke spikes with dripping effect
 */

const TAU = Math.PI * 2;

export class Ferrofluid {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 220;
        this.saturation = 30;
        this._rng = Math.random;

        // Blob center
        this._blobX = 0;
        this._blobY = 0;
        this._blobVX = 0;
        this._blobVY = 0;
        this._blobRadius = 60;

        // Spike parameters
        this._spikeCount = 24;
        this._spikes = []; // { angle, length, targetLength, velocity, phase }
        this._spikeMaxLen = 120;
        this._spikeMinLen = 5;
        this._viscosity = 0.08;
        this._magneticStrength = 1;
        this._surfaceTension = 0.15;

        // Drip particles (for ink mode)
        this._drips = [];
        this._maxDrips = 40;

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        // Secondary blobs for multi-blob mode
        this._secondaryBlobs = [];
    }

    configure(rng, hues) {
        this._rng = rng;
        this.tick = 0;
        this.hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this.saturation = hues.length > 0 ? hues[0].s : 30 + rng() * 50;

        this.mode = Math.floor(rng() * 6);

        // Configure per mode
        switch (this.mode) {
            case 0: // Classic Ferrofluid
                this._spikeCount = 20 + Math.floor(rng() * 16);
                this._blobRadius = 50 + rng() * 30;
                this._spikeMaxLen = 80 + rng() * 80;
                this._viscosity = 0.06 + rng() * 0.08;
                this._magneticStrength = 0.8 + rng() * 0.6;
                this._surfaceTension = 0.12 + rng() * 0.1;
                this.saturation = 10 + rng() * 20; // Dark metallic
                break;
            case 1: // Solar Corona
                this._spikeCount = 30 + Math.floor(rng() * 20);
                this._blobRadius = 40 + rng() * 25;
                this._spikeMaxLen = 100 + rng() * 120;
                this._viscosity = 0.04 + rng() * 0.06;
                this._magneticStrength = 1.2 + rng() * 0.5;
                this._surfaceTension = 0.08 + rng() * 0.06;
                break;
            case 2: // Sea Urchin
                this._spikeCount = 40 + Math.floor(rng() * 20);
                this._blobRadius = 35 + rng() * 20;
                this._spikeMaxLen = 60 + rng() * 60;
                this._viscosity = 0.1 + rng() * 0.1;
                this._magneticStrength = 0.5 + rng() * 0.4;
                this._surfaceTension = 0.2 + rng() * 0.1;
                break;
            case 3: // Electric Crown
                this._spikeCount = 16 + Math.floor(rng() * 12);
                this._blobRadius = 45 + rng() * 25;
                this._spikeMaxLen = 90 + rng() * 100;
                this._viscosity = 0.03 + rng() * 0.05;
                this._magneticStrength = 1.5 + rng() * 0.5;
                this._surfaceTension = 0.05 + rng() * 0.05;
                break;
            case 4: // Frozen Shatter
                this._spikeCount = 12 + Math.floor(rng() * 10);
                this._blobRadius = 55 + rng() * 30;
                this._spikeMaxLen = 70 + rng() * 90;
                this._viscosity = 0.15 + rng() * 0.1;
                this._magneticStrength = 0.6 + rng() * 0.4;
                this._surfaceTension = 0.25 + rng() * 0.1;
                break;
            case 5: // Ink Thorns
                this._spikeCount = 18 + Math.floor(rng() * 14);
                this._blobRadius = 40 + rng() * 20;
                this._spikeMaxLen = 100 + rng() * 80;
                this._viscosity = 0.05 + rng() * 0.07;
                this._magneticStrength = 1.0 + rng() * 0.5;
                this._surfaceTension = 0.1 + rng() * 0.08;
                break;
        }

        // Initialize spikes
        this._spikes = [];
        for (let i = 0; i < this._spikeCount; i++) {
            this._spikes.push({
                angle: (i / this._spikeCount) * TAU,
                length: this._spikeMinLen + rng() * 20,
                targetLength: this._spikeMinLen,
                velocity: 0,
                phase: rng() * TAU,
                width: 0.5 + rng() * 1.5,
                wobble: rng() * 0.3,
            });
        }

        // Secondary blobs
        this._secondaryBlobs = [];
        const blobCount = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < blobCount; i++) {
            this._secondaryBlobs.push({
                x: rng() * window.innerWidth,
                y: rng() * window.innerHeight,
                vx: 0, vy: 0,
                radius: 20 + rng() * 25,
                orbitDist: 100 + rng() * 150,
                orbitSpeed: 0.005 + rng() * 0.01,
                orbitPhase: rng() * TAU,
            });
        }

        // Start blob at center
        this._blobX = window.innerWidth / 2;
        this._blobY = window.innerHeight / 2;
        this._blobVX = 0;
        this._blobVY = 0;
        this._drips = [];
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._isClicking = isClicking;
        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = this._mouseX;
        this._prevMY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;

        // Move blob toward cursor with viscous lag
        const toMouseX = mx - this._blobX;
        const toMouseY = my - this._blobY;
        const dist = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY) + 1;
        const pull = Math.min(dist * 0.02, 3) * this._magneticStrength;
        this._blobVX += (toMouseX / dist) * pull;
        this._blobVY += (toMouseY / dist) * pull;
        this._blobVX *= 0.85;
        this._blobVY *= 0.85;
        this._blobX += this._blobVX;
        this._blobY += this._blobVY;

        // Update spikes
        const mouseAngle = Math.atan2(toMouseY, toMouseX);
        for (const spike of this._spikes) {
            // Calculate target length based on direction to mouse
            let angleDiff = spike.angle - mouseAngle;
            while (angleDiff > Math.PI) angleDiff -= TAU;
            while (angleDiff < -Math.PI) angleDiff += TAU;

            const alignment = Math.cos(angleDiff);
            const magneticPull = Math.max(0, alignment) * dist * 0.3 * this._magneticStrength;
            spike.targetLength = this._spikeMinLen + Math.min(magneticPull, this._spikeMaxLen);

            // Click makes all spikes extend dramatically
            if (isClicking) {
                spike.targetLength = this._spikeMaxLen * 0.8 + Math.sin(spike.phase + this.tick * 0.1) * 20;
            }

            // Sea urchin breathing
            if (this.mode === 2) {
                spike.targetLength += Math.sin(this.tick * 0.03 + spike.phase) * 15;
            }

            // Spring physics
            const force = (spike.targetLength - spike.length) * this._viscosity;
            spike.velocity += force;
            spike.velocity *= (1 - this._surfaceTension);
            spike.length += spike.velocity;
            spike.length = Math.max(this._spikeMinLen, spike.length);

            // Add wobble
            spike.angle += Math.sin(this.tick * 0.02 + spike.phase) * spike.wobble * 0.01;
        }

        // Update secondary blobs
        for (const blob of this._secondaryBlobs) {
            blob.orbitPhase += blob.orbitSpeed;
            const targetX = this._blobX + Math.cos(blob.orbitPhase) * blob.orbitDist;
            const targetY = this._blobY + Math.sin(blob.orbitPhase) * blob.orbitDist;
            blob.vx += (targetX - blob.x) * 0.02;
            blob.vy += (targetY - blob.y) * 0.02;
            blob.vx *= 0.9;
            blob.vy *= 0.9;
            blob.x += blob.vx;
            blob.y += blob.vy;
        }

        // Drips for ink mode
        if (this.mode === 5 && this.tick % 8 === 0 && this._drips.length < this._maxDrips) {
            const spikeIdx = Math.floor(((this.tick * 2654435761) >>> 0) / 4294967296 * this._spikes.length);
            const spike = this._spikes[spikeIdx];
            if (spike.length > this._spikeMaxLen * 0.4) {
                const tipX = this._blobX + Math.cos(spike.angle) * (this._blobRadius + spike.length);
                const tipY = this._blobY + Math.sin(spike.angle) * (this._blobRadius + spike.length);
                this._drips.push({ x: tipX, y: tipY, vy: 0.5, life: 60, size: 1 + spike.width });
            }
        }
        for (let i = this._drips.length - 1; i >= 0; i--) {
            const d = this._drips[i];
            d.vy += 0.05; // gravity
            d.y += d.vy;
            d.life--;
            d.size *= 0.99;
            if (d.life <= 0 || d.y > window.innerHeight) {
                this._drips[i] = this._drips[this._drips.length - 1];
                this._drips.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const bx = this._blobX;
        const by = this._blobY;
        const br = this._blobRadius;

        // Draw secondary blobs with connections
        for (const blob of this._secondaryBlobs) {
            const dx = blob.x - bx;
            const dy = blob.y - by;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Connection tendril
            if (dist < blob.orbitDist * 1.5) {
                const alpha = (1 - dist / (blob.orbitDist * 1.5)) * 0.3;
                ctx.strokeStyle = this._getColor(0.5, alpha);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(bx + (dx / dist) * br, by + (dy / dist) * br);
                const cpx = (bx + blob.x) / 2 + Math.sin(this.tick * 0.03) * 20;
                const cpy = (by + blob.y) / 2 + Math.cos(this.tick * 0.03) * 20;
                ctx.quadraticCurveTo(cpx, cpy, blob.x, blob.y);
                ctx.stroke();
            }

            // Secondary blob body
            ctx.fillStyle = this._getColor(0.6, 0.4);
            ctx.beginPath();
            ctx.arc(blob.x, blob.y, blob.radius, 0, TAU);
            ctx.fill();
        }

        // Draw main blob body with gradient
        const bodyGrad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0, bx, by, br);
        bodyGrad.addColorStop(0, this._getColor(0.9, 0.6));
        bodyGrad.addColorStop(0.7, this._getColor(0.5, 0.4));
        bodyGrad.addColorStop(1, this._getColor(0.3, 0.2));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.fill();

        // Draw spikes
        for (let i = 0; i < this._spikes.length; i++) {
            const spike = this._spikes[i];
            const len = spike.length;
            if (len < this._spikeMinLen + 2) continue;

            const angle = spike.angle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Base of spike on blob surface
            const baseX = bx + cos * br;
            const baseY = by + sin * br;
            // Tip of spike
            const tipX = bx + cos * (br + len);
            const tipY = by + sin * (br + len);
            // Width control points
            const perpX = -sin * spike.width * 3;
            const perpY = cos * spike.width * 3;

            const intensity = Math.min(1, len / this._spikeMaxLen);

            if (this.mode === 3) {
                // Electric Crown: neon glow lines
                ctx.strokeStyle = this._getColor(1, intensity * 0.6);
                ctx.lineWidth = spike.width + 1;
                ctx.shadowColor = this._getColor(1, 0.8);
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                // Jagged line for electric effect
                const segments = 4;
                for (let s = 1; s <= segments; s++) {
                    const t = s / segments;
                    const jx = baseX + (tipX - baseX) * t + (Math.sin(this.tick * 0.3 + i + s) * 5 * (1 - t));
                    const jy = baseY + (tipY - baseY) * t + (Math.cos(this.tick * 0.3 + i + s) * 5 * (1 - t));
                    ctx.lineTo(jx, jy);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Discharge arcs between neighboring spike tips
                if (i > 0 && len > this._spikeMaxLen * 0.3) {
                    const prev = this._spikes[i - 1];
                    if (prev.length > this._spikeMaxLen * 0.3) {
                        const prevTipX = bx + Math.cos(prev.angle) * (br + prev.length);
                        const prevTipY = bx + Math.sin(prev.angle) * (br + prev.length);
                        const arcDist = Math.sqrt((tipX - prevTipX) ** 2 + (tipY - prevTipY) ** 2);
                        if (arcDist < 100 && this.tick % 3 === 0) {
                            ctx.strokeStyle = this._getColor(1, 0.3);
                            ctx.lineWidth = 0.5;
                            ctx.beginPath();
                            ctx.moveTo(tipX, tipY);
                            ctx.lineTo(prevTipX, prevTipY);
                            ctx.stroke();
                        }
                    }
                }
            } else if (this.mode === 5) {
                // Ink Thorns: brush-stroke style
                ctx.fillStyle = this._getColor(0.8, intensity * 0.5);
                ctx.beginPath();
                ctx.moveTo(baseX + perpX, baseY + perpY);
                ctx.quadraticCurveTo(
                    (baseX + tipX) / 2 + perpX * 0.3,
                    (baseY + tipY) / 2 + perpY * 0.3,
                    tipX, tipY
                );
                ctx.quadraticCurveTo(
                    (baseX + tipX) / 2 - perpX * 0.3,
                    (baseY + tipY) / 2 - perpY * 0.3,
                    baseX - perpX, baseY - perpY
                );
                ctx.fill();
            } else {
                // Standard spike: tapered triangle
                ctx.fillStyle = this._getColor(0.7, intensity * 0.5);
                ctx.beginPath();
                ctx.moveTo(baseX + perpX, baseY + perpY);
                ctx.lineTo(tipX, tipY);
                ctx.lineTo(baseX - perpX, baseY - perpY);
                ctx.closePath();
                ctx.fill();

                // Highlight edge
                ctx.strokeStyle = this._getColor(1, intensity * 0.3);
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(baseX + perpX, baseY + perpY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
            }
        }

        // Frozen Shatter: crack lines
        if (this.mode === 4) {
            ctx.strokeStyle = this._getColor(0.9, 0.15);
            ctx.lineWidth = 0.5;
            for (let i = 0; i < this._spikes.length; i += 2) {
                const spike = this._spikes[i];
                const tipX = bx + Math.cos(spike.angle) * (br + spike.length);
                const tipY = by + Math.sin(spike.angle) * (br + spike.length);
                // Branching crack
                const branchAngle = spike.angle + (Math.sin(this.tick * 0.01 + i) * 0.5);
                const branchLen = spike.length * 0.4;
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(
                    tipX + Math.cos(branchAngle) * branchLen,
                    tipY + Math.sin(branchAngle) * branchLen
                );
                ctx.stroke();
            }
        }

        // Drips (ink mode)
        if (this.mode === 5) {
            for (const d of this._drips) {
                const alpha = (d.life / 60) * 0.4;
                ctx.fillStyle = this._getColor(0.6, alpha);
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, TAU);
                ctx.fill();
            }
        }

        // Solar Corona: glow overlay
        if (this.mode === 1) {
            const glowGrad = ctx.createRadialGradient(bx, by, br, bx, by, br + this._spikeMaxLen * 0.7);
            glowGrad.addColorStop(0, this._getColor(1, 0.15));
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(bx, by, br + this._spikeMaxLen * 0.7, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    _getColor(lightness, alpha) {
        const h = this.hue;
        const s = this.saturation;
        const l = this.mode === 0 ? lightness * 40 : lightness * 70; // Ferrofluid is dark
        return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    }
}
