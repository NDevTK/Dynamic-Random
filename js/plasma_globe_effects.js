/**
 * @file plasma_globe_effects.js
 * @description Interactive plasma globe effect with electric arcs that reach toward
 * the cursor. Features a central energy core with branching lightning tendrils.
 * Clicking intensifies the discharge, and mouse movement attracts/repels arcs.
 *
 * Modes:
 * 0 - Classic Globe: Purple-blue arcs from center to cursor, glass sphere outline
 * 1 - Tesla Coil: Vertical arcs that climb upward, branching at tips with sharp angles
 * 2 - Neural Storm: Organic branching like neurons firing, warm amber/pink palette
 * 3 - Void Rift: Dark energy tears in space with inverted colors and jagged geometry
 * 4 - Sun Surface: Solar flare-like arcs with corona glow and magnetic loop structures
 * 5 - Crystal Prison: Geometric arcs that snap to grid lines and faceted angles
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class PlasmaGlobe {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 270;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Core position (can be center or floating)
        this._coreX = 0;
        this._coreY = 0;
        this._coreTargetX = 0;
        this._coreTargetY = 0;

        // Arc definitions - reused each frame
        this._arcs = [];
        this._maxArcs = 8;
        this._arcPool = [];

        // Discharge bursts on click
        this._bursts = [];
        this._burstPool = [];

        // Secondary cores for multi-core modes
        this._secondaryCores = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 270;
        this.intensity = 0.6 + rng() * 0.5;
        this._arcs = [];
        this._bursts = [];

        const W = window.innerWidth, H = window.innerHeight;
        this._coreX = W / 2;
        this._coreY = H / 2;
        this._coreTargetX = this._coreX;
        this._coreTargetY = this._coreY;

        // Arc count varies by mode
        this._maxArcs = this.mode === 1 ? 5 : this.mode === 3 ? 6 : 8;

        // Generate persistent arcs
        for (let i = 0; i < this._maxArcs; i++) {
            this._arcs.push({
                angleOffset: rng() * TAU,
                speed: 0.005 + rng() * 0.02,
                branchDepth: this.mode === 2 ? 4 : (this.mode === 5 ? 2 : 3),
                jitter: 0.3 + rng() * 0.7,
                hueShift: (rng() - 0.5) * 40,
                segments: 6 + Math.floor(rng() * 6),
                reachFactor: 0.5 + rng() * 0.5,
                phaseOffset: rng() * TAU,
            });
        }

        // Secondary cores for mode 4 (sun) and mode 5 (crystal)
        this._secondaryCores = [];
        if (this.mode === 4) {
            const count = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < count; i++) {
                this._secondaryCores.push({
                    angle: rng() * TAU,
                    dist: 80 + rng() * 150,
                    orbitSpeed: 0.003 + rng() * 0.005,
                    size: 5 + rng() * 10,
                    hueShift: rng() * 30,
                });
            }
        } else if (this.mode === 5) {
            const count = 4 + Math.floor(rng() * 4);
            for (let i = 0; i < count; i++) {
                this._secondaryCores.push({
                    x: rng() * W,
                    y: rng() * H,
                    size: 3 + rng() * 5,
                    hueShift: rng() * 60,
                });
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Core drifts slowly toward center, but mouse pulls it
        const W = window.innerWidth, H = window.innerHeight;
        const centerX = W / 2, centerY = H / 2;
        // Core attracted to midpoint between center and mouse
        this._coreTargetX = centerX * 0.7 + mx * 0.3;
        this._coreTargetY = centerY * 0.7 + my * 0.3;
        this._coreX += (this._coreTargetX - this._coreX) * 0.02;
        this._coreY += (this._coreTargetY - this._coreY) * 0.02;

        // Click burst
        if (isClicking && !this._wasClicking) {
            const burstCount = 12 + Math.floor(this._mouseSpeed * 0.5);
            for (let i = 0; i < burstCount; i++) {
                const seed = this.tick * 37 + i * 73;
                const burst = this._burstPool.length > 0 ? this._burstPool.pop() : {};
                const angle = _prand(seed) * TAU;
                const speed = 2 + _prand(seed + 1) * 6;
                burst.x = this._coreX;
                burst.y = this._coreY;
                burst.vx = Math.cos(angle) * speed;
                burst.vy = Math.sin(angle) * speed;
                burst.life = 20 + _prand(seed + 2) * 30;
                burst.maxLife = burst.life;
                burst.hue = (this.hue + _prand(seed + 3) * 60 - 30 + 360) % 360;
                burst.size = 1 + _prand(seed + 4) * 3;
                this._bursts.push(burst);
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Update bursts
        for (let i = this._bursts.length - 1; i >= 0; i--) {
            const b = this._bursts[i];
            b.x += b.vx;
            b.y += b.vy;
            b.vx *= 0.96;
            b.vy *= 0.96;
            b.life--;
            if (b.life <= 0) {
                this._burstPool.push(b);
                this._bursts[i] = this._bursts[this._bursts.length - 1];
                this._bursts.pop();
            }
        }

        // Update secondary cores orbit
        if (this.mode === 4) {
            for (const sc of this._secondaryCores) {
                sc.angle += sc.orbitSpeed;
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const cx = this._coreX;
        const cy = this._coreY;
        const mx = this._mx;
        const my = this._my;
        const clicking = this._isClicking;
        const speed = this._mouseSpeed;

        // Core glow
        const coreSize = this.mode === 4 ? 30 : (this.mode === 3 ? 15 : 20);
        const pulseSize = coreSize * (1 + Math.sin(this.tick * 0.05) * 0.2);
        const coreAlpha = (clicking ? 0.4 : 0.2) * this.intensity;

        if (this.mode !== 3) {
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize * 3);
            grad.addColorStop(0, `hsla(${this.hue}, 80%, 90%, ${coreAlpha})`);
            grad.addColorStop(0.3, `hsla(${this.hue + 20}, 70%, 60%, ${coreAlpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, pulseSize * 3, 0, TAU);
            ctx.fill();
        }

        // Draw arcs from core toward mouse
        for (let i = 0; i < this._arcs.length; i++) {
            const arc = this._arcs[i];
            const arcHue = (this.hue + arc.hueShift + 360) % 360;
            const targetX = mx + Math.cos(this.tick * arc.speed + arc.angleOffset) * (30 + speed * 2);
            const targetY = my + Math.sin(this.tick * arc.speed + arc.angleOffset) * (30 + speed * 2);

            const arcAlpha = (clicking ? 0.35 : 0.15) * this.intensity;

            if (this.mode === 0) this._drawClassicArc(ctx, cx, cy, targetX, targetY, arc, arcHue, arcAlpha);
            else if (this.mode === 1) this._drawTeslaArc(ctx, cx, cy, targetX, targetY, arc, arcHue, arcAlpha);
            else if (this.mode === 2) this._drawNeuralArc(ctx, cx, cy, targetX, targetY, arc, arcHue, arcAlpha);
            else if (this.mode === 3) this._drawVoidArc(ctx, cx, cy, targetX, targetY, arc, arcHue, arcAlpha);
            else if (this.mode === 4) this._drawSolarArc(ctx, cx, cy, targetX, targetY, arc, arcHue, arcAlpha);
            else if (this.mode === 5) this._drawCrystalArc(ctx, cx, cy, targetX, targetY, arc, arcHue, arcAlpha);
        }

        // Secondary cores
        if (this.mode === 4) {
            for (const sc of this._secondaryCores) {
                const sx = cx + Math.cos(sc.angle) * sc.dist;
                const sy = cy + Math.sin(sc.angle) * sc.dist;
                const sAlpha = 0.15 * this.intensity;
                const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sc.size * 3);
                sGrad.addColorStop(0, `hsla(${(this.hue + sc.hueShift) % 360}, 90%, 80%, ${sAlpha})`);
                sGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = sGrad;
                ctx.beginPath();
                ctx.arc(sx, sy, sc.size * 3, 0, TAU);
                ctx.fill();
            }
        }

        // Crystal grid nodes
        if (this.mode === 5) {
            for (const sc of this._secondaryCores) {
                ctx.fillStyle = `hsla(${(this.hue + sc.hueShift) % 360}, 60%, 70%, 0.1)`;
                ctx.beginPath();
                ctx.arc(sc.x, sc.y, sc.size, 0, TAU);
                ctx.fill();
            }
        }

        // Globe outline for classic mode
        if (this.mode === 0) {
            const globeR = Math.max(150, Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) * 0.8);
            ctx.strokeStyle = `hsla(${this.hue}, 40%, 60%, 0.05)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, globeR, 0, TAU);
            ctx.stroke();
        }

        // Burst particles
        for (const b of this._bursts) {
            const lifeRatio = b.life / b.maxLife;
            const alpha = lifeRatio * 0.5 * this.intensity;
            ctx.fillStyle = `hsla(${b.hue}, 90%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size * lifeRatio, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawClassicArc(ctx, x1, y1, x2, y2, arc, hue, alpha) {
        const segments = arc.segments;
        ctx.strokeStyle = `hsla(${hue}, 80%, 75%, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const baseX = x1 + (x2 - x1) * t;
            const baseY = y1 + (y2 - y1) * t;
            const jitterAmt = arc.jitter * 30 * Math.sin(t * Math.PI); // max jitter at midpoint
            const seed = this.tick * 3 + s * 17 + arc.angleOffset * 100;
            const jx = baseX + ((_prand(seed | 0) - 0.5) * jitterAmt);
            const jy = baseY + ((_prand((seed + 7) | 0) - 0.5) * jitterAmt);
            ctx.lineTo(jx, jy);
        }
        ctx.stroke();

        // Glow pass
        ctx.strokeStyle = `hsla(${hue}, 90%, 90%, ${alpha * 0.3})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    _drawTeslaArc(ctx, x1, y1, x2, y2, arc, hue, alpha) {
        // Vertical climbing arcs with sharp 90-degree bends
        const segments = arc.segments;
        ctx.strokeStyle = `hsla(${hue}, 85%, 80%, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();

        let px = x1, py = y1;
        ctx.moveTo(px, py);

        for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const baseX = x1 + (x2 - x1) * t;
            const baseY = y1 + (y2 - y1) * t;
            const seed = this.tick * 5 + s * 23 + arc.angleOffset * 100;
            // Alternate horizontal and vertical segments
            if (s % 2 === 0) {
                ctx.lineTo(baseX + (_prand(seed | 0) - 0.5) * 40, py);
                ctx.lineTo(baseX + (_prand(seed | 0) - 0.5) * 40, baseY);
            } else {
                ctx.lineTo(px, baseY + (_prand((seed + 3) | 0) - 0.5) * 40);
                ctx.lineTo(baseX, baseY + (_prand((seed + 3) | 0) - 0.5) * 40);
            }
            px = baseX;
            py = baseY;
        }
        ctx.stroke();

        // Branch at tip
        if (arc.branchDepth > 0) {
            const tipSeed = this.tick * 11 + arc.angleOffset * 200;
            for (let b = 0; b < 2; b++) {
                const bAngle = (_prand((tipSeed + b * 31) | 0) - 0.5) * Math.PI;
                const bLen = 20 + _prand((tipSeed + b * 47) | 0) * 40;
                ctx.strokeStyle = `hsla(${hue}, 80%, 85%, ${alpha * 0.5})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(x2, y2);
                ctx.lineTo(x2 + Math.cos(bAngle) * bLen, y2 + Math.sin(bAngle) * bLen);
                ctx.stroke();
            }
        }
    }

    _drawNeuralArc(ctx, x1, y1, x2, y2, arc, hue, alpha) {
        // Organic branching like dendrites with synapse glows
        this._drawDendrite(ctx, x1, y1, x2, y2, arc.branchDepth, hue, alpha, arc, 2);
    }

    _drawDendrite(ctx, x1, y1, x2, y2, depth, hue, alpha, arc, width) {
        if (depth <= 0) return;

        const segments = 5;
        ctx.strokeStyle = `hsla(${hue}, 60%, 65%, ${alpha})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        let endX = x2, endY = y2;
        for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const baseX = x1 + (x2 - x1) * t;
            const baseY = y1 + (y2 - y1) * t;
            const seed = this.tick * 2 + s * 13 + depth * 37 + (arc.phaseOffset * 100) | 0;
            const curve = Math.sin(t * Math.PI) * 25 * arc.jitter;
            endX = baseX + ((_prand(seed) - 0.5) * curve);
            endY = baseY + ((_prand(seed + 5) - 0.5) * curve);
            ctx.lineTo(endX, endY);
        }
        ctx.stroke();

        // Synapse glow at junction - pulsing node where branches meet
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const pulse = (Math.sin(this.tick * 0.08 + depth * 1.5 + arc.phaseOffset) + 1) / 2;
        const nodeAlpha = alpha * (0.3 + pulse * 0.5);
        const nodeSize = 3 + pulse * 4 + depth;
        ctx.fillStyle = `hsla(${(hue + 30) % 360}, 80%, 85%, ${nodeAlpha})`;
        ctx.beginPath();
        ctx.arc(midX, midY, nodeSize, 0, TAU);
        ctx.fill();

        // Branch
        if (depth > 1) {
            const branchSeed = this.tick + depth * 71 + (arc.angleOffset * 50) | 0;
            const bAngle = _prand(branchSeed) * TAU;
            const bLen = 30 + depth * 25;
            const bx = midX + Math.cos(bAngle) * bLen;
            const by = midY + Math.sin(bAngle) * bLen;
            this._drawDendrite(ctx, midX, midY, bx, by, depth - 1, (hue + 20) % 360, alpha * 0.6, arc, width * 0.6);

            // Second branch for more organic look
            const bAngle2 = bAngle + 0.8 + _prand(branchSeed + 13) * 0.6;
            const bLen2 = 20 + depth * 15;
            const bx2 = midX + Math.cos(bAngle2) * bLen2;
            const by2 = midY + Math.sin(bAngle2) * bLen2;
            this._drawDendrite(ctx, midX, midY, bx2, by2, depth - 2, (hue + 40) % 360, alpha * 0.4, arc, width * 0.4);
        }
    }

    _drawVoidArc(ctx, x1, y1, x2, y2, arc, hue, alpha) {
        // Jagged tear in space with dark energy bleeding through
        const segments = arc.segments + 3;
        const tearWidth = 8 + arc.jitter * 12;

        // Build rift path points
        const points = [{ x: x1, y: y1 }];
        for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const baseX = x1 + (x2 - x1) * t;
            const baseY = y1 + (y2 - y1) * t;
            const seed = this.tick * 7 + s * 29 + (arc.angleOffset * 100) | 0;
            const jitter = arc.jitter * 60 * Math.sin(t * Math.PI);
            const px = baseX + (_prand(seed) - 0.5) * jitter;
            const py = baseY + (_prand(seed + 11) - 0.5) * jitter;
            points.push({ x: px, y: py });
        }

        // Dark energy fill - wider tear shape
        const riftAlpha = alpha * 0.4;
        ctx.fillStyle = `hsla(${(hue + 180) % 360}, 80%, 8%, ${riftAlpha})`;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y + tearWidth);
        }
        for (let i = points.length - 1; i >= 0; i--) {
            ctx.lineTo(points[i].x, points[i].y - tearWidth);
        }
        ctx.closePath();
        ctx.fill();

        // Inner bright edge (the rift boundary glowing)
        ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 50%, 70%, ${alpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();

        // Secondary rift edge (offset for depth)
        ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${alpha * 0.4})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y + tearWidth * 0.5);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y + tearWidth * 0.5);
        }
        ctx.stroke();

        // Dark energy sparks escaping the rift
        for (let i = 1; i < points.length - 1; i += 2) {
            const sparkSeed = this.tick * 3 + i * 41 + (arc.angleOffset * 200) | 0;
            const sparkAlpha = _prand(sparkSeed) * alpha * 0.6;
            const sparkSize = 2 + _prand(sparkSeed + 1) * 4;
            const ox = (_prand(sparkSeed + 2) - 0.5) * tearWidth * 2;
            const oy = (_prand(sparkSeed + 3) - 0.5) * tearWidth * 2;
            ctx.fillStyle = `hsla(${(hue + 180) % 360}, 60%, 60%, ${sparkAlpha})`;
            ctx.beginPath();
            ctx.arc(points[i].x + ox, points[i].y + oy, sparkSize, 0, TAU);
            ctx.fill();
        }
    }

    _drawSolarArc(ctx, x1, y1, x2, y2, arc, hue, alpha) {
        // Magnetic loop / solar flare shape
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const loopHeight = dist * 0.4 * arc.reachFactor;

        const ctrlX = midX + perpX * loopHeight;
        const ctrlY = midY + perpY * loopHeight;

        // Arc with shimmer
        const seed = this.tick * 3 + arc.angleOffset * 100;
        const shimmer = Math.sin(this.tick * 0.1 + arc.phaseOffset) * 0.5 + 0.5;

        ctx.strokeStyle = `hsla(${hue}, 90%, ${60 + shimmer * 20}%, ${alpha * (0.8 + shimmer * 0.4)})`;
        ctx.lineWidth = 1 + shimmer;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(ctrlX + (_prand(seed | 0) - 0.5) * 15, ctrlY + (_prand((seed + 3) | 0) - 0.5) * 15, x2, y2);
        ctx.stroke();

        // Inner glow
        ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 100%, 90%, ${alpha * shimmer * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    _drawCrystalArc(ctx, x1, y1, x2, y2, arc, hue, alpha) {
        // Arcs that snap to 45-degree angles
        const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, -Math.PI / 4, -Math.PI / 2, -Math.PI * 3 / 4];
        ctx.strokeStyle = `hsla(${hue}, 60%, 75%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        let px = x1, py = y1;
        const stepCount = arc.segments;
        const totalDx = x2 - x1, totalDy = y2 - y1;

        for (let s = 0; s < stepCount; s++) {
            const seed = this.tick * 2 + s * 19 + arc.angleOffset * 100;
            // Find closest allowed angle to target
            const targetAngle = Math.atan2(y2 - py, x2 - px);
            let bestAngle = angles[0];
            let bestDiff = Math.abs(targetAngle - angles[0]);
            for (let a = 1; a < angles.length; a++) {
                const diff = Math.abs(targetAngle - angles[a]);
                if (diff < bestDiff) { bestDiff = diff; bestAngle = angles[a]; }
            }
            // Add slight random perturbation to angle selection
            const aIdx = Math.floor(_prand(seed | 0) * angles.length);
            if (_prand((seed + 5) | 0) > 0.7) bestAngle = angles[aIdx];

            const stepLen = 20 + _prand((seed + 9) | 0) * 30;
            px += Math.cos(bestAngle) * stepLen;
            py += Math.sin(bestAngle) * stepLen;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Crystal node at midpoint
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, ${alpha * 0.3})`;
        ctx.beginPath();
        // Diamond shape
        const ns = 4;
        for (let s = 0; s < ns; s++) {
            const a = (s / ns) * TAU + Math.PI / 4;
            const r = 4;
            if (s === 0) ctx.moveTo(midX + Math.cos(a) * r, midY + Math.sin(a) * r);
            else ctx.lineTo(midX + Math.cos(a) * r, midY + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
    }
}
