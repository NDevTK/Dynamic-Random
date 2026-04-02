/**
 * @file time_warp_architecture.js
 * @description Temporal distortion background with concentric time rings that warp
 * and bend around the cursor. Seed controls ring count, colors, rotation speeds,
 * distortion patterns, and temporal echo behavior. Clicking creates "time fractures"
 * that shatter nearby rings into spinning shards. The mouse acts as a temporal
 * anchor point — rings near it slow down, rings far away speed up, creating a
 * visible relativity effect.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';

export class TimeWarpArchitecture extends Architecture {
    constructor() {
        super();
        this.rings = [];
        this.echoes = [];
        this.fractures = [];
        this.fracturePool = [];
        this.shards = [];
        this.shardPool = [];
        this.chronoStreaks = [];
        this.tick = 0;
        this.baseHue = 0;
        this.ringStyle = 0;
        this.echoMode = 0;
        this.distortionType = 0;
        this.timeFlowDirection = 1;
        this.pulseWaveRadius = 0;
        this.pulseWaveActive = false;
    }

    init(system) {
        const rng = system.rng;
        const w = system.width;
        const h = system.height;

        this.tick = 0;
        this.baseHue = system.hue;
        this.rings = [];
        this.echoes = [];
        this.fractures = [];
        this.fracturePool = [];
        this.shards = [];
        this.shardPool = [];
        this.chronoStreaks = [];

        // Seed-driven style variants
        this.ringStyle = Math.floor(rng() * 5); // 0=smooth, 1=dashed, 2=dotted, 3=wavy, 4=double
        this.echoMode = Math.floor(rng() * 4);  // 0=trail, 1=mirror, 2=pulse, 3=spiral
        this.distortionType = Math.floor(rng() * 4); // 0=gravitational, 1=ripple, 2=fold, 3=shear
        this.timeFlowDirection = rng() > 0.5 ? 1 : -1;
        this.centerX = w * (0.3 + rng() * 0.4);
        this.centerY = h * (0.3 + rng() * 0.4);
        this.wobbleAmount = 0.5 + rng() * 2;
        this.wobbleFreq = 0.005 + rng() * 0.015;
        this.backgroundPulse = rng() > 0.6;
        this.chromaticSplit = rng() > 0.5;

        // Generate concentric time rings
        const ringCount = 8 + Math.floor(rng() * 15);
        const maxRadius = Math.max(w, h) * 0.7;

        for (let i = 0; i < ringCount; i++) {
            const t = (i + 1) / ringCount;
            const ringHue = (this.baseHue + i * (360 / ringCount) * (0.5 + rng() * 1)) % 360;
            this.rings.push({
                baseRadius: maxRadius * t * (0.3 + rng() * 0.7),
                radius: 0,
                hue: ringHue,
                saturation: 50 + rng() * 40,
                lightness: 30 + rng() * 30,
                rotation: rng() * Math.PI * 2,
                rotSpeed: (0.002 + rng() * 0.015) * (rng() > 0.5 ? 1 : -1) * this.timeFlowDirection,
                thickness: 1 + rng() * 3,
                alpha: 0.15 + rng() * 0.5,
                dashPattern: this.ringStyle === 1 ? [5 + rng() * 20, 3 + rng() * 15] : null,
                segments: this.ringStyle === 2 ? 12 + Math.floor(rng() * 36) : 0,
                waveAmplitude: this.ringStyle === 3 ? 3 + rng() * 12 : 0,
                waveFrequency: this.ringStyle === 3 ? 3 + Math.floor(rng() * 10) : 0,
                eccentricity: 0.7 + rng() * 0.3, // elliptical
                phaseOffset: rng() * Math.PI * 2,
                timeScale: 0.5 + rng() * 1.5, // how much mouse-proximity affects speed
                glowSize: rng() > 0.7 ? 2 + rng() * 6 : 0,
                frozen: false,
            });
        }

        // Chrono streaks: radial time-trails from center
        const streakCount = 5 + Math.floor(rng() * 12);
        for (let i = 0; i < streakCount; i++) {
            this.chronoStreaks.push({
                angle: (i / streakCount) * Math.PI * 2 + rng() * 0.3,
                length: 50 + rng() * 200,
                speed: 0.005 + rng() * 0.02,
                width: 1 + rng() * 2,
                hue: (this.baseHue + rng() * 60) % 360,
                alpha: 0.1 + rng() * 0.3,
                offset: rng() * 100,
            });
        }
    }

    update(system) {
        this.tick++;
        const mx = mouse.x;
        const my = mouse.y;

        // Update rings with time-dilation based on mouse distance
        for (const ring of this.rings) {
            const dx = this.centerX - mx;
            const dy = this.centerY - my;
            const mouseDist = Math.sqrt(dx * dx + dy * dy);
            const ringDist = Math.abs(ring.baseRadius - mouseDist);

            // Relativity: rings near cursor slow down, distant ones speed up
            const proximityFactor = Math.max(0.05, 1 - Math.exp(-ringDist * 0.005));
            const effectiveSpeed = ring.rotSpeed * proximityFactor * ring.timeScale;

            ring.rotation += effectiveSpeed;
            ring.radius = ring.baseRadius + Math.sin(this.tick * this.wobbleFreq + ring.phaseOffset) * this.wobbleAmount * ring.baseRadius * 0.05;

            // Distortion based on mouse
            if (this.distortionType === 0) {
                // Gravitational lens: rings bend toward mouse
                const pull = 30 / (ringDist + 50);
                ring._drawOffsetX = (mx - this.centerX) * pull * 0.1;
                ring._drawOffsetY = (my - this.centerY) * pull * 0.1;
            } else if (this.distortionType === 1) {
                // Ripple: rings oscillate radially from mouse
                const ripple = Math.sin(ringDist * 0.02 - this.tick * 0.05) * 10;
                ring._drawOffsetX = (mx - this.centerX) / (mouseDist + 1) * ripple;
                ring._drawOffsetY = (my - this.centerY) / (mouseDist + 1) * ripple;
            } else if (this.distortionType === 2) {
                // Fold: rings collapse toward mouse
                const fold = Math.max(0, 1 - ringDist / 300) * 20;
                ring._drawOffsetX = (mx - this.centerX) / (mouseDist + 1) * fold;
                ring._drawOffsetY = (my - this.centerY) / (mouseDist + 1) * fold;
            } else {
                // Shear: rings slide perpendicular to mouse direction
                const shear = Math.sin(ring.baseRadius * 0.01 + this.tick * 0.01) * 15;
                ring._drawOffsetX = (my - this.centerY) / (mouseDist + 1) * shear;
                ring._drawOffsetY = -(mx - this.centerX) / (mouseDist + 1) * shear;
            }
        }

        // Temporal echoes: ghostly copies of ring positions
        if (this.tick % 8 === 0 && this.echoes.length < 30) {
            const echoRing = this.rings[Math.floor(Math.random() * this.rings.length)];
            this.echoes.push({
                x: this.centerX + (echoRing._drawOffsetX || 0),
                y: this.centerY + (echoRing._drawOffsetY || 0),
                radius: echoRing.radius,
                rotation: echoRing.rotation,
                hue: echoRing.hue,
                alpha: 0.3,
                life: 40,
                eccentricity: echoRing.eccentricity,
            });
        }

        for (let i = this.echoes.length - 1; i >= 0; i--) {
            this.echoes[i].life--;
            this.echoes[i].alpha *= 0.95;
            this.echoes[i].radius *= this.echoMode === 1 ? 0.98 : 1.01;
            if (this.echoes[i].life <= 0) {
                this.echoes.splice(i, 1);
            }
        }

        // Update fracture shards
        for (let i = this.shards.length - 1; i >= 0; i--) {
            const s = this.shards[i];
            s.x += s.vx;
            s.y += s.vy;
            s.rotation += s.rotSpeed;
            s.life--;
            s.vx *= 0.97;
            s.vy *= 0.97;
            if (s.life <= 0) {
                this.shardPool.push(s);
                this.shards[i] = this.shards[this.shards.length - 1];
                this.shards.pop();
            }
        }

        // Pulse wave
        if (this.pulseWaveActive) {
            this.pulseWaveRadius += 12;
            if (this.pulseWaveRadius > Math.max(system.width, system.height)) {
                this.pulseWaveActive = false;
            }
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const w = system.width;
        const h = system.height;
        const cx = this.centerX;
        const cy = this.centerY;

        // Background temporal gradient pulse
        if (this.backgroundPulse) {
            const pulseAlpha = 0.03 + Math.sin(this.tick * 0.008) * 0.02;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
            grad.addColorStop(0, `hsla(${(this.baseHue + this.tick * 0.2) % 360}, 60%, 20%, ${pulseAlpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // Draw chrono streaks
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const streak of this.chronoStreaks) {
            const a = streak.angle + this.tick * streak.speed;
            const innerR = streak.offset + Math.sin(this.tick * 0.01 + streak.angle) * 20;
            const outerR = innerR + streak.length;
            const x1 = cx + Math.cos(a) * innerR;
            const y1 = cy + Math.sin(a) * innerR;
            const x2 = cx + Math.cos(a) * outerR;
            const y2 = cy + Math.sin(a) * outerR;

            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.3, `hsla(${streak.hue}, 70%, 60%, ${streak.alpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.lineWidth = streak.width;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();

        // Draw temporal echoes (ghost rings)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const echo of this.echoes) {
            ctx.strokeStyle = `hsla(${echo.hue}, 50%, 50%, ${echo.alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.save();
            ctx.translate(echo.x, echo.y);
            ctx.rotate(echo.rotation);
            ctx.scale(1, echo.eccentricity);
            ctx.arc(0, 0, echo.radius, 0, Math.PI * 2);
            ctx.restore();
            ctx.stroke();
        }
        ctx.restore();

        // Draw main time rings
        for (const ring of this.rings) {
            const ox = ring._drawOffsetX || 0;
            const oy = ring._drawOffsetY || 0;

            ctx.save();
            ctx.translate(cx + ox, cy + oy);
            ctx.rotate(ring.rotation);
            ctx.scale(1, ring.eccentricity);

            // Glow layer
            if (ring.glowSize > 0) {
                ctx.strokeStyle = `hsla(${ring.hue}, ${ring.saturation}%, ${ring.lightness}%, ${ring.alpha * 0.15})`;
                ctx.lineWidth = ring.thickness + ring.glowSize;
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Main ring
            const hueShift = this.chromaticSplit ? Math.sin(this.tick * 0.01 + ring.phaseOffset) * 15 : 0;
            ctx.strokeStyle = `hsla(${(ring.hue + hueShift) % 360}, ${ring.saturation}%, ${ring.lightness}%, ${ring.alpha})`;
            ctx.lineWidth = ring.thickness;

            if (ring.dashPattern) {
                ctx.setLineDash(ring.dashPattern);
            }

            if (ring.segments > 0) {
                // Dotted style: draw arcs
                const segAngle = (Math.PI * 2) / ring.segments;
                ctx.beginPath();
                for (let s = 0; s < ring.segments; s++) {
                    const startAngle = s * segAngle;
                    ctx.moveTo(
                        Math.cos(startAngle) * ring.radius,
                        Math.sin(startAngle) * ring.radius
                    );
                    ctx.arc(0, 0, ring.radius, startAngle, startAngle + segAngle * 0.6);
                }
                ctx.stroke();
            } else if (ring.waveAmplitude > 0) {
                // Wavy style
                ctx.beginPath();
                const steps = 120;
                for (let s = 0; s <= steps; s++) {
                    const angle = (s / steps) * Math.PI * 2;
                    const wave = Math.sin(angle * ring.waveFrequency + this.tick * 0.03) * ring.waveAmplitude;
                    const r = ring.radius + wave;
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (this.ringStyle === 4) {
                // Double ring
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius - 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius + 2, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.setLineDash([]);
            ctx.restore();

            // Chromatic split: draw offset colored copies
            if (this.chromaticSplit) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = ring.alpha * 0.15;
                ctx.translate(cx + ox + 2, cy + oy);
                ctx.rotate(ring.rotation);
                ctx.scale(1, ring.eccentricity);
                ctx.strokeStyle = `hsla(${(ring.hue + 120) % 360}, ${ring.saturation}%, ${ring.lightness}%, 1)`;
                ctx.lineWidth = ring.thickness * 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Draw fracture shards
        if (this.shards.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const s of this.shards) {
                const alpha = s.life / s.maxLife;
                ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${alpha * 0.7})`;
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.rotation);
                ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 0.3);
                ctx.restore();
            }
            ctx.restore();
        }

        // Pulse wave from click
        if (this.pulseWaveActive) {
            const alpha = Math.max(0, 1 - this.pulseWaveRadius / Math.max(w, h));
            ctx.strokeStyle = `hsla(${this.baseHue}, 80%, 70%, ${alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.pulseWaveX, this.pulseWaveY, this.pulseWaveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Center temporal core
        const coreSize = 3 + Math.sin(this.tick * 0.03) * 2;
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 8);
        coreGrad.addColorStop(0, `hsla(${this.baseHue}, 90%, 80%, 0.6)`);
        coreGrad.addColorStop(0.5, `hsla(${this.baseHue}, 70%, 50%, 0.1)`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreSize * 8, 0, Math.PI * 2);
        ctx.fill();
    }
}
