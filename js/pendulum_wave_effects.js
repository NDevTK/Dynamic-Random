/**
 * @file pendulum_wave_effects.js
 * @description A grid of pendulums with slightly different frequencies creating
 * mesmerizing interference patterns. Cursor proximity affects pendulum energy,
 * clicks send shockwaves that sync or desync groups.
 *
 * Modes:
 * 0 - Classic Wave: Pendulums in rows with incrementing frequency, beautiful phase patterns
 * 1 - Circular Array: Pendulums arranged in concentric rings, rotating interference
 * 2 - Lissajous Garden: Each pendulum traces a unique Lissajous figure
 * 3 - Coupled Oscillators: Neighboring pendulums connected by springs, energy transfer
 * 4 - Chaotic Pendulums: Double-pendulum behavior, sensitive to initial conditions
 * 5 - Resonance Cascade: All pendulums have similar frequencies, clicks cause resonance buildup
 */

const TAU = Math.PI * 2;

export class PendulumWave {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this._pendulums = null; // Float32Array: [angle, angularVel, freq, phase, energy, x, y, trailIdx] per pendulum
        this._stride = 8;
        this._count = 0;
        this._hue = 30;
        this._hue2 = 200;
        this._bobSize = 3;
        this._armLength = 20;
        this._damping = 0.9995;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._intensity = 1;

        // Trail canvas for persistence
        this._trailCanvas = null;
        this._trailCtx = null;
        this._trailFade = 0.02;
    }

    configure(rng, hues) {
        this.tick = 0;
        this.mode = Math.floor(rng() * 6);

        this._hue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._hue2 = hues.length > 1 ? hues[1].h : (this._hue + 150) % 360;
        this._intensity = 0.5 + rng() * 0.6;
        this._bobSize = 2 + rng() * 4;
        this._armLength = 15 + rng() * 25;
        this._damping = 0.999 + rng() * 0.0008;
        this._trailFade = 0.01 + rng() * 0.04;

        const W = window.innerWidth;
        const H = window.innerHeight;

        let pendulumData = [];

        if (this.mode === 0 || this.mode === 3 || this.mode === 5) {
            // Grid arrangement
            const cols = Math.floor(W / (this._armLength * 2.5));
            const rows = Math.floor(H / (this._armLength * 2.5));
            const spacingX = W / (cols + 1);
            const spacingY = H / (rows + 1);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const baseFreq = this.mode === 5
                        ? 0.03 + rng() * 0.002  // Nearly identical frequencies for resonance
                        : 0.02 + (c / cols) * 0.04 + (r / rows) * 0.01;
                    pendulumData.push({
                        x: spacingX * (c + 1),
                        y: spacingY * (r + 1),
                        freq: baseFreq,
                        phase: rng() * TAU,
                        energy: 0.5 + rng() * 0.5,
                    });
                }
            }
        } else if (this.mode === 1) {
            // Concentric rings
            const cx = W / 2;
            const cy = H / 2;
            const rings = 4 + Math.floor(rng() * 4);
            const maxRadius = Math.min(W, H) * 0.4;
            for (let ring = 0; ring < rings; ring++) {
                const radius = (ring + 1) / rings * maxRadius;
                const count = Math.floor(radius * 0.15);
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * TAU;
                    pendulumData.push({
                        x: cx + Math.cos(angle) * radius,
                        y: cy + Math.sin(angle) * radius,
                        freq: 0.02 + ring * 0.008 + rng() * 0.005,
                        phase: angle + rng() * 0.5,
                        energy: 0.6 + rng() * 0.4,
                    });
                }
            }
        } else if (this.mode === 2) {
            // Scattered Lissajous points
            const count = 60 + Math.floor(rng() * 60);
            for (let i = 0; i < count; i++) {
                pendulumData.push({
                    x: 50 + rng() * (W - 100),
                    y: 50 + rng() * (H - 100),
                    freq: 0.015 + rng() * 0.04,
                    phase: rng() * TAU,
                    energy: 0.4 + rng() * 0.6,
                });
            }
        } else if (this.mode === 4) {
            // Chaotic: fewer, larger pendulums
            const count = 30 + Math.floor(rng() * 30);
            for (let i = 0; i < count; i++) {
                pendulumData.push({
                    x: 80 + rng() * (W - 160),
                    y: 80 + rng() * (H - 160),
                    freq: 0.01 + rng() * 0.03,
                    phase: rng() * TAU,
                    energy: 0.7 + rng() * 0.3,
                });
            }
        }

        this._count = pendulumData.length;
        this._pendulums = new Float32Array(this._count * this._stride);

        for (let i = 0; i < this._count; i++) {
            const p = pendulumData[i];
            const base = i * this._stride;
            this._pendulums[base] = p.phase;          // angle
            this._pendulums[base + 1] = 0;            // angular velocity
            this._pendulums[base + 2] = p.freq;       // frequency
            this._pendulums[base + 3] = p.phase;      // phase offset
            this._pendulums[base + 4] = p.energy;     // energy (amplitude)
            this._pendulums[base + 5] = p.x;          // anchor x
            this._pendulums[base + 6] = p.y;          // anchor y
            this._pendulums[base + 7] = 0;            // reserved
        }

        // Trail canvas at half res
        const tw = Math.ceil(W / 2);
        const th = Math.ceil(H / 2);
        if (!this._trailCanvas || this._trailCanvas.width !== tw || this._trailCanvas.height !== th) {
            this._trailCanvas = document.createElement('canvas');
            this._trailCanvas.width = tw;
            this._trailCanvas.height = th;
            this._trailCtx = this._trailCanvas.getContext('2d', { alpha: true });
        }
        this._trailCtx.clearRect(0, 0, tw, th);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        const clickJustHappened = isClicking && !this._wasClicking;
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        if (!this._pendulums) return;

        const pends = this._pendulums;
        const stride = this._stride;
        const count = this._count;
        const damping = this._damping;
        const armLen = this._armLength;

        for (let i = 0; i < count; i++) {
            const base = i * stride;
            const ax = pends[base + 5];
            const ay = pends[base + 6];
            const freq = pends[base + 2];
            let energy = pends[base + 4];
            let angle = pends[base];
            let angVel = pends[base + 1];

            // Cursor proximity boosts energy
            const dx = mx - ax;
            const dy = my - ay;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000) { // 200px radius
                const dist = Math.sqrt(distSq);
                const influence = (1 - dist / 200) * 0.02;
                energy = Math.min(1.5, energy + influence);

                // Mode 3: coupling - push angle toward cursor direction
                if (this.mode === 3) {
                    const toMouse = Math.atan2(dy, dx);
                    let diff = toMouse - angle;
                    diff = ((diff + Math.PI) % TAU + TAU) % TAU - Math.PI;
                    angVel += diff * 0.002;
                }
            }

            // Click: blast of energy
            if (clickJustHappened && distSq < 90000) { // 300px
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / 300) * 1.5;
                energy = Math.min(2, energy + force);
                if (this.mode === 5) {
                    // Resonance: sync phase
                    pends[base + 3] = this.tick * freq;
                }
                angVel += force * 0.1 * (Math.random() > 0.5 ? 1 : -1);
            }

            // Physics: simple harmonic with energy as amplitude
            const targetAngle = Math.sin(this.tick * freq + pends[base + 3]) * energy;

            if (this.mode === 4) {
                // Chaotic: nonlinear restoring force
                const g = 0.001;
                angVel += -g * Math.sin(angle) + Math.sin(this.tick * freq * 0.7) * energy * 0.003;
                angVel *= 0.998;
                angle += angVel;
            } else if (this.mode === 2) {
                // Lissajous: 2D oscillation
                angle = targetAngle;
            } else {
                // Spring toward target
                const diff = targetAngle - angle;
                angVel += diff * 0.1;
                angVel *= 0.92;
                angle += angVel;
            }

            // Mode 3: coupling with neighbors
            if (this.mode === 3 && i > 0) {
                const prevBase = (i - 1) * stride;
                const prevAngle = pends[prevBase];
                const coupling = (prevAngle - angle) * 0.005;
                angVel += coupling;
            }

            energy *= damping;
            energy = Math.max(0.1, energy);

            pends[base] = angle;
            pends[base + 1] = angVel;
            pends[base + 4] = energy;
        }

        // Draw to trail canvas
        if (this._trailCtx) {
            const tc = this._trailCtx;
            const tw = this._trailCanvas.width;
            const th = this._trailCanvas.height;

            tc.globalCompositeOperation = 'destination-out';
            tc.fillStyle = `rgba(0,0,0,${this._trailFade})`;
            tc.fillRect(0, 0, tw, th);
            tc.globalCompositeOperation = 'lighter';

            for (let i = 0; i < count; i++) {
                const base = i * stride;
                const ax = pends[base + 5];
                const ay = pends[base + 6];
                const angle = pends[base];
                const energy = pends[base + 4];

                let bobX, bobY;
                if (this.mode === 2) {
                    // Lissajous: bob traces elliptical path
                    const freq2 = pends[base + 2] * 1.618; // golden ratio frequency
                    bobX = ax + Math.sin(this.tick * pends[base + 2] + pends[base + 3]) * armLen * energy;
                    bobY = ay + Math.cos(this.tick * freq2 + pends[base + 3]) * armLen * energy;
                } else {
                    bobX = ax + Math.sin(angle) * armLen;
                    bobY = ay + Math.cos(angle) * armLen * 0.3 + armLen * 0.7;
                }

                const alpha = energy * 0.15 * this._intensity;
                const hue = (this._hue + energy * 40) % 360;
                tc.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
                tc.beginPath();
                tc.arc(bobX / 2, bobY / 2, this._bobSize * energy, 0, TAU);
                tc.fill();
            }
        }
    }

    draw(ctx, system) {
        if (!this._pendulums) return;

        ctx.save();

        // Trail layer
        if (this._trailCanvas) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6 * this._intensity;
            ctx.drawImage(this._trailCanvas, 0, 0, system.width, system.height);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'lighter';
        const pends = this._pendulums;
        const stride = this._stride;
        const count = this._count;
        const armLen = this._armLength;
        const hue = this._hue;
        const hue2 = this._hue2;
        const intensity = this._intensity;

        // Draw arms and bobs
        ctx.lineWidth = 0.5;
        ctx.lineCap = 'round';

        // Batch arms
        ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${0.12 * intensity})`;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const base = i * stride;
            const ax = pends[base + 5];
            const ay = pends[base + 6];
            const angle = pends[base];
            const energy = pends[base + 4];

            let bobX, bobY;
            if (this.mode === 2) {
                const freq2 = pends[base + 2] * 1.618;
                bobX = ax + Math.sin(this.tick * pends[base + 2] + pends[base + 3]) * armLen * energy;
                bobY = ay + Math.cos(this.tick * freq2 + pends[base + 3]) * armLen * energy;
            } else {
                bobX = ax + Math.sin(angle) * armLen;
                bobY = ay + Math.cos(angle) * armLen * 0.3 + armLen * 0.7;
            }

            ctx.moveTo(ax, ay);
            ctx.lineTo(bobX, bobY);
        }
        ctx.stroke();

        // Draw bobs with glow
        for (let i = 0; i < count; i++) {
            const base = i * stride;
            const ax = pends[base + 5];
            const ay = pends[base + 6];
            const angle = pends[base];
            const energy = pends[base + 4];

            let bobX, bobY;
            if (this.mode === 2) {
                const freq2 = pends[base + 2] * 1.618;
                bobX = ax + Math.sin(this.tick * pends[base + 2] + pends[base + 3]) * armLen * energy;
                bobY = ay + Math.cos(this.tick * freq2 + pends[base + 3]) * armLen * energy;
            } else {
                bobX = ax + Math.sin(angle) * armLen;
                bobY = ay + Math.cos(angle) * armLen * 0.3 + armLen * 0.7;
            }

            const bobHue = (hue2 + energy * 60) % 360;
            const alpha = (0.2 + energy * 0.3) * intensity;
            const size = this._bobSize * (0.6 + energy * 0.4);

            // Outer glow
            if (energy > 0.5) {
                ctx.fillStyle = `hsla(${bobHue}, 60%, 55%, ${alpha * 0.15})`;
                ctx.beginPath();
                ctx.arc(bobX, bobY, size * 4, 0, TAU);
                ctx.fill();
            }

            // Core
            ctx.fillStyle = `hsla(${bobHue}, 70%, 65%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(bobX, bobY, size, 0, TAU);
            ctx.fill();

            // Hot center at high energy
            if (energy > 1) {
                ctx.fillStyle = `hsla(${bobHue}, 30%, 90%, ${(energy - 1) * 0.4 * intensity})`;
                ctx.beginPath();
                ctx.arc(bobX, bobY, size * 0.4, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
