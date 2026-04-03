/**
 * @file portal_vortex_effects.js
 * @description Creates swirling dimensional portal effects that follow the cursor.
 * Particles spiral inward/outward with depth illusion. Clicking opens/closes portals.
 * Each seed creates a unique portal aesthetic.
 *
 * Modes:
 * 0 - Black Hole: Dark center pulling particles in spiraling orbits, accretion disk
 * 1 - Warp Gate: Sci-fi ring portal with energy crackling and particle emission
 * 2 - Magic Circle: Arcane rotating rune circles with glowing sigils
 * 3 - Whirlpool: Water-like spiral pulling floating debris inward
 * 4 - Cosmic Eye: Iris-like structure that opens/closes, pupil follows cursor
 * 5 - Dimensional Tear: Jagged rip in space with energy leaking through
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class PortalVortex {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 260;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Portal state
        this._portalX = 0;
        this._portalY = 0;
        this._portalRadius = 0;
        this._targetRadius = 80;
        this._openness = 0; // 0=closed, 1=fully open
        this._targetOpenness = 0.6;
        this._rotation = 0;
        this._rotSpeed = 0.02;

        // Orbiting particles
        this._orbiters = [];
        this.maxOrbiters = 60;

        // Energy arcs
        this._arcs = [];
        this.maxArcs = 12;

        // Rune data for magic circle mode
        this._runeAngles = [];
        this._runeCount = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 260;
        this.intensity = 0.5 + rng() * 0.5;

        const W = window.innerWidth;
        const H = window.innerHeight;
        this._portalX = W / 2;
        this._portalY = H / 2;
        this._portalRadius = 0;
        this._targetRadius = 60 + rng() * 80;
        this._openness = 0;
        this._targetOpenness = 0.4 + rng() * 0.4;
        this._rotation = rng() * TAU;
        this._rotSpeed = 0.01 + rng() * 0.03;
        this._orbiters = [];
        this._arcs = [];

        // Mode-specific setup
        if (this.mode === 0) {
            this._rotSpeed = 0.03 + rng() * 0.02;
        } else if (this.mode === 2) {
            this._runeCount = 6 + Math.floor(rng() * 6);
            this._runeAngles = [];
            for (let i = 0; i < this._runeCount; i++) {
                this._runeAngles.push({
                    base: (i / this._runeCount) * TAU,
                    wobble: rng() * 0.3,
                    wobbleSpeed: 0.005 + rng() * 0.01,
                    size: 5 + rng() * 10,
                    shape: Math.floor(rng() * 4),
                });
            }
        } else if (this.mode === 5) {
            // Tear points
            this._tearPoints = [];
            const points = 8 + Math.floor(rng() * 8);
            for (let i = 0; i < points; i++) {
                this._tearPoints.push({
                    angle: (i / points) * TAU,
                    radius: 0.7 + rng() * 0.6,
                    jitter: rng() * 15,
                    phase: rng() * TAU,
                });
            }
        }

        // Pre-populate orbiters
        const initOrbiters = 20 + Math.floor(rng() * 20);
        for (let i = 0; i < initOrbiters; i++) {
            this._spawnOrbiter(rng);
        }
    }

    _spawnOrbiter(rng) {
        if (this._orbiters.length >= this.maxOrbiters) return;
        // Use deterministic _prand when no seeded rng is provided (runtime spawns)
        const _r = (offset) => rng ? rng() : _prand(this.tick * 37 + offset + this._orbiters.length * 13);
        const angle = _r(0) * TAU;
        const dist = this._targetRadius * (0.5 + _r(1) * 2);
        const o = {};
        o.angle = angle;
        o.dist = dist;
        // Mode-specific orbit speed: Black Hole faster, Whirlpool fastest, others moderate
        const baseSpeed = this.mode === 0 ? 0.03 : (this.mode === 3 ? 0.04 : 0.015);
        o.speed = baseSpeed + _r(2) * 0.03;
        o.size = 1 + _r(3) * 3;
        o.hueOffset = (_r(4) - 0.5) * 40;
        o.life = 60 + _r(5) * 100;
        o.maxLife = o.life;
        o.driftIn = this.mode === 0 || this.mode === 3; // spiral inward
        this._orbiters.push(o);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Portal follows cursor smoothly
        this._portalX += (mx - this._portalX) * 0.03;
        this._portalY += (my - this._portalY) * 0.03;

        // Click opens portal wider
        if (isClicking && !this._wasClicking) {
            this._targetOpenness = Math.min(1, this._targetOpenness + 0.3);
            // Spawn burst of orbiters
            for (let i = 0; i < 8; i++) {
                this._spawnOrbiter(null);
            }
        }
        if (!isClicking && this._wasClicking) {
            this._targetOpenness = Math.max(0.3, this._targetOpenness - 0.2);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Animate openness with cubic ease for dramatic effect
        const openDiff = this._targetOpenness - this._openness;
        this._openness += openDiff * 0.05 * (1 + Math.abs(openDiff) * 2);
        this._portalRadius += (this._targetRadius * this._openness - this._portalRadius) * 0.08;
        this._rotation += this._rotSpeed * (1 + this._mouseSpeed * 0.01);

        // Update orbiters
        for (let i = this._orbiters.length - 1; i >= 0; i--) {
            const o = this._orbiters[i];
            o.angle += o.speed * (this.mode === 3 ? 1.5 : 1);
            o.life--;

            if (o.driftIn) {
                o.dist -= 0.3;
                if (o.dist < 5) o.life = 0;
            } else {
                o.dist += 0.15;
            }

            if (o.life <= 0 || o.dist > this._targetRadius * 4) {
                this._orbiters[i] = this._orbiters[this._orbiters.length - 1];
                this._orbiters.pop();
            }
        }

        // Replenish orbiters (only when below 40% to prevent constant spawning)
        if (this._orbiters.length < this.maxOrbiters * 0.4 && this.tick % 4 === 0) {
            this._spawnOrbiter(null);
        }

        // Update energy arcs
        if (this.tick % 8 === 0 && this._arcs.length < this.maxArcs) {
            const seed = this.tick * 43;
            this._arcs.push({
                startAngle: _prand(seed) * TAU,
                arcLen: 0.3 + _prand(seed + 1) * 1.2,
                radiusMult: 0.8 + _prand(seed + 2) * 0.5,
                life: 8 + _prand(seed + 3) * 12,
                maxLife: 20,
                width: 0.5 + _prand(seed + 4) * 2,
            });
        }
        for (let i = this._arcs.length - 1; i >= 0; i--) {
            this._arcs[i].life--;
            if (this._arcs[i].life <= 0) {
                this._arcs[i] = this._arcs[this._arcs.length - 1];
                this._arcs.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const px = this._portalX;
        const py = this._portalY;
        const r = this._portalRadius;

        if (r < 2) { ctx.restore(); return; }

        if (this.mode === 0) this._drawBlackHole(ctx, px, py, r);
        else if (this.mode === 1) this._drawWarpGate(ctx, px, py, r);
        else if (this.mode === 2) this._drawMagicCircle(ctx, px, py, r);
        else if (this.mode === 3) this._drawWhirlpool(ctx, px, py, r);
        else if (this.mode === 4) this._drawCosmicEye(ctx, px, py, r);
        else if (this.mode === 5) this._drawDimensionalTear(ctx, px, py, r);

        // Draw orbiters (universal)
        for (const o of this._orbiters) {
            const ratio = o.life / o.maxLife;
            const ox = px + Math.cos(o.angle) * o.dist;
            const oy = py + Math.sin(o.angle) * o.dist;
            const alpha = ratio * 0.5 * this.intensity;
            const h = (this.hue + o.hueOffset + 360) % 360;

            ctx.fillStyle = `hsla(${h}, 70%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(ox, oy, o.size * ratio, 0, TAU);
            ctx.fill();
        }

        // Draw energy arcs
        for (const arc of this._arcs) {
            const ratio = arc.life / arc.maxLife;
            const alpha = ratio * 0.3 * this.intensity;
            const arcR = r * arc.radiusMult;

            ctx.strokeStyle = `hsla(${(this.hue + 30) % 360}, 90%, 75%, ${alpha})`;
            ctx.lineWidth = arc.width;
            ctx.beginPath();
            ctx.arc(px, py, arcR, this._rotation + arc.startAngle,
                this._rotation + arc.startAngle + arc.arcLen);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawBlackHole(ctx, px, py, r) {
        // Dark void center
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 0.4);
        grad.addColorStop(0, `rgba(0, 0, 0, ${0.3 * this.intensity})`);
        grad.addColorStop(1, 'transparent');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.4, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';

        // Animated accretion disk rings with rotating bright spots
        for (let ring = 0; ring < 4; ring++) {
            const ringR = r * (0.5 + ring * 0.25);
            const baseAlpha = (0.12 - ring * 0.02) * this.intensity;
            const h = (this.hue + ring * 25 + this.tick * 0.3) % 360;
            const ringRot = this._rotation * (1 + ring * 0.3) + ring * 0.5;

            // Main ring stroke
            ctx.strokeStyle = `hsla(${h}, 80%, 60%, ${baseAlpha})`;
            ctx.lineWidth = 2.5 - ring * 0.4;
            ctx.beginPath();
            ctx.ellipse(px, py, ringR, ringR * 0.3, ringRot, 0, TAU);
            ctx.stroke();

            // Bright hotspots orbiting in disk
            const spotCount = 2 + ring;
            for (let s = 0; s < spotCount; s++) {
                const spotAngle = ringRot + (s / spotCount) * TAU;
                const spotX = px + Math.cos(spotAngle) * ringR;
                const spotY = py + Math.sin(spotAngle) * ringR * 0.3;
                const spotAlpha = baseAlpha * (0.5 + Math.sin(this.tick * 0.1 + s * 2 + ring) * 0.3);
                ctx.fillStyle = `hsla(${(h + 30) % 360}, 90%, 80%, ${spotAlpha})`;
                ctx.beginPath();
                ctx.arc(spotX, spotY, 1.5 + (3 - ring) * 0.5, 0, TAU);
                ctx.fill();
            }
        }

        // Event horizon glow
        const glowGrad = ctx.createRadialGradient(px, py, r * 0.3, px, py, r * 0.8);
        glowGrad.addColorStop(0, `hsla(${this.hue}, 70%, 50%, ${0.08 * this.intensity})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.8, 0, TAU);
        ctx.fill();
    }

    _drawWarpGate(ctx, px, py, r) {
        // Outer ring
        ctx.strokeStyle = `hsla(${this.hue}, 80%, 60%, ${0.15 * this.intensity})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.stroke();

        // Inner energy fill
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 0.9);
        grad.addColorStop(0, `hsla(${(this.hue + 60) % 360}, 70%, 70%, ${0.06 * this.intensity})`);
        grad.addColorStop(0.6, `hsla(${this.hue}, 60%, 50%, ${0.03 * this.intensity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.9, 0, TAU);
        ctx.fill();

        // Chevron markers
        const chevCount = 8;
        for (let i = 0; i < chevCount; i++) {
            const angle = this._rotation * 0.3 + (i / chevCount) * TAU;
            const cx = px + Math.cos(angle) * r;
            const cy = py + Math.sin(angle) * r;
            const pulse = (Math.sin(this.tick * 0.05 + i) + 1) / 2;
            const alpha = (0.1 + pulse * 0.2) * this.intensity;

            ctx.fillStyle = `hsla(${this.hue}, 90%, 75%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 3 + pulse * 3, 0, TAU);
            ctx.fill();
        }
    }

    _drawMagicCircle(ctx, px, py, r) {
        // Outer rotating circle
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(this._rotation);

        ctx.strokeStyle = `hsla(${this.hue}, 70%, 65%, ${0.12 * this.intensity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.stroke();

        // Inner circle
        ctx.strokeStyle = `hsla(${(this.hue + 30) % 360}, 60%, 60%, ${0.1 * this.intensity})`;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, TAU);
        ctx.stroke();

        // Rune sigils
        for (const rune of this._runeAngles) {
            const a = rune.base + Math.sin(this.tick * rune.wobbleSpeed) * rune.wobble;
            const rx = Math.cos(a) * r * 0.85;
            const ry = Math.sin(a) * r * 0.85;
            const glow = (Math.sin(this.tick * 0.03 + rune.base * 3) + 1) / 2;
            const alpha = (0.1 + glow * 0.2) * this.intensity;

            ctx.strokeStyle = `hsla(${(this.hue + rune.shape * 30) % 360}, 80%, 70%, ${alpha})`;
            ctx.lineWidth = 1;

            if (rune.shape === 0) {
                // Triangle
                this._drawPolygon(ctx, rx, ry, rune.size, 3);
            } else if (rune.shape === 1) {
                // Diamond
                this._drawPolygon(ctx, rx, ry, rune.size, 4);
            } else if (rune.shape === 2) {
                // Star cross
                ctx.beginPath();
                ctx.moveTo(rx - rune.size, ry);
                ctx.lineTo(rx + rune.size, ry);
                ctx.moveTo(rx, ry - rune.size);
                ctx.lineTo(rx, ry + rune.size);
                ctx.stroke();
            } else {
                // Circle with dot
                ctx.beginPath();
                ctx.arc(rx, ry, rune.size, 0, TAU);
                ctx.stroke();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(rx, ry, 2, 0, TAU);
                ctx.fill();
            }
        }

        // Connecting lines between runes (pentagram-like)
        if (this._runeAngles.length >= 3) {
            ctx.strokeStyle = `hsla(${this.hue}, 50%, 55%, ${0.05 * this.intensity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let i = 0; i < this._runeAngles.length; i++) {
                const a = this._runeAngles[i].base + Math.sin(this.tick * this._runeAngles[i].wobbleSpeed) * this._runeAngles[i].wobble;
                const skip = Math.floor(this._runeAngles.length / 3) + 1;
                const j = (i + skip) % this._runeAngles.length;
                const b = this._runeAngles[j].base + Math.sin(this.tick * this._runeAngles[j].wobbleSpeed) * this._runeAngles[j].wobble;
                ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
                ctx.lineTo(Math.cos(b) * r * 0.85, Math.sin(b) * r * 0.85);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawPolygon(ctx, cx, cy, r, sides) {
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const a = (i / sides) * TAU - Math.PI / 2;
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    _drawWhirlpool(ctx, px, py, r) {
        // Spiral arms
        const arms = 4;
        for (let arm = 0; arm < arms; arm++) {
            const baseAngle = (arm / arms) * TAU + this._rotation * 2;
            ctx.beginPath();
            const segments = 30;
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const spiralAngle = baseAngle + t * TAU * 2;
                const spiralR = r * t;
                const sx = px + Math.cos(spiralAngle) * spiralR;
                const sy = py + Math.sin(spiralAngle) * spiralR;
                if (s === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            const alpha = 0.1 * this.intensity;
            ctx.strokeStyle = `hsla(${(this.hue + arm * 20) % 360}, 60%, 60%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Center vortex glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r * 0.3);
        grad.addColorStop(0, `hsla(${this.hue}, 60%, 70%, ${0.1 * this.intensity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.3, 0, TAU);
        ctx.fill();
    }

    _drawCosmicEye(ctx, px, py, r) {
        // Iris
        const irisR = r * 0.7;
        const pupilR = r * 0.25 * (1 - this._openness * 0.3);

        // Outer iris glow
        const irisGrad = ctx.createRadialGradient(px, py, pupilR, px, py, irisR);
        irisGrad.addColorStop(0, `hsla(${this.hue}, 70%, 50%, ${0.1 * this.intensity})`);
        irisGrad.addColorStop(0.5, `hsla(${(this.hue + 30) % 360}, 80%, 55%, ${0.08 * this.intensity})`);
        irisGrad.addColorStop(1, `hsla(${this.hue}, 60%, 40%, ${0.03 * this.intensity})`);
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(px, py, irisR, 0, TAU);
        ctx.fill();

        // Iris pattern (radial lines)
        const lineCount = 24;
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * TAU + this._rotation * 0.5;
            const alpha = (0.04 + Math.sin(this.tick * 0.02 + i) * 0.02) * this.intensity;
            ctx.strokeStyle = `hsla(${(this.hue + i * 5) % 360}, 60%, 65%, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px + Math.cos(angle) * pupilR, py + Math.sin(angle) * pupilR);
            ctx.lineTo(px + Math.cos(angle) * irisR, py + Math.sin(angle) * irisR);
            ctx.stroke();
        }

        // Pupil (follows cursor slightly, clamped to stay within iris)
        const maxPupilOffset = pupilR * 0.6;
        let pdx = (this._mx - px) * 0.05;
        let pdy = (this._my - py) * 0.05;
        const pupilDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pupilDist > maxPupilOffset) {
            pdx = (pdx / pupilDist) * maxPupilOffset;
            pdy = (pdy / pupilDist) * maxPupilOffset;
        }
        const pupilGrad = ctx.createRadialGradient(px + pdx, py + pdy, 0, px + pdx, py + pdy, pupilR);
        pupilGrad.addColorStop(0, `rgba(0, 0, 0, ${0.2 * this.intensity})`);
        pupilGrad.addColorStop(1, `rgba(0, 0, 0, ${0.05 * this.intensity})`);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = pupilGrad;
        ctx.beginPath();
        ctx.arc(px + pdx, py + pdy, pupilR, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'lighter';

        // Catchlight
        const clx = px + pdx - pupilR * 0.3;
        const cly = py + pdy - pupilR * 0.3;
        ctx.fillStyle = `hsla(0, 0%, 100%, ${0.1 * this.intensity})`;
        ctx.beginPath();
        ctx.arc(clx, cly, pupilR * 0.15, 0, TAU);
        ctx.fill();
    }

    _drawDimensionalTear(ctx, px, py, r) {
        if (!this._tearPoints || this._tearPoints.length < 3) return;

        // Jagged tear outline
        ctx.beginPath();
        for (let i = 0; i <= this._tearPoints.length; i++) {
            const tp = this._tearPoints[i % this._tearPoints.length];
            const jitter = Math.sin(this.tick * 0.1 + tp.phase) * tp.jitter;
            const tr = r * tp.radius + jitter;
            const angle = tp.angle + this._rotation * 0.2;
            const tx = px + Math.cos(angle) * tr;
            const ty = py + Math.sin(angle) * tr;
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
        }
        ctx.closePath();

        // Fill with dimensional energy
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, `hsla(${(this.hue + 120) % 360}, 80%, 70%, ${0.08 * this.intensity})`);
        grad.addColorStop(0.5, `hsla(${this.hue}, 70%, 50%, ${0.04 * this.intensity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();

        // Crackling border
        ctx.strokeStyle = `hsla(${this.hue}, 90%, 75%, ${0.2 * this.intensity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Energy leak lines - more visible with glow and flicker
        for (let i = 0; i < this._tearPoints.length; i++) {
            const tp = this._tearPoints[i];
            const angle = tp.angle + this._rotation * 0.2;
            const tr = r * tp.radius;
            const sx = px + Math.cos(angle) * tr;
            const sy = py + Math.sin(angle) * tr;
            const leakLen = 25 + Math.sin(this.tick * 0.08 + i) * 20;
            const flicker = (Math.sin(this.tick * 0.5 + i * 3.7) + 1) / 2;
            if (flicker < 0.3) continue; // intermittent leaks

            const ex = sx + Math.cos(angle) * leakLen;
            const ey = sy + Math.sin(angle) * leakLen;

            const alpha = (0.08 + flicker * 0.12) * this.intensity;
            const h = (this.hue + i * 15) % 360;

            // Glow around leak
            ctx.strokeStyle = `hsla(${h}, 85%, 70%, ${alpha})`;
            ctx.lineWidth = 1.5 + flicker;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            // Jagged lightning-like path
            const segments = 3;
            let cx = sx, cy = sy;
            for (let s = 1; s <= segments; s++) {
                const t = s / segments;
                const jx = (sx + (ex - sx) * t) + Math.sin(this.tick * 0.4 + i * 1.7 + s * 2.3) * 12;
                const jy = (sy + (ey - sy) * t) + Math.cos(this.tick * 0.35 + i * 2.1 + s * 1.9) * 12;
                ctx.lineTo(jx, jy);
                cx = jx; cy = jy;
            }
            ctx.stroke();

            // Bright endpoint spark
            if (flicker > 0.6) {
                ctx.fillStyle = `hsla(${h}, 90%, 85%, ${(flicker - 0.6) * 0.3 * this.intensity})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 2 + flicker * 2, 0, TAU);
                ctx.fill();
            }
        }
    }
}
