/**
 * @file hypnotic_spirograph_effects.js
 * @description Multi-layered spirograph (epitrochoid/hypotrochoid) patterns that rotate
 * and evolve. Seed determines gear ratios, pen positions, layer count, and color schemes,
 * producing vastly different geometric art per universe.
 *
 * Modes:
 * 0 - Classic Spirograph: Clean mathematical curves with slow color cycling
 * 1 - Neon Bloom: Thick glowing lines with bloom effect, pulsing to a rhythm
 * 2 - Shattered Glass: Spirograph lines fragment into angular shards periodically
 * 3 - Organic Weave: Spirograph with noise-perturbed radii creating organic feel
 * 4 - Temporal Echo: Multiple time-shifted copies of same spirograph create depth
 * 5 - Interactive Orbit: Mouse position influences the gear ratios in real-time
 */

const TAU = Math.PI * 2;

export class HypnoticSpirograph {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this._rng = Math.random;

        // Spirograph layers
        this.layers = [];
        this.maxLayers = 5;

        // Trail canvas
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;
        this._fadeFactor = 0.003;

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;

        // Shatter fragments for mode 2
        this._fragments = [];
        this._shatterCooldown = 0;

        // Temporal echo positions for mode 4
        this._echoHistory = [];
        this._echoMaxLen = 5;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);

        this._trailCanvas = null;
        this._fragments = [];
        this._echoHistory = [];

        // Generate spirograph layers with seed-dependent parameters
        const layerCount = 2 + Math.floor(rng() * 4); // 2-5 layers
        this.layers = [];

        for (let i = 0; i < layerCount; i++) {
            // Gear ratios - small integers create closed curves, irrationals create dense fills
            const ratioOptions = [
                () => Math.floor(rng() * 8 + 2) / Math.floor(rng() * 5 + 3), // rational
                () => rng() * 3 + 0.5, // irrational-ish
                () => Math.floor(rng() * 12 + 3) / 7, // septimal
                () => (1 + Math.sqrt(5)) / 2 * (0.5 + rng()), // golden ratio variant
            ];
            const ratioFn = ratioOptions[Math.floor(rng() * ratioOptions.length)];

            this.layers.push({
                R: 80 + rng() * 120,        // Outer radius
                r: 20 + rng() * 80,         // Inner radius
                d: 10 + rng() * 60,         // Pen distance from inner center
                speed: 0.005 + rng() * 0.02, // Angular speed
                phase: rng() * TAU,          // Starting phase
                ratio: ratioFn(),            // Gear ratio
                hueShift: rng() * 120,       // Hue offset from base
                lineWidth: 0.5 + rng() * 2,
                direction: rng() > 0.5 ? 1 : -1, // CW or CCW
                // Noise perturbation (mode 3)
                noiseAmp: rng() * 20,
                noiseFreq: rng() * 0.1 + 0.01,
            });
        }

        switch (this.mode) {
            case 0: this._fadeFactor = 0.002; break;
            case 1: this._fadeFactor = 0.005; break;
            case 2: this._fadeFactor = 0.004; this._shatterCooldown = 200; break;
            case 3: this._fadeFactor = 0.002; break;
            case 4: this._fadeFactor = 0.003; break;
            case 5: this._fadeFactor = 0.004; break;
        }
    }

    _ensureTrail(w, h) {
        if (!this._trailCanvas || this._trailW !== w || this._trailH !== h) {
            this._trailCanvas = document.createElement('canvas');
            this._trailCanvas.width = w;
            this._trailCanvas.height = h;
            this._trailCtx = this._trailCanvas.getContext('2d');
            this._trailW = w;
            this._trailH = h;
        }
    }

    _getPoint(layer, t, cx, cy, mouseInfluence) {
        const { R, r, d, ratio, direction, noiseAmp, noiseFreq } = layer;
        const effR = R + (this.mode === 5 ? mouseInfluence * 30 : 0);
        const angle = t * direction;
        const rRatio = ratio;

        // Epitrochoid formula: x = (R-r)*cos(t) + d*cos((R-r)/r * t)
        let x = (effR - r) * Math.cos(angle) + d * Math.cos(((effR - r) / r) * angle * rRatio);
        let y = (effR - r) * Math.sin(angle) + d * Math.sin(((effR - r) / r) * angle * rRatio);

        // Organic noise perturbation (mode 3)
        if (this.mode === 3) {
            const n = Math.sin(t * noiseFreq * 13.7) * Math.cos(t * noiseFreq * 7.3);
            x += n * noiseAmp;
            y += n * noiseAmp * 0.7;
        }

        return { x: cx + x, y: cy + y };
    }

    update(system) {
        this.tick++;
        this._mouseX = system.mouse ? system.mouse.x : system.width / 2;
        this._mouseY = system.mouse ? system.mouse.y : system.height / 2;

        // Shatter mode cooldown
        if (this.mode === 2) {
            this._shatterCooldown--;
            if (this._shatterCooldown <= 0) {
                this._shatterCooldown = 150 + Math.floor(this._rng() * 100);
                // Create shatter fragments from current trail
                const count = 8 + Math.floor(this._rng() * 12);
                for (let i = 0; i < count; i++) {
                    this._fragments.push({
                        x: this._rng() * system.width,
                        y: this._rng() * system.height,
                        w: 20 + this._rng() * 60,
                        h: 20 + this._rng() * 60,
                        vx: (this._rng() - 0.5) * 4,
                        vy: (this._rng() - 0.5) * 4,
                        rotation: this._rng() * TAU,
                        rotSpeed: (this._rng() - 0.5) * 0.05,
                        life: 60 + Math.floor(this._rng() * 40),
                    });
                }
            }
        }

        // Update shatter fragments
        for (let i = this._fragments.length - 1; i >= 0; i--) {
            const f = this._fragments[i];
            f.x += f.vx;
            f.y += f.vy;
            f.rotation += f.rotSpeed;
            f.life--;
            if (f.life <= 0) {
                this._fragments[i] = this._fragments[this._fragments.length - 1];
                this._fragments.pop();
            }
        }
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;
        const cx = w / 2;
        const cy = h / 2;

        this._ensureTrail(w, h);
        const tc = this._trailCtx;

        // Fade
        tc.fillStyle = `rgba(0, 0, 0, ${this._fadeFactor})`;
        tc.fillRect(0, 0, w, h);

        // Mouse influence for interactive mode
        const mdx = (this._mouseX - cx) / cx;
        const mdy = (this._mouseY - cy) / cy;
        const mouseInf = Math.sqrt(mdx * mdx + mdy * mdy);

        // Draw spirograph curves
        for (let li = 0; li < this.layers.length; li++) {
            const layer = this.layers[li];
            const t = this.tick * layer.speed + layer.phase;
            const prevT = t - layer.speed;

            const p1 = this._getPoint(layer, prevT, cx, cy, mouseInf);
            const p2 = this._getPoint(layer, t, cx, cy, mouseInf);

            const hue = (this.hue + layer.hueShift + this.tick * 0.2) % 360;

            tc.globalCompositeOperation = 'lighter';

            if (this.mode === 1) {
                // Neon bloom: thick glowing line
                const pulse = Math.sin(this.tick * 0.03 + li) * 0.3 + 0.7;
                tc.lineWidth = layer.lineWidth * 3 * pulse;
                tc.strokeStyle = `hsla(${hue}, 100%, 60%, 0.15)`;
                tc.beginPath();
                tc.moveTo(p1.x, p1.y);
                tc.lineTo(p2.x, p2.y);
                tc.stroke();
                // Core
                tc.lineWidth = layer.lineWidth;
                tc.strokeStyle = `hsla(${hue}, 90%, 80%, 0.8)`;
                tc.beginPath();
                tc.moveTo(p1.x, p1.y);
                tc.lineTo(p2.x, p2.y);
                tc.stroke();
            } else if (this.mode === 4) {
                // Temporal echo: draw at multiple time offsets
                for (let echo = 0; echo < 4; echo++) {
                    const echoT = t - echo * 0.5;
                    const ep = this._getPoint(layer, echoT, cx, cy, mouseInf);
                    const ep2 = this._getPoint(layer, echoT - layer.speed, cx, cy, mouseInf);
                    const alpha = 0.6 - echo * 0.12;
                    tc.lineWidth = layer.lineWidth * (1 - echo * 0.15);
                    tc.strokeStyle = `hsla(${(hue + echo * 15) % 360}, 80%, 65%, ${alpha})`;
                    tc.beginPath();
                    tc.moveTo(ep2.x, ep2.y);
                    tc.lineTo(ep.x, ep.y);
                    tc.stroke();
                }
            } else {
                // Standard / organic / interactive
                tc.lineWidth = layer.lineWidth;
                tc.strokeStyle = `hsla(${hue}, 85%, 65%, 0.7)`;
                tc.beginPath();
                tc.moveTo(p1.x, p1.y);
                tc.lineTo(p2.x, p2.y);
                tc.stroke();

                // Dot at pen position
                tc.beginPath();
                tc.arc(p2.x, p2.y, layer.lineWidth * 0.8, 0, TAU);
                tc.fillStyle = `hsla(${hue}, 90%, 80%, 0.4)`;
                tc.fill();
            }
        }

        // Composite trail
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85;
        ctx.drawImage(this._trailCanvas, 0, 0);
        ctx.restore();

        // Draw shatter fragments (mode 2)
        if (this._fragments.length > 0 && this._trailCanvas) {
            ctx.save();
            for (const f of this._fragments) {
                const alpha = f.life / 100;
                ctx.globalAlpha = alpha * 0.6;
                ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
                ctx.rotate(f.rotation);
                ctx.drawImage(this._trailCanvas,
                    f.x, f.y, f.w, f.h,
                    -f.w / 2, -f.h / 2, f.w, f.h);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }
            ctx.restore();
        }
    }
}
