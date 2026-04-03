/**
 * @file chaos_pendulum_effects.js
 * @description Double/triple pendulum simulation that traces beautiful chaotic patterns.
 * Each seed produces wildly different pendulum configurations (lengths, masses, damping,
 * gravity direction) leading to unique visual signatures. Mouse interaction tilts gravity.
 * Click injects energy into the system, causing dramatic trajectory changes.
 *
 * Modes:
 * 0 - Classical Chaos: Single double-pendulum with rainbow trail on dark background
 * 1 - Pendulum Garden: 4-8 pendulums with slightly different initial conditions, diverging
 * 2 - Lissajous Hybrid: Pendulum endpoints connected by parametric curves
 * 3 - Gravity Paint: Pendulum trail rendered as thick brush strokes with pressure variation
 * 4 - Fractal Fern: Triple pendulum creating fern-like branching patterns
 * 5 - Phase Portrait: Draws the phase space (angle vs angular velocity) as glowing orbits
 */

const TAU = Math.PI * 2;

// Reusable endpoint object to avoid allocation in draw loop
const _ep = { x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0 };

export class ChaosPendulum {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this._rng = Math.random;

        // Pendulum state arrays (support up to 8 pendulums)
        this.pendulums = [];
        this.maxPendulums = 8;

        // Trail canvas for persistent traces
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailW = 0;
        this._trailH = 0;
        this._trailFade = 0.003;

        // Mouse gravity tilt
        this._mouseX = 0;
        this._mouseY = 0;
        this._gravityAngle = Math.PI / 2; // default: straight down
        this._gravityStrength = 9.81;
        this._targetGravAngle = Math.PI / 2;

        // Phase portrait accumulator
        this._phaseCanvas = null;
        this._phaseCtx = null;

        // Mode-specific
        this._brushPressure = 0;
        this._lissajousPhase = 0;

        // Click energy injection
        this._clickEnergy = 0;
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this._clickEnergy = 0;

        // Reset trail canvas
        this._trailCanvas = null;
        this._phaseCanvas = null;

        // Generate pendulum configurations based on seed
        this.pendulums = [];
        const count = this.mode === 1 ? (3 + Math.floor(rng() * 6)) : // Garden: 3-8
                      this.mode === 4 ? 2 : // Fractal fern: 2 triple pendulums
                      this.mode === 5 ? 3 : // Phase portrait: 3
                      1; // Others: single

        for (let i = 0; i < count; i++) {
            const isTriple = this.mode === 4;
            const p = {
                // Arm 1
                a1: rng() * TAU,
                a1v: (rng() - 0.5) * 0.02,
                l1: 60 + rng() * 80,
                m1: 5 + rng() * 15,
                // Arm 2
                a2: rng() * TAU,
                a2v: (rng() - 0.5) * 0.02,
                l2: 40 + rng() * 70,
                m2: 3 + rng() * 12,
                // Arm 3 (triple pendulum)
                a3: isTriple ? rng() * TAU : 0,
                a3v: isTriple ? (rng() - 0.5) * 0.01 : 0,
                l3: isTriple ? 30 + rng() * 50 : 0,
                m3: isTriple ? 2 + rng() * 8 : 0,
                // Visual
                hueOffset: rng() * 360,
                trailHue: (this.hue + i * 47) % 360,
                damping: 0.9997 + rng() * 0.0003, // Very slight damping
                // Pivot position (normalized 0-1)
                pivotX: this.mode === 1 ? (0.15 + rng() * 0.7) : 0.5,
                pivotY: this.mode === 1 ? (0.2 + rng() * 0.3) : 0.3,
                isTriple,
            };

            // Garden mode: tiny perturbations from first pendulum
            if (this.mode === 1 && i > 0 && this.pendulums.length > 0) {
                const base = this.pendulums[0];
                p.a1 = base.a1 + (rng() - 0.5) * 0.001;
                p.a2 = base.a2 + (rng() - 0.5) * 0.001;
                p.l1 = base.l1;
                p.l2 = base.l2;
                p.m1 = base.m1;
                p.m2 = base.m2;
                p.pivotX = base.pivotX;
                p.pivotY = base.pivotY;
                p.damping = base.damping;
            }

            this.pendulums.push(p);
        }

        // Mode-specific tuning
        switch (this.mode) {
            case 0: this._trailFade = 0.002; break;
            case 1: this._trailFade = 0.004; break;
            case 2: this._trailFade = 0.003; this._lissajousPhase = rng() * TAU; break;
            case 3: this._trailFade = 0.001; break; // Slow fade for paint
            case 4: this._trailFade = 0.002; break;
            case 5: this._trailFade = 0.001; break;
        }
    }

    _ensureTrailCanvas(w, h) {
        if (!this._trailCanvas || this._trailW !== w || this._trailH !== h) {
            this._trailCanvas = document.createElement('canvas');
            this._trailCanvas.width = w;
            this._trailCanvas.height = h;
            this._trailCtx = this._trailCanvas.getContext('2d');
            this._trailW = w;
            this._trailH = h;
        }
    }

    _ensurePhaseCanvas(w, h) {
        if (!this._phaseCanvas || this._phaseCanvas.width !== w) {
            this._phaseCanvas = document.createElement('canvas');
            this._phaseCanvas.width = w;
            this._phaseCanvas.height = h;
            this._phaseCtx = this._phaseCanvas.getContext('2d');
        }
    }

    // Double pendulum physics via semi-implicit Euler integration
    _stepDoublePendulum(p, dt, g, gAngle) {
        const { a1, a2, a1v, a2v, l1, l2, m1, m2 } = p;

        // Standard double pendulum equations of motion
        const delta = a1 - a2;
        const sinD = Math.sin(delta);
        const cosD = Math.cos(delta);
        const M = m1 + m2;
        const cos2D = Math.cos(2 * delta);

        const denom = 2 * M - m2 * (1 + cos2D);
        if (Math.abs(denom) < 1e-10) return;

        const a1a = (-g * M * Math.sin(a1 - gAngle) -
                     m2 * g * Math.sin(a1 - 2 * a2 + gAngle) -
                     2 * sinD * m2 * (a2v * a2v * l2 + a1v * a1v * l1 * cosD)) /
                    (l1 * denom);

        const a2a = (2 * sinD * (a1v * a1v * l1 * M +
                     g * M * Math.cos(a1 - gAngle) +
                     a2v * a2v * l2 * m2 * cosD)) /
                    (l2 * denom);

        p.a1v += a1a * dt;
        p.a2v += a2a * dt;
        p.a1v *= p.damping;
        p.a2v *= p.damping;
        p.a1 += p.a1v * dt;
        p.a2 += p.a2v * dt;
    }

    _getEndpoints(p, cx, cy, out) {
        out.x1 = cx + p.l1 * Math.sin(p.a1);
        out.y1 = cy + p.l1 * Math.cos(p.a1);
        out.x2 = out.x1 + p.l2 * Math.sin(p.a2);
        out.y2 = out.y1 + p.l2 * Math.cos(p.a2);
        if (p.isTriple) {
            out.x3 = out.x2 + p.l3 * Math.sin(p.a3);
            out.y3 = out.y2 + p.l3 * Math.cos(p.a3);
        } else {
            out.x3 = out.x2;
            out.y3 = out.y2;
        }
    }

    update(system) {
        this.tick++;
        const w = system.width;
        const h = system.height;
        const mx = system.mouse ? system.mouse.x : w / 2;
        const my = system.mouse ? system.mouse.y : h / 2;

        this._mouseX = mx;
        this._mouseY = my;

        // Gravity tilts toward mouse (subtle)
        const gcx = w / 2;
        const gcy = h / 2;
        const dx = mx - gcx;
        const dy = my - gcy;
        this._targetGravAngle = Math.PI / 2 + Math.atan2(dx, dy) * 0.3;
        this._gravityAngle += (this._targetGravAngle - this._gravityAngle) * 0.02;

        // Pre-compute gravity vector for all sub-steps (doesn't change within frame)
        const gx = Math.sin(this._gravityAngle) * this._gravityStrength;
        const gy = Math.cos(this._gravityAngle) * this._gravityStrength;
        const g = Math.sqrt(gx * gx + gy * gy);
        const gAngle = Math.atan2(gy, gx) - Math.PI / 2;

        // Click energy injection: adds impulse to all pendulums
        if (this._clickEnergy > 0) {
            for (const p of this.pendulums) {
                p.a1v += (Math.random() - 0.5) * this._clickEnergy * 0.5;
                p.a2v += (Math.random() - 0.5) * this._clickEnergy * 0.5;
                if (p.isTriple) p.a3v += (Math.random() - 0.5) * this._clickEnergy * 0.3;
            }
            this._clickEnergy *= 0.7; // Decay
            if (this._clickEnergy < 0.01) this._clickEnergy = 0;
        }

        // Physics sub-steps for stability
        const subSteps = 4;
        const dt = 1 / subSteps;
        for (let s = 0; s < subSteps; s++) {
            for (const p of this.pendulums) {
                this._stepDoublePendulum(p, dt, g, gAngle);
                // Triple pendulum: treat arm3 as driven by arm2's endpoint
                if (p.isTriple) {
                    const a3a = (-this._gravityStrength / p.l3) * Math.sin(p.a3 - gAngle);
                    p.a3v += a3a * dt * 0.5;
                    p.a3v *= p.damping;
                    p.a3 += p.a3v * dt;
                }
            }
        }

        // Brush pressure for paint mode
        if (this.mode === 3 && this.pendulums.length > 0) {
            const speed = Math.abs(this.pendulums[0].a1v) + Math.abs(this.pendulums[0].a2v);
            this._brushPressure = Math.min(1, speed * 2);
        }
    }

    draw(ctx, system) {
        const w = system.width;
        const h = system.height;

        // Handle click events from system
        if (system._clickRegistered !== undefined && system._clickRegistered) {
            this._clickEnergy = 1.5;
        }

        this._ensureTrailCanvas(w, h);

        const tc = this._trailCtx;

        // Fade trail canvas (once per frame, not per pendulum)
        tc.globalCompositeOperation = 'source-over';
        tc.fillStyle = `rgba(0, 0, 0, ${this._trailFade})`;
        tc.fillRect(0, 0, w, h);

        // Phase portrait: fade once per frame, not per pendulum
        if (this.mode === 5) {
            this._ensurePhaseCanvas(w, h);
            const pc = this._phaseCtx;
            pc.globalCompositeOperation = 'source-over';
            pc.fillStyle = `rgba(0, 0, 0, ${this._trailFade * 0.5})`;
            pc.fillRect(0, 0, w, h);
            pc.globalCompositeOperation = 'lighter';
        }

        // Draw trails for each pendulum
        for (let i = 0; i < this.pendulums.length; i++) {
            const p = this.pendulums[i];
            const cx = p.pivotX * w;
            const cy = p.pivotY * h;
            this._getEndpoints(p, cx, cy, _ep);
            const tipX = p.isTriple ? _ep.x3 : _ep.x2;
            const tipY = p.isTriple ? _ep.y3 : _ep.y2;

            const trailHue = (p.trailHue + this.tick * 0.3) % 360;

            switch (this.mode) {
                case 0: // Classical rainbow trail
                    tc.globalCompositeOperation = 'lighter';
                    tc.beginPath();
                    tc.arc(tipX, tipY, 2, 0, TAU);
                    tc.fillStyle = `hsla(${trailHue}, 90%, 60%, 0.8)`;
                    tc.fill();
                    // Glow
                    tc.beginPath();
                    tc.arc(tipX, tipY, 6, 0, TAU);
                    tc.fillStyle = `hsla(${trailHue}, 80%, 50%, 0.15)`;
                    tc.fill();
                    break;

                case 1: // Garden - thin colored lines showing divergence
                    tc.globalCompositeOperation = 'lighter';
                    tc.beginPath();
                    tc.arc(tipX, tipY, 1.5, 0, TAU);
                    tc.fillStyle = `hsla(${(p.hueOffset + this.tick * 0.5) % 360}, 85%, 55%, 0.7)`;
                    tc.fill();
                    break;

                case 2: { // Lissajous hybrid - connect endpoints with parametric curves
                    tc.globalCompositeOperation = 'lighter';
                    const lp = this._lissajousPhase + this.tick * 0.01;
                    const lx = tipX + Math.sin(lp * 3.17) * 30;
                    const ly = tipY + Math.cos(lp * 2.83) * 30;
                    tc.beginPath();
                    tc.moveTo(tipX, tipY);
                    tc.quadraticCurveTo(lx, ly, _ep.x1, _ep.y1);
                    tc.strokeStyle = `hsla(${trailHue}, 70%, 60%, 0.4)`;
                    tc.lineWidth = 1;
                    tc.stroke();
                    // Mid-arm connecting line for more visual interest
                    tc.beginPath();
                    tc.moveTo(_ep.x1, _ep.y1);
                    tc.lineTo(_ep.x2, _ep.y2);
                    tc.strokeStyle = `hsla(${(trailHue + 60) % 360}, 60%, 50%, 0.15)`;
                    tc.stroke();
                    tc.beginPath();
                    tc.arc(tipX, tipY, 3, 0, TAU);
                    tc.fillStyle = `hsla(${trailHue}, 90%, 70%, 0.6)`;
                    tc.fill();
                    break;
                }

                case 3: { // Gravity paint - thick brush strokes
                    const pressure = this._brushPressure;
                    const brushSize = 3 + pressure * 15;
                    tc.globalCompositeOperation = 'source-over';
                    tc.beginPath();
                    tc.arc(tipX, tipY, brushSize, 0, TAU);
                    const sat = 40 + pressure * 50;
                    const light = 30 + pressure * 30;
                    tc.fillStyle = `hsla(${trailHue}, ${sat | 0}%, ${light | 0}%, ${0.3 + pressure * 0.4})`;
                    tc.fill();
                    // Secondary color splash at midpoint
                    tc.beginPath();
                    tc.arc(_ep.x1, _ep.y1, brushSize * 0.3, 0, TAU);
                    tc.fillStyle = `hsla(${(trailHue + 40) % 360}, ${(sat * 0.7) | 0}%, ${(light * 0.8) | 0}%, ${0.1 + pressure * 0.15})`;
                    tc.fill();
                    break;
                }

                case 4: // Fractal fern - thin delicate trails
                    tc.globalCompositeOperation = 'lighter';
                    tc.beginPath();
                    tc.arc(tipX, tipY, 1, 0, TAU);
                    tc.fillStyle = `hsla(${(120 + p.hueOffset * 0.3) | 0}, 60%, 50%, 0.6)`;
                    tc.fill();
                    // Also trace mid-joint for branching effect
                    tc.beginPath();
                    tc.arc(_ep.x2, _ep.y2, 0.5, 0, TAU);
                    tc.fillStyle = `hsla(${(120 + p.hueOffset * 0.3) | 0}, 40%, 40%, 0.3)`;
                    tc.fill();
                    // And first joint for trunk
                    tc.beginPath();
                    tc.arc(_ep.x1, _ep.y1, 0.3, 0, TAU);
                    tc.fillStyle = `hsla(${(90 + p.hueOffset * 0.2) | 0}, 30%, 35%, 0.15)`;
                    tc.fill();
                    break;

                case 5: { // Phase portrait
                    const pc = this._phaseCtx;
                    // Map angle and velocity to screen coordinates
                    const px = ((p.a1 % TAU + TAU) % TAU) / TAU * w;
                    const py = h / 2 + p.a1v * h * 0.3;
                    pc.beginPath();
                    pc.arc(px, py, 2, 0, TAU);
                    pc.fillStyle = `hsla(${((p.hueOffset + this.tick * 0.2) % 360) | 0}, 80%, 60%, 0.5)`;
                    pc.fill();
                    // Second phase dimension (a2 vs a2v) as smaller dots
                    const px2 = ((p.a2 % TAU + TAU) % TAU) / TAU * w;
                    const py2 = h / 2 + p.a2v * h * 0.3;
                    pc.beginPath();
                    pc.arc(px2, py2, 1.2, 0, TAU);
                    pc.fillStyle = `hsla(${((p.hueOffset + 120 + this.tick * 0.15) % 360) | 0}, 70%, 50%, 0.3)`;
                    pc.fill();
                    break;
                }
            }
        }

        // Composite trail canvas onto main
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9;
        ctx.drawImage(this._trailCanvas, 0, 0);
        if (this.mode === 5 && this._phaseCanvas) {
            ctx.globalAlpha = 0.6;
            ctx.drawImage(this._phaseCanvas, 0, 0);
        }
        ctx.restore();

        // Draw pendulum arms (subtle, semi-transparent)
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (const p of this.pendulums) {
            const cx = p.pivotX * w;
            const cy = p.pivotY * h;
            this._getEndpoints(p, cx, cy, _ep);

            ctx.strokeStyle = `hsla(${p.trailHue}, 30%, 70%, 0.3)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(_ep.x1, _ep.y1);
            ctx.lineTo(_ep.x2, _ep.y2);
            if (p.isTriple) ctx.lineTo(_ep.x3, _ep.y3);
            ctx.stroke();

            // Joint dots
            ctx.fillStyle = `hsla(${p.trailHue}, 60%, 80%, 0.5)`;
            ctx.beginPath();
            ctx.arc(_ep.x1, _ep.y1, 3, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(_ep.x2, _ep.y2, p.isTriple ? 2 : 4, 0, TAU);
            ctx.fill();
            if (p.isTriple) {
                ctx.beginPath();
                ctx.arc(_ep.x3, _ep.y3, 4, 0, TAU);
                ctx.fill();
            }

            // Pivot anchor dot
            ctx.fillStyle = `hsla(${p.trailHue}, 20%, 60%, 0.4)`;
            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }
}
