/**
 * @file gravity_pool_architecture.js
 * @description Water-like ripple interference patterns with caustic light effects.
 * Mouse creates ripple sources, gravity well creates whirlpool. Seeds change
 * water color, wave behavior, caustic patterns, and floating particle types.
 */

import { Architecture } from './background_architectures.js';
import { mouse } from './state.js';
import { hypotrochoid, normalizePoints } from './math_patterns.js';

export class GravityPoolArchitecture extends Architecture {
    constructor() {
        super();
        this.ripples = [];
        this.ripplePool = [];
        this.causticGrid = null;
        this.causticW = 0;
        this.causticH = 0;
        this.floaters = [];
        this.whirlpool = null;
        this.waterHue = 200;
        this.depthMode = 0;
        this.waveAmplitude = 1;
        this.lastMouse = { x: 0, y: 0 };
        this.autoRippleTimer = 0;
    }

    init(system) {
        const rng = system.rng;

        // Water color palette driven by seed
        this.depthMode = Math.floor(rng() * 5);
        switch (this.depthMode) {
            case 0: this.waterHue = 200 + rng() * 30; break;  // deep ocean blue
            case 1: this.waterHue = 160 + rng() * 30; break;  // tropical teal
            case 2: this.waterHue = 270 + rng() * 30; break;  // mystic purple pool
            case 3: this.waterHue = 120 + rng() * 30; break;  // acidic green
            case 4: this.waterHue = 20 + rng() * 20; break;   // molten amber
        }

        this.waveAmplitude = 0.5 + rng() * 1.5;

        // Caustic light grid (low-res for performance)
        const cellSize = 12;
        this.causticW = Math.ceil(system.width / cellSize) + 1;
        this.causticH = Math.ceil(system.height / cellSize) + 1;
        this.cellSize = cellSize;
        this.causticGrid = new Float32Array(this.causticW * this.causticH);

        // Floating objects
        this.floaters = [];
        const floaterCount = 15 + Math.floor(rng() * 20);
        for (let i = 0; i < floaterCount; i++) {
            this.floaters.push({
                x: rng() * system.width,
                y: rng() * system.height,
                vx: (rng() - 0.5) * 0.3,
                vy: (rng() - 0.5) * 0.3,
                size: 2 + rng() * 4,
                phase: rng() * Math.PI * 2,
                bobSpeed: 0.02 + rng() * 0.03,
                hue: this.waterHue + (rng() - 0.5) * 60,
                glow: rng() > 0.6
            });
        }

        this.ripples = [];
        this.ripplePool = [];
        this.whirlpool = null;
        this.lastMouse = { x: mouse.x, y: mouse.y };

        // Spirograph-based caustic pattern (50% chance per seed)
        this.useMathCaustics = false;
        this.causticCurve = null;
        this.causticCurveOffset = 0;
        if (rng() > 0.5) {
            const result = hypotrochoid(500, rng);
            const normalized = normalizePoints(result.points);
            this.causticCurve = normalized;
            this.useMathCaustics = true;
        }
    }

    _spawnRipple(x, y, strength) {
        let r = this.ripplePool.length > 0 ? this.ripplePool.pop() : {};
        r.x = x;
        r.y = y;
        r.radius = 0;
        r.speed = 2 + strength * 2;
        r.amplitude = strength;
        r.wavelength = 20 + strength * 15;
        r.life = 1.0;
        r.decay = 0.005 + strength * 0.003;
        this.ripples.push(r);
    }

    update(system) {
        const mx = mouse.x;
        const my = mouse.y;
        const tick = system.tick;

        // Mouse movement spawns ripples
        const mdx = mx - this.lastMouse.x;
        const mdy = my - this.lastMouse.y;
        const mSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
        this.lastMouse.x = mx;
        this.lastMouse.y = my;

        if (mSpeed > 5 && tick % 3 === 0) {
            this._spawnRipple(mx, my, Math.min(2, mSpeed * 0.05));
        }

        // Auto-ripples from seed-driven sources
        this.autoRippleTimer++;
        if (this.autoRippleTimer > 60 && system.rng() < 0.03) {
            this.autoRippleTimer = 0;
            this._spawnRipple(
                system.rng() * system.width,
                system.rng() * system.height,
                0.3 + system.rng() * 0.5
            );
        }

        // Gravity well creates whirlpool
        if (system.isGravityWell) {
            this.whirlpool = { x: mx, y: my, strength: 1 };
            // Whirlpool continuously spawns ripples
            if (tick % 5 === 0) {
                this._spawnRipple(mx, my, 1.5);
            }
        } else {
            this.whirlpool = null;
        }

        // Update ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed * system.speedMultiplier;
            r.life -= r.decay;
            if (r.life <= 0 || r.radius > Math.max(system.width, system.height)) {
                this.ripplePool.push(r);
                this.ripples[i] = this.ripples[this.ripples.length - 1];
                this.ripples.pop();
            }
        }

        // Cap ripple count for performance
        while (this.ripples.length > 30) {
            this.ripplePool.push(this.ripples.shift());
        }

        // Compute caustic grid from ripple interference
        this.causticGrid.fill(0);
        const cw = this.causticW;
        const cs = this.cellSize;
        for (let gy = 0; gy < this.causticH; gy++) {
            for (let gx = 0; gx < cw; gx++) {
                const wx = gx * cs;
                const wy = gy * cs;
                let val = 0;

                // Sum wave contributions from all ripples
                for (let r = 0; r < this.ripples.length; r++) {
                    const rip = this.ripples[r];
                    const dx = wx - rip.x;
                    const dy = wy - rip.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const waveDist = Math.abs(dist - rip.radius);
                    if (waveDist < rip.wavelength * 3) {
                        val += Math.cos(waveDist / rip.wavelength * Math.PI * 2) *
                               rip.amplitude * rip.life *
                               Math.exp(-waveDist / (rip.wavelength * 2));
                    }
                }

                // Add slow ambient wave
                val += Math.sin(wx * 0.005 + tick * 0.01) * Math.cos(wy * 0.007 + tick * 0.008) * 0.2 * this.waveAmplitude;

                this.causticGrid[gy * cw + gx] = val;
            }
        }

        // Update floaters
        for (const f of this.floaters) {
            f.phase += f.bobSpeed;

            // Get wave height at floater position to push them
            const gx = Math.floor(f.x / cs);
            const gy = Math.floor(f.y / cs);
            if (gx > 0 && gx < cw - 1 && gy > 0 && gy < this.causticH - 1) {
                const gradX = this.causticGrid[gy * cw + gx + 1] - this.causticGrid[gy * cw + gx - 1];
                const gradY = this.causticGrid[(gy + 1) * cw + gx] - this.causticGrid[(gy - 1) * cw + gx];
                f.vx += gradX * 0.1;
                f.vy += gradY * 0.1;
            }

            // Whirlpool pulls floaters
            if (this.whirlpool) {
                const dx = this.whirlpool.x - f.x;
                const dy = this.whirlpool.y - f.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                if (dist < 300) {
                    const force = (300 - dist) / 300 * 0.3;
                    f.vx += (dy / dist) * force; // tangential (spiral)
                    f.vy += (-dx / dist) * force;
                    f.vx += (dx / dist) * force * 0.3; // radial
                    f.vy += (dy / dist) * force * 0.3;
                }
            }

            f.x += f.vx;
            f.y += f.vy;
            f.vx *= 0.97;
            f.vy *= 0.97;

            // Wrap
            if (f.x < -20) f.x += system.width + 40;
            else if (f.x > system.width + 20) f.x -= system.width + 40;
            if (f.y < -20) f.y += system.height + 40;
            else if (f.y > system.height + 20) f.y -= system.height + 40;
        }
    }

    draw(system) {
        const ctx = system.ctx;
        const tick = system.tick;
        const cw = this.causticW;
        const cs = this.cellSize;

        // Draw caustic light pattern
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let gy = 0; gy < this.causticH - 1; gy++) {
            for (let gx = 0; gx < cw - 1; gx++) {
                const val = this.causticGrid[gy * cw + gx];
                if (Math.abs(val) < 0.05) continue;

                const brightness = Math.max(0, val) * 0.15;
                if (brightness < 0.01) continue;

                const hueShift = val * 15;
                ctx.fillStyle = `hsla(${this.waterHue + hueShift}, 60%, 50%, ${brightness})`;
                ctx.fillRect(gx * cs, gy * cs, cs, cs);
            }
        }

        // Draw caustic bright lines (where gradient is steep = light focusing)
        for (let gy = 1; gy < this.causticH - 1; gy++) {
            for (let gx = 1; gx < cw - 1; gx++) {
                const gradX = this.causticGrid[gy * cw + gx + 1] - this.causticGrid[gy * cw + gx - 1];
                const gradY = this.causticGrid[(gy + 1) * cw + gx] - this.causticGrid[(gy - 1) * cw + gx];
                const gradMag = Math.abs(gradX) + Math.abs(gradY);

                if (gradMag > 0.3) {
                    const intensity = Math.min(0.2, (gradMag - 0.3) * 0.4);
                    ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                    ctx.fillRect(gx * cs - 1, gy * cs - 1, cs + 2, cs + 2);
                }
            }
        }

        // Spirograph caustic overlay — hypotrochoid curve modulates light spot positions
        if (this.useMathCaustics && this.causticCurve) {
            this.causticCurveOffset = (this.causticCurveOffset + 1) % this.causticCurve.length;
            const pts = this.causticCurve;
            const count = Math.min(80, pts.length);
            const step = Math.floor(pts.length / count);
            for (let i = 0; i < count; i++) {
                const idx = (this.causticCurveOffset + i * step) % pts.length;
                const pt = pts[idx];
                // pt.x / pt.y are in [0,1] after normalizePoints
                const sx = pt.x * system.width;
                const sy = pt.y * system.height;
                const wave = this.causticGrid[
                    Math.floor(sy / cs) * cw + Math.floor(sx / cs)
                ] || 0;
                const intensity = 0.06 + Math.max(0, wave) * 0.12;
                ctx.fillStyle = `hsla(${this.waterHue + wave * 20}, 70%, 75%, ${intensity})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 3 + Math.abs(wave) * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';

        // Draw ripple rings
        ctx.lineWidth = 1.5;
        for (const rip of this.ripples) {
            if (rip.life < 0.05) continue;
            const alpha = rip.life * rip.amplitude * 0.3;
            ctx.strokeStyle = `hsla(${this.waterHue + 20}, 50%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            if (rip.radius > rip.wavelength) {
                ctx.strokeStyle = `hsla(${this.waterHue}, 40%, 70%, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(rip.x, rip.y, rip.radius - rip.wavelength, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Draw whirlpool
        if (this.whirlpool) {
            const wp = this.whirlpool;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let r = 0; r < 5; r++) {
                const angle = tick * 0.05 + r * Math.PI * 0.4;
                const spiralR = 20 + r * 30;
                ctx.strokeStyle = `hsla(${this.waterHue + 30}, 60%, 70%, ${0.15 - r * 0.02})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let t = 0; t < Math.PI * 2; t += 0.1) {
                    const sr = spiralR + t * 15;
                    const sx = wp.x + Math.cos(t + angle) * sr;
                    const sy = wp.y + Math.sin(t + angle) * sr;
                    if (t === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.restore();
        }

        // Draw floaters
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const f of this.floaters) {
            const bob = Math.sin(f.phase) * 2;
            const alpha = 0.4 + Math.sin(f.phase * 0.5) * 0.2;

            if (f.glow) {
                const glowSize = f.size * 3;
                ctx.fillStyle = `hsla(${f.hue}, 70%, 60%, ${alpha * 0.2})`;
                ctx.beginPath();
                ctx.arc(f.x, f.y + bob, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = `hsla(${f.hue}, 60%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y + bob, f.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        ctx.restore();
    }
}
