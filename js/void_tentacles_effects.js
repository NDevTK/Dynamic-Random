/**
 * @file void_tentacles_effects.js
 * @description Eldritch tentacles that emerge from dimensional tears in the canvas.
 * Clicks create tear points from which tentacles slowly unfurl, reaching toward
 * the cursor with bioluminescent tips. The tentacles use inverse kinematics for
 * natural motion and have procedural suckers/texture along their length.
 *
 * Modes:
 * 0 - Abyss Reach: tentacles emerge from screen edges, reaching inward toward cursor
 * 1 - Tear Points: clicks create dimensional tears from which tentacles spawn
 * 2 - Parasitic: tiny tentacles grow from cursor trail, rooting into the canvas
 * 3 - Kraken: massive central tentacle cluster that slowly rotates and tracks cursor
 * 4 - Mycelial: thin branching tentacles that grow like fungal networks from clicks
 * 5 - Puppet Strings: tentacles hang from top of screen, cursor tangles in them
 */

const TAU = Math.PI * 2;

class TentacleSegment {
    constructor(x, y, len, angle) {
        this.x = x;
        this.y = y;
        this.len = len;
        this.angle = angle;
    }
}

class Tentacle {
    constructor() {
        this.segments = [];
        this.rootX = 0;
        this.rootY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.hue = 0;
        this.thickness = 3;
        this.length = 100;
        this.segmentCount = 10;
        this.growthProgress = 0;
        this.maxGrowth = 1;
        this.growSpeed = 0.01;
        this.idlePhase = 0;
        this.idleSpeed = 0.02;
        this.idleAmplitude = 0.3;
        this.tipGlow = 0;
        this.tipGlowSpeed = 0.05;
        this.suckerSpacing = 3;
        this.alive = true;
        this.life = 600;
        this.maxLife = 600;
        this.branches = [];
    }

    reset(rootX, rootY, hue, thickness, segCount, length) {
        this.rootX = rootX;
        this.rootY = rootY;
        this.hue = hue;
        this.thickness = thickness;
        this.segmentCount = segCount;
        this.length = length;
        this.growthProgress = 0;
        this.alive = true;
        this.life = 400 + Math.floor(Math.random() * 400);
        this.maxLife = this.life;
        this.branches = [];

        const segLen = length / segCount;
        this.segments = [];
        for (let i = 0; i < segCount; i++) {
            this.segments.push(new TentacleSegment(rootX, rootY + i * segLen, segLen, Math.PI / 2));
        }
    }
}

export class VoidTentacles {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 270;
        this.saturation = 70;
        this.tentacles = [];
        this.tentaclePool = [];
        this.maxTentacles = 12;
        this.tears = [];
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._rng = Math.random;
        this._trailPoints = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : 270;
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;

        for (const t of this.tentacles) this.tentaclePool.push(t);
        this.tentacles = [];
        this.tears = [];
        this._trailPoints = [];

        // Pre-spawn for edge modes
        if (this.mode === 0) {
            const count = 4 + Math.floor(rng() * 6);
            const W = window.innerWidth, H = window.innerHeight;
            for (let i = 0; i < count; i++) {
                const edge = Math.floor(rng() * 4);
                let rx, ry;
                if (edge === 0) { rx = rng() * W; ry = -10; }
                else if (edge === 1) { rx = W + 10; ry = rng() * H; }
                else if (edge === 2) { rx = rng() * W; ry = H + 10; }
                else { rx = -10; ry = rng() * H; }
                this._spawnTentacle(rx, ry, rng);
            }
        } else if (this.mode === 3) {
            // Kraken cluster at center
            const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
            const count = 6 + Math.floor(rng() * 4);
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * TAU + rng() * 0.3;
                const dist = 20 + rng() * 30;
                this._spawnTentacle(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, rng);
            }
        } else if (this.mode === 5) {
            // Puppet strings from top
            const count = 8 + Math.floor(rng() * 8);
            for (let i = 0; i < count; i++) {
                const x = (i / count) * window.innerWidth + rng() * 50;
                this._spawnTentacle(x, -5, rng);
            }
        }
    }

    _spawnTentacle(rx, ry, rng) {
        if (this.tentacles.length >= this.maxTentacles) return null;
        const t = this.tentaclePool.length > 0 ? this.tentaclePool.pop() : new Tentacle();
        const segCount = 8 + Math.floor(rng() * 10);
        const length = 80 + rng() * 200;
        const thickness = 1.5 + rng() * 4;
        const hueShift = (rng() - 0.5) * 40;
        t.reset(rx, ry, (this.hue + hueShift + 360) % 360, thickness, segCount, length);
        t.idlePhase = rng() * TAU;
        t.idleSpeed = 0.01 + rng() * 0.03;
        t.idleAmplitude = 0.2 + rng() * 0.5;
        t.growSpeed = 0.005 + rng() * 0.015;
        t.tipGlowSpeed = 0.03 + rng() * 0.05;
        t.suckerSpacing = 2 + Math.floor(rng() * 3);
        this.tentacles.push(t);
        return t;
    }

    // FABRIK inverse kinematics - reach toward target
    _solveIK(tentacle, targetX, targetY) {
        const segs = tentacle.segments;
        if (segs.length === 0) return;

        const visibleCount = Math.ceil(segs.length * tentacle.growthProgress);
        if (visibleCount < 2) return;

        // Forward pass: start from tip, reach toward target
        segs[visibleCount - 1].x = targetX;
        segs[visibleCount - 1].y = targetY;

        for (let i = visibleCount - 2; i >= 0; i--) {
            const dx = segs[i].x - segs[i + 1].x;
            const dy = segs[i].y - segs[i + 1].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            segs[i].x = segs[i + 1].x + (dx / d) * segs[i].len;
            segs[i].y = segs[i + 1].y + (dy / d) * segs[i].len;
        }

        // Backward pass: pin to root
        segs[0].x = tentacle.rootX;
        segs[0].y = tentacle.rootY;

        for (let i = 1; i < visibleCount; i++) {
            const dx = segs[i].x - segs[i - 1].x;
            const dy = segs[i].y - segs[i - 1].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            segs[i].x = segs[i - 1].x + (dx / d) * segs[i - 1].len;
            segs[i].y = segs[i - 1].y + (dy / d) * segs[i - 1].len;
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        // Click detection
        if (isClicking && !this._wasClicking) {
            if (this.mode === 1 || this.mode === 4) {
                this._spawnTentacle(mx, my, this._rng);
                this.tears.push({ x: mx, y: my, life: 120, maxLife: 120 });
            }
        }
        this._wasClicking = isClicking;

        // Parasitic trail
        if (this.mode === 2 && this.tick % 20 === 0) {
            this._trailPoints.push({ x: mx, y: my });
            if (this._trailPoints.length > 30) this._trailPoints.shift();
            if (this.tick % 60 === 0 && this.tentacles.length < this.maxTentacles) {
                this._spawnTentacle(mx, my, this._rng);
            }
        }

        // Update tears
        for (let i = this.tears.length - 1; i >= 0; i--) {
            this.tears[i].life--;
            if (this.tears[i].life <= 0) {
                this.tears[i] = this.tears[this.tears.length - 1];
                this.tears.pop();
            }
        }

        // Update tentacles
        for (let i = this.tentacles.length - 1; i >= 0; i--) {
            const t = this.tentacles[i];

            // Grow
            if (t.growthProgress < t.maxGrowth) {
                t.growthProgress = Math.min(t.maxGrowth, t.growthProgress + t.growSpeed);
            }

            // Age and die (except persistent modes)
            if (this.mode === 1 || this.mode === 2 || this.mode === 4) {
                t.life--;
                if (t.life <= 0) {
                    this.tentaclePool.push(t);
                    this.tentacles[i] = this.tentacles[this.tentacles.length - 1];
                    this.tentacles.pop();
                    continue;
                }
            }

            // Tip glow pulse
            t.tipGlow = (Math.sin(this.tick * t.tipGlowSpeed + t.idlePhase) + 1) * 0.5;

            // Calculate target with idle motion
            const idleOffsetX = Math.sin(this.tick * t.idleSpeed + t.idlePhase) * t.idleAmplitude * 50;
            const idleOffsetY = Math.cos(this.tick * t.idleSpeed * 0.7 + t.idlePhase) * t.idleAmplitude * 40;

            // Distance to cursor
            const dx = mx - t.rootX;
            const dy = my - t.rootY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            let tx, ty;
            if (this.mode === 5) {
                // Puppet strings: hang down, cursor pushes them aside
                const hangY = t.rootY + t.length * t.growthProgress;
                tx = t.rootX + idleOffsetX;
                ty = hangY + idleOffsetY * 0.3;
                if (dist < 200) {
                    const push = (1 - dist / 200) * 80;
                    const angle = Math.atan2(my - t.rootY, mx - t.rootX);
                    tx += Math.cos(angle + Math.PI) * push * 0.3;
                    ty = Math.min(ty, my - 30);
                }
            } else if (dist < t.length * 1.5) {
                // Reach toward cursor
                const reach = Math.min(1, t.length * t.growthProgress / dist);
                tx = t.rootX + dx * reach + idleOffsetX * (1 - reach * 0.5);
                ty = t.rootY + dy * reach + idleOffsetY * (1 - reach * 0.5);
            } else {
                // Idle waving
                const baseAngle = Math.atan2(dy, dx);
                tx = t.rootX + Math.cos(baseAngle) * t.length * 0.6 * t.growthProgress + idleOffsetX;
                ty = t.rootY + Math.sin(baseAngle) * t.length * 0.6 * t.growthProgress + idleOffsetY;
            }

            this._solveIK(t, tx, ty);
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw dimensional tears
        for (const tear of this.tears) {
            const alpha = (tear.life / tear.maxLife) * 0.6;
            const size = (1 - tear.life / tear.maxLife) * 30 + 5;
            ctx.save();
            ctx.translate(tear.x, tear.y);
            ctx.rotate(Math.PI / 4);
            // Tear shape: elongated diamond
            ctx.fillStyle = `hsla(${this.hue + 180}, 90%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.quadraticCurveTo(size * 0.3, 0, 0, size);
            ctx.quadraticCurveTo(-size * 0.3, 0, 0, -size);
            ctx.fill();
            // Inner glow
            ctx.fillStyle = `hsla(${this.hue + 180}, 100%, 95%, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.5);
            ctx.quadraticCurveTo(size * 0.15, 0, 0, size * 0.5);
            ctx.quadraticCurveTo(-size * 0.15, 0, 0, -size * 0.5);
            ctx.fill();
            ctx.restore();
        }

        // Draw tentacles
        for (const t of this.tentacles) {
            const visibleCount = Math.ceil(t.segments.length * t.growthProgress);
            if (visibleCount < 2) continue;

            const lifeAlpha = t.life !== undefined && t.maxLife ?
                Math.min(1, t.life / (t.maxLife * 0.2)) : 1;

            // Main tentacle body
            ctx.beginPath();
            ctx.moveTo(t.segments[0].x, t.segments[0].y);
            for (let i = 1; i < visibleCount; i++) {
                const seg = t.segments[i];
                const prev = t.segments[i - 1];
                ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + seg.x) / 2, (prev.y + seg.y) / 2);
            }

            // Taper thickness
            ctx.lineWidth = t.thickness;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const alpha = 0.3 * lifeAlpha;
            ctx.strokeStyle = `hsla(${t.hue}, ${this.saturation}%, 50%, ${alpha})`;
            ctx.stroke();

            // Inner glow line (thinner, brighter)
            ctx.lineWidth = t.thickness * 0.4;
            ctx.strokeStyle = `hsla(${t.hue}, ${this.saturation}%, 75%, ${alpha * 0.8})`;
            ctx.stroke();

            // Suckers along the tentacle
            for (let i = 1; i < visibleCount; i += t.suckerSpacing) {
                const seg = t.segments[i];
                const progress = i / t.segments.length;
                const suckerSize = t.thickness * (1 - progress * 0.6) * 0.6;
                const suckerAlpha = alpha * (1 - progress * 0.5) * 0.5;
                ctx.fillStyle = `hsla(${t.hue + 20}, ${this.saturation}%, 65%, ${suckerAlpha})`;
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, suckerSize, 0, TAU);
                ctx.fill();
            }

            // Bioluminescent tip glow
            if (visibleCount > 1) {
                const tip = t.segments[visibleCount - 1];
                const glowSize = 8 + t.tipGlow * 12;
                const glowAlpha = (0.15 + t.tipGlow * 0.2) * lifeAlpha;
                const grad = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, glowSize);
                grad.addColorStop(0, `hsla(${(t.hue + 60) % 360}, 100%, 85%, ${glowAlpha})`);
                grad.addColorStop(0.5, `hsla(${(t.hue + 30) % 360}, 90%, 65%, ${glowAlpha * 0.4})`);
                grad.addColorStop(1, `hsla(${t.hue}, 80%, 50%, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, glowSize, 0, TAU);
                ctx.fill();
            }
        }

        // Mycelial mode: draw branching connections
        if (this.mode === 4) {
            ctx.lineWidth = 0.5;
            for (let i = 0; i < this.tentacles.length; i++) {
                for (let j = i + 1; j < this.tentacles.length; j++) {
                    const a = this.tentacles[i], b = this.tentacles[j];
                    const tipA = a.segments[Math.ceil(a.segments.length * a.growthProgress) - 1];
                    const tipB = b.segments[Math.ceil(b.segments.length * b.growthProgress) - 1];
                    if (!tipA || !tipB) continue;
                    const dx = tipA.x - tipB.x, dy = tipA.y - tipB.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 150) {
                        const alpha = (1 - d / 150) * 0.15;
                        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(tipA.x, tipA.y);
                        // Organic curve
                        const midX = (tipA.x + tipB.x) / 2 + Math.sin(this.tick * 0.02) * 20;
                        const midY = (tipA.y + tipB.y) / 2 + Math.cos(this.tick * 0.02) * 20;
                        ctx.quadraticCurveTo(midX, midY, tipB.x, tipB.y);
                        ctx.stroke();
                    }
                }
            }
        }

        ctx.restore();
    }
}
