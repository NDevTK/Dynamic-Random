/**
 * @file chromatic_wake_effects.js
 * @description Interactive effect: mouse movement creates an RGB-split
 * wake — three color channels (red, green, blue or seed-determined hues)
 * each follow the cursor with slightly different physics (mass, friction,
 * spring tension). This creates a constantly shifting chromatic aberration
 * trail that separates on fast movements and converges when still.
 *
 * Each channel's trail is drawn as a smooth curve with its own width and
 * opacity. Where channels overlap, additive blending creates white hot-spots.
 * Clicking briefly "overcharges" the wake, making it thicker and brighter
 * with a burst of trailing sparks.
 *
 * Seed controls: channel hues, friction per channel, trail length, spring
 * stiffness, wake shape (smooth/angular/dotted/ribbon), overcharge intensity,
 * and whether the wake pulses rhythmically.
 */

export class ChromaticWake {
    constructor() {
        this.channels = [];
        this.sparks = [];
        this.sparkPool = [];
        this.maxSparks = 40;
        this.wakeShape = 0;
        this.pulseEnabled = false;
        this.overchargeTimer = 0;
        this._tick = 0;
        this._initialized = false;
    }

    _prand(seed) {
        return ((seed * 2654435761) >>> 0) / 4294967296;
    }

    configure(rng, palette) {
        const baseHue = palette && palette.length > 0 ? palette[0].h : rng() * 360;

        this.channels = [];
        const hueSpread = rng() > 0.5 ? 120 : 60 + rng() * 80;

        for (let i = 0; i < 3; i++) {
            const hue = (baseHue + i * hueSpread) % 360;
            const maxLen = 25 + Math.floor(rng() * 25);
            this.channels.push({
                hue,
                saturation: 70 + rng() * 25,
                lightness: 55 + rng() * 20,
                friction: 0.82 + rng() * 0.12,
                spring: 0.05 + rng() * 0.1,
                // Initialize position to screen center to avoid jump on first frame
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: 0, vy: 0,
                trail: [],
                maxTrailLen: maxLen,
                trailWriteIdx: 0,
                lineWidth: 1.5 + rng() * 2.5,
            });
        }

        this.wakeShape = Math.floor(rng() * 4);
        this.pulseEnabled = rng() > 0.5;
        this.overchargeMultiplier = 1.5 + rng() * 2;
        // Convergence glow when channels overlap
        this.convergenceGlow = rng() > 0.4;
        // Wake opacity base
        this.wakeAlpha = 0.15 + rng() * 0.15;

        this.sparks = [];
        this.sparkPool = [];
        this._initialized = false;
    }

    update(mx, my, isClicking) {
        this._tick++;

        // Snap channels to mouse on first update to prevent fly-in from center
        if (!this._initialized) {
            this._initialized = true;
            for (const ch of this.channels) {
                ch.x = mx;
                ch.y = my;
            }
        }

        if (this.overchargeTimer > 0) this.overchargeTimer--;

        // Click triggers overcharge
        if (isClicking && this.overchargeTimer === 0) {
            this.overchargeTimer = 30;
            const count = Math.min(12, this.maxSparks - this.sparks.length);
            for (let i = 0; i < count; i++) {
                let spark = this.sparkPool.length > 0 ? this.sparkPool.pop() : {};
                const pr1 = this._prand(this._tick * 7 + i * 31);
                const pr2 = this._prand(this._tick * 13 + i * 47);
                const angle = pr1 * Math.PI * 2;
                const speed = 2 + pr2 * 6;
                spark.x = mx;
                spark.y = my;
                spark.vx = Math.cos(angle) * speed;
                spark.vy = Math.sin(angle) * speed;
                spark.life = 1.0;
                spark.decay = 0.02 + pr1 * 0.03;
                spark.channelIdx = i % 3;
                spark.size = 1 + pr2 * 2;
                this.sparks.push(spark);
            }
        }

        // Update each channel's spring physics toward mouse
        for (const ch of this.channels) {
            const dx = mx - ch.x;
            const dy = my - ch.y;
            ch.vx += dx * ch.spring;
            ch.vy += dy * ch.spring;
            ch.vx *= ch.friction;
            ch.vy *= ch.friction;
            ch.x += ch.vx;
            ch.y += ch.vy;

            // Ring buffer trail
            if (ch.trail.length < ch.maxTrailLen) {
                ch.trail.push({ x: ch.x, y: ch.y });
            } else {
                const tp = ch.trail[ch.trailWriteIdx];
                tp.x = ch.x;
                tp.y = ch.y;
                ch.trailWriteIdx = (ch.trailWriteIdx + 1) % ch.maxTrailLen;
            }
        }

        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.95;
            s.vy *= 0.95;
            s.life -= s.decay;
            if (s.life <= 0) {
                if (this.sparkPool.length < this.maxSparks) this.sparkPool.push(s);
                this.sparks[i] = this.sparks[this.sparks.length - 1];
                this.sparks.pop();
            }
        }
    }

    draw(ctx) {
        if (this.channels.length === 0) return;

        const isOvercharged = this.overchargeTimer > 0;
        const overchargeFactor = isOvercharged ? 1 + (this.overchargeTimer / 30) * (this.overchargeMultiplier - 1) : 1;
        const pulseScale = this.pulseEnabled ? 0.8 + 0.2 * Math.sin(this._tick * 0.06) : 1;

        ctx.globalCompositeOperation = 'lighter';

        // Draw each channel's wake
        for (const ch of this.channels) {
            if (ch.trail.length < 2) continue;

            const len = ch.trail.length;
            const startIdx = len === ch.maxTrailLen ? ch.trailWriteIdx : 0;
            const alpha = this.wakeAlpha * pulseScale * overchargeFactor;
            const width = ch.lineWidth * overchargeFactor;

            if (this.wakeShape === 0) {
                // Smooth curves
                ctx.beginPath();
                ctx.strokeStyle = `hsla(${ch.hue}, ${ch.saturation}%, ${ch.lightness}%, ${alpha})`;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const first = ch.trail[startIdx % len];
                ctx.moveTo(first.x, first.y);
                for (let j = 1; j < len - 1; j++) {
                    const curr = ch.trail[(startIdx + j) % len];
                    const next = ch.trail[(startIdx + j + 1) % len];
                    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) * 0.5, (curr.y + next.y) * 0.5);
                }
                const last = ch.trail[(startIdx + len - 1) % len];
                ctx.lineTo(last.x, last.y);
                ctx.stroke();
            } else if (this.wakeShape === 1) {
                // Angular
                ctx.beginPath();
                ctx.strokeStyle = `hsla(${ch.hue}, ${ch.saturation}%, ${ch.lightness}%, ${alpha})`;
                ctx.lineWidth = width;
                const first = ch.trail[startIdx % len];
                ctx.moveTo(first.x, first.y);
                for (let j = 1; j < len; j++) {
                    const p = ch.trail[(startIdx + j) % len];
                    ctx.lineTo(p.x, p.y);
                }
                ctx.stroke();
            } else if (this.wakeShape === 2) {
                // Dots — batch by size bands
                for (let j = 0; j < len; j += 2) {
                    const p = ch.trail[(startIdx + j) % len];
                    const t = j / len;
                    ctx.fillStyle = `hsla(${ch.hue}, ${ch.saturation}%, ${ch.lightness}%, ${t * alpha})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, width * 0.5 * t, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Ribbon (varying width)
                for (let j = 1; j < len; j++) {
                    const prev = ch.trail[(startIdx + j - 1) % len];
                    const curr = ch.trail[(startIdx + j) % len];
                    const t = j / len;
                    ctx.strokeStyle = `hsla(${ch.hue}, ${ch.saturation}%, ${ch.lightness}%, ${t * alpha})`;
                    ctx.lineWidth = width * t;
                    ctx.beginPath();
                    ctx.moveTo(prev.x, prev.y);
                    ctx.lineTo(curr.x, curr.y);
                    ctx.stroke();
                }
            }

            // Head glow
            ctx.fillStyle = `hsla(${ch.hue}, ${ch.saturation}%, ${ch.lightness + 10}%, ${0.15 * overchargeFactor})`;
            ctx.beginPath();
            ctx.arc(ch.x, ch.y, 8 * overchargeFactor, 0, Math.PI * 2);
            ctx.fill();
        }

        // Convergence glow where all 3 channels are close together
        if (this.convergenceGlow && this.channels.length === 3) {
            const c0 = this.channels[0], c1 = this.channels[1], c2 = this.channels[2];
            const cx = (c0.x + c1.x + c2.x) / 3;
            const cy = (c0.y + c1.y + c2.y) / 3;
            const spread = Math.abs(c0.x - c1.x) + Math.abs(c0.y - c1.y) +
                Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y);
            if (spread < 60) {
                const intensity = (1 - spread / 60) * 0.15 * overchargeFactor;
                ctx.fillStyle = `hsla(0, 0%, 100%, ${intensity})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw sparks
        if (this.sparks.length > 0) {
            for (const s of this.sparks) {
                const ch = this.channels[s.channelIdx];
                ctx.fillStyle = `hsla(${ch.hue}, ${ch.saturation}%, ${ch.lightness + 15}%, ${s.life * 0.5})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
