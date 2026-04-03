/**
 * @file wormhole_transit_effects.js
 * @description Spiral vortex tunnels that connect two points on screen. Particles
 * get sucked into one end and ejected from the other. Clicking spawns vortex
 * endpoints; the cursor warps space around it creating a gravitational lens effect.
 *
 * Modes:
 * 0 - Classic Wormhole: Two connected spiral funnels with particle transit
 * 1 - Black Hole / White Hole: One endpoint sucks, the other spews particles
 * 2 - Dimensional Rift: Jagged tear in space with energy leaking through
 * 3 - Stargate Ring: Rotating ring portals with event horizon shimmer
 * 4 - Gravity Siphon: Funnel that channels particles in a helical stream
 * 5 - Tesseract Fold: 4D-inspired folding geometry that rotates in higher dimensions
 */

const TAU = Math.PI * 2;

export class WormholeTransit {
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

        // Vortex endpoints
        this.vortexes = [];
        this.maxVortexes = 6;

        // Transit particles
        this.transitParticles = [];
        this.transitPool = [];
        this.maxTransit = 150;

        // Ambient particles that get sucked in
        this.ambientParticles = [];
        this.maxAmbient = 200;

        // Space distortion grid (for gravitational lens)
        this._lensStrength = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 260;
        this.intensity = 0.5 + rng() * 0.6;
        this.vortexes = [];
        this.transitParticles = [];
        this.ambientParticles = [];

        const W = window.innerWidth, H = window.innerHeight;

        // Seed initial vortex pairs
        const pairCount = 1 + Math.floor(rng() * 2);
        for (let i = 0; i < pairCount; i++) {
            this._spawnVortexPair(rng() * W, rng() * H, rng() * W, rng() * H, rng);
        }

        // Ambient particles
        const ambCount = 80 + Math.floor(rng() * 80);
        for (let i = 0; i < ambCount; i++) {
            this.ambientParticles.push({
                x: rng() * W,
                y: rng() * H,
                vx: (rng() - 0.5) * 0.5,
                vy: (rng() - 0.5) * 0.5,
                size: 0.5 + rng() * 2,
                hueOffset: (rng() - 0.5) * 30,
                alpha: 0.1 + rng() * 0.2,
            });
        }
    }

    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    _spawnVortexPair(x1, y1, x2, y2, rng) {
        if (this.vortexes.length >= this.maxVortexes) return;
        const r = rng || ((s) => this._prand(this.tick * 13 + s));
        const base = {
            radius: 30 + r(0) * 40,
            rotation: 0,
            rotSpeed: 0.02 + r(1) * 0.04,
            hueShift: (r(2) - 0.5) * 40,
            pullStrength: 0.3 + r(3) * 0.5,
            spawnRate: 0.1 + r(4) * 0.2,
            life: 600 + Math.floor(r(5) * 400),
            maxLife: 1000,
            spiralArms: 2 + Math.floor(r(6) * 3),
        };

        // Use object references instead of indices for partner tracking
        const v1 = { ...base, x: x1, y: y1, isEntry: true, partner: null };
        const v2 = { ...base, x: x2, y: y2, isEntry: false, partner: null,
            hueShift: base.hueShift + 60, rotSpeed: -base.rotSpeed };
        v1.partner = v2;
        v2.partner = v1;
        v1.maxLife = v1.life;
        v2.life = v1.life;
        v2.maxLife = v1.life;
        this.vortexes.push(v1, v2);
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Click spawns new vortex pair
        if (isClicking && !this._wasClicking) {
            // First click or odd click: store entry point
            if (!this._pendingEntry) {
                this._pendingEntry = { x: mx, y: my };
            } else {
                // Second click: complete the pair
                this._spawnVortexPair(this._pendingEntry.x, this._pendingEntry.y, mx, my, null);
                this._pendingEntry = null;
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        const W = window.innerWidth, H = window.innerHeight;

        // Update vortexes
        for (let i = this.vortexes.length - 1; i >= 0; i--) {
            const v = this.vortexes[i];
            v.rotation += v.rotSpeed;
            v.life--;

            if (v.life <= 0) {
                // Mark partner for removal too
                if (v.partner && v.partner.life > 0) {
                    v.partner.life = 0;
                }
                this.vortexes[i] = this.vortexes[this.vortexes.length - 1];
                this.vortexes.pop();
                continue;
            }

            // Entry vortex: pull ambient particles and transit them
            if (v.isEntry && this.tick % 3 === 0) {
                const partner = v.partner;
                if (!partner) continue;

                // Spawn transit particle from absorbed ambient
                const spawnSeed = this.tick * 17 + i * 41;
                if (this._prand(spawnSeed) < v.spawnRate && this.transitParticles.length < this.maxTransit) {
                    const tp = this.transitPool.length > 0 ? this.transitPool.pop() : {};
                    tp.fromX = v.x; tp.fromY = v.y;
                    tp.toX = partner.x; tp.toY = partner.y;
                    tp.progress = 0;
                    tp.speed = 0.02 + this._prand(spawnSeed + 1) * 0.03;
                    tp.offset = (this._prand(spawnSeed + 2) - 0.5) * v.radius;
                    tp.hue = (this.hue + v.hueShift + this._prand(spawnSeed + 3) * 20) % 360;
                    tp.size = 1 + this._prand(spawnSeed + 4) * 2;
                    this.transitParticles.push(tp);
                }
            }
        }

        // Update transit particles
        for (let i = this.transitParticles.length - 1; i >= 0; i--) {
            const tp = this.transitParticles[i];
            tp.progress += tp.speed;
            if (tp.progress >= 1) {
                this.transitPool.push(tp);
                this.transitParticles[i] = this.transitParticles[this.transitParticles.length - 1];
                this.transitParticles.pop();
            }
        }

        // Update ambient particles (pulled by vortexes)
        for (const p of this.ambientParticles) {
            // Gravitational pull from entry vortexes
            for (const v of this.vortexes) {
                if (!v.isEntry) continue;
                const dx = v.x - p.x, dy = v.y - p.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);
                if (dist < 300 && dist > 5) {
                    const force = v.pullStrength / (dist * 0.5);
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
                // Absorption: reset to random position
                if (dist < v.radius * 0.5) {
                    const rseed = this.tick * 29 + i * 61;
                    p.x = this._prand(rseed) * W;
                    p.y = this._prand(rseed + 1) * H;
                    p.vx = (this._prand(rseed + 2) - 0.5) * 0.5;
                    p.vy = (this._prand(rseed + 3) - 0.5) * 0.5;
                }
            }

            // Ejection push from exit vortexes
            for (const v of this.vortexes) {
                if (v.isEntry) continue;
                const dx = p.x - v.x, dy = p.y - v.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < v.radius * 2 && dist > 0) {
                    const force = v.pullStrength * 0.3 / dist;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            // Cursor lens effect
            const cdx = mx - p.x, cdy = my - p.y;
            const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cDist < 100 && cDist > 5) {
                const lensForce = (1 - cDist / 100) * 0.05;
                // Tangential force (lensing bends light around)
                p.vx += (-cdy / cDist) * lensForce;
                p.vy += (cdx / cDist) * lensForce;
            }

            p.vx *= 0.99;
            p.vy *= 0.99;
            p.x += p.vx;
            p.y += p.vy;

            // Wrap
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Ambient particles
        for (const p of this.ambientParticles) {
            ctx.fillStyle = `hsla(${(this.hue + p.hueOffset + 360) % 360}, 50%, 60%, ${p.alpha * this.intensity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, TAU);
            ctx.fill();
        }

        // Vortexes
        for (let vi = 0; vi < this.vortexes.length; vi++) {
            const v = this.vortexes[vi];
            const lifeRatio = Math.min(1, v.life / 60); // Fade in/out
            if (this.mode === 2) this._drawRift(ctx, v, lifeRatio);
            else if (this.mode === 3) this._drawStargate(ctx, v, lifeRatio);
            else if (this.mode === 5) this._drawTesseract(ctx, v, lifeRatio);
            else this._drawVortex(ctx, v, lifeRatio);
        }

        // Transit particles (traveling between portals)
        for (const tp of this.transitParticles) {
            const t = tp.progress;
            // Curved path between portals
            const midX = (tp.fromX + tp.toX) / 2;
            const midY = (tp.fromY + tp.toY) / 2 - 50;
            const x = (1-t)*(1-t)*tp.fromX + 2*(1-t)*t*midX + t*t*tp.toX;
            const y = (1-t)*(1-t)*tp.fromY + 2*(1-t)*t*midY + t*t*tp.toY;

            const alpha = Math.sin(t * Math.PI) * 0.3 * this.intensity;
            ctx.fillStyle = `hsla(${tp.hue}, 80%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x + tp.offset * Math.sin(t * TAU * 2), y, tp.size, 0, TAU);
            ctx.fill();
        }

        // Pending entry indicator
        if (this._pendingEntry) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.sin(this.tick * 0.1) * 0.05})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this._pendingEntry.x, this._pendingEntry.y, 30, 0, TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    _drawVortex(ctx, v, lifeRatio) {
        const hue = (this.hue + v.hueShift + 360) % 360;
        const alpha = lifeRatio * this.intensity;

        // Accretion disk / spiral arms
        for (let arm = 0; arm < v.spiralArms; arm++) {
            const armAngle = v.rotation + (arm / v.spiralArms) * TAU;
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let t = 0; t < 1; t += 0.05) {
                const r = v.radius * t * (v.isEntry ? 1 : (1 - t));
                const angle = armAngle + t * TAU * 1.5 * (v.isEntry ? 1 : -1);
                const px = v.x + Math.cos(angle) * r;
                const py = v.y + Math.sin(angle) * r;
                if (t === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Event horizon
        const grad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.radius);
        if (v.isEntry) {
            grad.addColorStop(0, `hsla(${hue}, 80%, 20%, ${alpha * 0.15})`);
            grad.addColorStop(0.7, `hsla(${hue}, 70%, 50%, ${alpha * 0.08})`);
        } else {
            grad.addColorStop(0, `hsla(${hue}, 90%, 80%, ${alpha * 0.1})`);
            grad.addColorStop(0.7, `hsla(${hue}, 70%, 50%, ${alpha * 0.05})`);
        }
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, TAU);
        ctx.fill();

        // Rim glow
        ctx.strokeStyle = `hsla(${(hue + 20) % 360}, 80%, 70%, ${alpha * 0.12})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius * 0.9, 0, TAU);
        ctx.stroke();
    }

    _drawRift(ctx, v, lifeRatio) {
        const hue = (this.hue + v.hueShift + 360) % 360;
        const alpha = lifeRatio * this.intensity;

        // Jagged tear
        ctx.strokeStyle = `hsla(${hue}, 90%, 80%, ${alpha * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const points = 8;
        for (let p = 0; p < points; p++) {
            const t = p / points;
            const angle = v.rotation + t * TAU;
            const r = v.radius * (0.6 + Math.sin(angle * 5 + this.tick * 0.05) * 0.4);
            const px = v.x + Math.cos(angle) * r;
            const py = v.y + Math.sin(angle) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Energy leak
        const leakGrad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.radius * 0.7);
        leakGrad.addColorStop(0, `hsla(${(hue + 40) % 360}, 90%, 70%, ${alpha * 0.08})`);
        leakGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = leakGrad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius * 0.7, 0, TAU);
        ctx.fill();
    }

    _drawStargate(ctx, v, lifeRatio) {
        const hue = (this.hue + v.hueShift + 360) % 360;
        const alpha = lifeRatio * this.intensity;

        // Outer ring with chevrons
        const r = v.radius;
        ctx.strokeStyle = `hsla(${hue}, 60%, 55%, ${alpha * 0.12})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, TAU);
        ctx.stroke();

        // Chevrons
        const chevrons = 7;
        for (let c = 0; c < chevrons; c++) {
            const angle = v.rotation * 0.3 + (c / chevrons) * TAU;
            const cx = v.x + Math.cos(angle) * r;
            const cy = v.y + Math.sin(angle) * r;
            const lit = Math.sin(this.tick * 0.05 + c * 0.8) > 0.3;
            ctx.fillStyle = `hsla(${hue + 30}, 80%, ${lit ? 80 : 40}%, ${alpha * (lit ? 0.2 : 0.05)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, TAU);
            ctx.fill();
        }

        // Event horizon shimmer
        const horizonGrad = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r * 0.85);
        const shimmer = Math.sin(this.tick * 0.04) * 0.5 + 0.5;
        horizonGrad.addColorStop(0, `hsla(${(hue + shimmer * 60) % 360}, 70%, 60%, ${alpha * 0.06})`);
        horizonGrad.addColorStop(0.8, `hsla(${hue}, 80%, 50%, ${alpha * 0.03})`);
        horizonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = horizonGrad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r * 0.85, 0, TAU);
        ctx.fill();
    }

    _drawTesseract(ctx, v, lifeRatio) {
        const hue = (this.hue + v.hueShift + 360) % 360;
        const alpha = lifeRatio * 0.1 * this.intensity;
        const r = v.radius;

        // Rotating 4D projection: nested cubes
        for (let d = 0; d < 3; d++) {
            const rot = v.rotation * (1 + d * 0.3);
            const scale = 1 - d * 0.25;
            const halfR = r * scale;

            ctx.strokeStyle = `hsla(${(hue + d * 30) % 360}, 70%, 65%, ${alpha})`;
            ctx.lineWidth = 1;

            // Rotated square
            ctx.beginPath();
            for (let corner = 0; corner <= 4; corner++) {
                const angle = rot + (corner / 4) * TAU + Math.PI / 4;
                const px = v.x + Math.cos(angle) * halfR;
                const py = v.y + Math.sin(angle) * halfR;
                if (corner === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Connection lines between nested cubes
        ctx.strokeStyle = `hsla(${hue}, 50%, 60%, ${alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        for (let corner = 0; corner < 4; corner++) {
            const innerAngle = v.rotation + (corner / 4) * TAU + Math.PI / 4;
            const outerAngle = v.rotation * 1.6 + (corner / 4) * TAU + Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(v.x + Math.cos(innerAngle) * r * 0.5, v.y + Math.sin(innerAngle) * r * 0.5);
            ctx.lineTo(v.x + Math.cos(outerAngle) * r, v.y + Math.sin(outerAngle) * r);
            ctx.stroke();
        }
    }
}
