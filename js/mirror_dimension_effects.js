/**
 * @file mirror_dimension_effects.js
 * @description Reality fractures into kaleidoscopic mirror segments around the cursor.
 * Geometric reflection planes rotate and tile, creating mesmerizing symmetry patterns.
 * Mouse movement controls the rotation and complexity. Clicking shatters/reforms the mirror.
 *
 * Modes:
 * 0 - Classic Kaleidoscope: N-fold radial symmetry with rotating mirror planes
 * 1 - Shattered Glass: Voronoi-like fractured panes that shift and reflect
 * 2 - Infinite Corridor: Recursive tunnel of shrinking reflected frames
 * 3 - Prism Split: Light rays split into spectral fans that follow the cursor
 * 4 - Mandala Weaver: Geometric mandala that builds from cursor movement patterns
 * 5 - Dimensional Tear: Reality peels back in strips revealing mirrored layers beneath
 */

const TAU = Math.PI * 2;

export class MirrorDimension {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Kaleidoscope
        this._segments = 6;
        this._rotation = 0;
        this._rotSpeed = 0;
        this._targetRot = 0;

        // Shattered glass panes
        this._shards = [];
        this._shatterProgress = 0;

        // Infinite corridor frames
        this._frames = [];
        this._corridorDepth = 8;

        // Prism rays
        this._rays = [];
        this._maxRays = 30;

        // Mandala points
        this._mandalaPoints = [];
        this._mandalaRings = [];
        this._maxMandalaPoints = 200;

        // Dimensional tears
        this._tears = [];
        this._tearPool = [];

        // Shared
        this._centerX = 0;
        this._centerY = 0;
        this._breathe = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.5 + rng() * 0.5;
        this._rotation = 0;
        this._rotSpeed = 0;
        this._shards = [];
        this._frames = [];
        this._rays = [];
        this._mandalaPoints = [];
        this._mandalaRings = [];
        this._tears = [];
        this._shatterProgress = 0;

        const W = window.innerWidth, H = window.innerHeight;
        this._centerX = W / 2;
        this._centerY = H / 2;

        switch (this.mode) {
            case 0: // Kaleidoscope
                this._segments = 4 + Math.floor(rng() * 9); // 4-12 fold symmetry
                this._rotSpeed = 0.001 + rng() * 0.003;
                break;
            case 1: // Shattered Glass
                this._generateShards(rng, W, H);
                break;
            case 2: // Infinite Corridor
                this._corridorDepth = 6 + Math.floor(rng() * 6);
                for (let i = 0; i < this._corridorDepth; i++) {
                    this._frames.push({
                        scale: 1 - (i / this._corridorDepth) * 0.8,
                        rotation: i * (rng() * 0.1 - 0.05),
                        hueShift: i * (15 + rng() * 20),
                        wobblePhase: rng() * TAU,
                        wobbleSpeed: 0.01 + rng() * 0.02,
                        wobbleAmount: 2 + rng() * 5,
                    });
                }
                break;
            case 3: // Prism Split
                this._maxRays = 15 + Math.floor(rng() * 20);
                break;
            case 4: // Mandala Weaver
                this._segments = 6 + Math.floor(rng() * 10);
                break;
            case 5: // Dimensional Tear
                break;
        }
    }

    _generateShards(rng, W, H) {
        // Generate Voronoi-like shards using random seed points
        const pointCount = 8 + Math.floor(rng() * 8);
        const seeds = [];
        for (let i = 0; i < pointCount; i++) {
            seeds.push({ x: rng() * W, y: rng() * H });
        }
        // Create shards as convex regions (simplified: circles around seed points)
        for (let i = 0; i < pointCount; i++) {
            let minDist = Infinity;
            for (let j = 0; j < pointCount; j++) {
                if (i === j) continue;
                const dx = seeds[i].x - seeds[j].x;
                const dy = seeds[i].y - seeds[j].y;
                minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
            }
            this._shards.push({
                cx: seeds[i].x, cy: seeds[i].y,
                radius: minDist * 0.45,
                rotation: rng() * 0.2 - 0.1,
                targetRotation: 0,
                hueOffset: rng() * 60 - 30,
                velocity: 0,
                sides: 4 + Math.floor(rng() * 4),
            });
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx; this._pmy = this._my;
        this._mx = mx; this._my = my;
        const dx = mx - this._pmx, dy = my - this._pmy;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._breathe = Math.sin(this.tick * 0.015) * 0.5 + 0.5;

        if (this.mode === 0) {
            // Kaleidoscope: rotation follows mouse angle
            const angle = Math.atan2(my - this._centerY, mx - this._centerX);
            this._targetRot = angle * 0.3;
            this._rotation += (this._targetRot - this._rotation) * 0.05;
            this._rotation += this._rotSpeed;
        } else if (this.mode === 1) {
            // Shattered glass: shards shift based on cursor proximity
            for (const shard of this._shards) {
                const sdx = mx - shard.cx, sdy = my - shard.cy;
                const dist = Math.sqrt(sdx * sdx + sdy * sdy);
                if (dist < shard.radius * 2) {
                    const influence = 1 - dist / (shard.radius * 2);
                    shard.targetRotation = influence * 0.3 * Math.sign(sdx);
                } else {
                    shard.targetRotation = 0;
                }
                shard.velocity += (shard.targetRotation - shard.rotation) * 0.05;
                shard.velocity *= 0.9;
                shard.rotation += shard.velocity;
            }
            if (isClicking && !this._wasClicking) {
                this._shatterProgress = 1;
            }
            this._shatterProgress *= 0.97;
        } else if (this.mode === 2) {
            // Infinite corridor: frames wobble
            for (const frame of this._frames) {
                frame.wobblePhase += frame.wobbleSpeed;
            }
        } else if (this.mode === 3) {
            // Prism: spawn rays from cursor
            if (this._mouseSpeed > 2 && this._rays.length < this._maxRays) {
                const angle = Math.atan2(dy, dx);
                const spread = TAU / 7; // Spectral spread
                for (let i = 0; i < 7 && this._rays.length < this._maxRays; i++) {
                    this._rays.push({
                        x: mx, y: my,
                        angle: angle + (i - 3) * spread * 0.15,
                        speed: 3 + Math.random() * 4,
                        hue: (this.hue + i * 51) % 360, // Spectral colors
                        life: 1.0,
                        width: 1 + Math.random() * 2,
                        length: 20 + Math.random() * 40,
                    });
                }
            }
            // Update rays
            for (let i = this._rays.length - 1; i >= 0; i--) {
                const r = this._rays[i];
                r.x += Math.cos(r.angle) * r.speed;
                r.y += Math.sin(r.angle) * r.speed;
                r.life -= 0.015;
                if (r.life <= 0 || r.x < -50 || r.x > window.innerWidth + 50 ||
                    r.y < -50 || r.y > window.innerHeight + 50) {
                    this._rays[i] = this._rays[this._rays.length - 1];
                    this._rays.pop();
                }
            }
        } else if (this.mode === 4) {
            // Mandala: record cursor positions and symmetrize
            if (this._mouseSpeed > 1 && this.tick % 2 === 0) {
                if (this._mandalaPoints.length < this._maxMandalaPoints) {
                    this._mandalaPoints.push({
                        dx: mx - this._centerX,
                        dy: my - this._centerY,
                        life: 1.0,
                        hue: (this.hue + this.tick * 0.5) % 360,
                        size: 1 + this._mouseSpeed * 0.2,
                    });
                }
            }
            // Decay mandala points
            for (let i = this._mandalaPoints.length - 1; i >= 0; i--) {
                this._mandalaPoints[i].life -= 0.002;
                if (this._mandalaPoints[i].life <= 0) {
                    this._mandalaPoints[i] = this._mandalaPoints[this._mandalaPoints.length - 1];
                    this._mandalaPoints.pop();
                }
            }
            // Click creates a ring
            if (isClicking && !this._wasClicking) {
                const dist = Math.sqrt((mx - this._centerX) ** 2 + (my - this._centerY) ** 2);
                this._mandalaRings.push({
                    radius: dist, life: 1.0, hue: (this.hue + this.tick) % 360
                });
            }
            for (let i = this._mandalaRings.length - 1; i >= 0; i--) {
                this._mandalaRings[i].life -= 0.005;
                if (this._mandalaRings[i].life <= 0) {
                    this._mandalaRings[i] = this._mandalaRings[this._mandalaRings.length - 1];
                    this._mandalaRings.pop();
                }
            }
        } else if (this.mode === 5) {
            // Dimensional tears
            if (this._mouseSpeed > 5 && this.tick % 8 === 0) {
                const tear = this._tearPool.length > 0 ? this._tearPool.pop() : {};
                tear.x = mx; tear.y = my;
                tear.angle = Math.atan2(dy, dx);
                tear.width = 5 + this._mouseSpeed * 0.5;
                tear.length = 20 + this._mouseSpeed * 2;
                tear.life = 1.0;
                tear.hue = (this.hue + Math.random() * 40) % 360;
                tear.peelAmount = 0;
                this._tears.push(tear);
            }
            for (let i = this._tears.length - 1; i >= 0; i--) {
                const t = this._tears[i];
                t.peelAmount = Math.min(1, t.peelAmount + 0.03);
                t.life -= 0.008;
                if (t.life <= 0) {
                    this._tearPool.push(t);
                    this._tears[i] = this._tears[this._tears.length - 1];
                    this._tears.pop();
                }
            }
        }

        this._wasClicking = isClicking;
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.mode === 0) this._drawKaleidoscope(ctx, system);
        else if (this.mode === 1) this._drawShatteredGlass(ctx, system);
        else if (this.mode === 2) this._drawInfiniteCorridor(ctx, system);
        else if (this.mode === 3) this._drawPrismSplit(ctx, system);
        else if (this.mode === 4) this._drawMandala(ctx, system);
        else if (this.mode === 5) this._drawDimensionalTear(ctx, system);

        ctx.restore();
    }

    _drawKaleidoscope(ctx, system) {
        const cx = this._mx, cy = this._my;
        const dist = Math.sqrt((cx - this._centerX) ** 2 + (cy - this._centerY) ** 2);
        const maxR = Math.min(system.width, system.height) * 0.4;
        const r = Math.min(maxR, 50 + dist * 0.5 + this._breathe * 30);
        const n = this._segments;

        for (let i = 0; i < n; i++) {
            const angle = this._rotation + (i / n) * TAU;
            const nextAngle = this._rotation + ((i + 1) / n) * TAU;
            const hue = (this.hue + i * (360 / n)) % 360;
            const alpha = (0.04 + this._breathe * 0.03) * this.intensity;

            // Filled segment
            ctx.fillStyle = `hsla(${hue}, 60%, 55%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle, nextAngle);
            ctx.closePath();
            ctx.fill();

            // Segment edge lines
            ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${alpha * 2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
            ctx.stroke();

            // Inner decorative ring
            const innerR = r * 0.6;
            const midAngle = angle + (nextAngle - angle) / 2;
            const dotX = cx + Math.cos(midAngle) * innerR;
            const dotY = cy + Math.sin(midAngle) * innerR;
            ctx.fillStyle = `hsla(${(hue + 60) % 360}, 80%, 75%, ${alpha * 1.5})`;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 2 + this._breathe * 2, 0, TAU);
            ctx.fill();
        }

        // Central point
        ctx.fillStyle = `hsla(${this.hue}, 50%, 90%, ${0.15 * this.intensity})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, TAU);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = `hsla(${this.hue}, 60%, 70%, ${0.06 * this.intensity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
    }

    _drawShatteredGlass(ctx, system) {
        for (const shard of this._shards) {
            const alpha = 0.06 * this.intensity;
            const hue = (this.hue + shard.hueOffset + 360) % 360;
            const shatterOffset = this._shatterProgress * 20;

            ctx.save();
            ctx.translate(shard.cx, shard.cy);
            ctx.rotate(shard.rotation);

            // Shard face
            ctx.fillStyle = `hsla(${hue}, 50%, 50%, ${alpha})`;
            ctx.beginPath();
            for (let s = 0; s <= shard.sides; s++) {
                const a = (s / shard.sides) * TAU;
                const r = shard.radius + Math.sin(a * 3 + this.tick * 0.01) * 5;
                const px = Math.cos(a) * (r + shatterOffset);
                const py = Math.sin(a) * (r + shatterOffset);
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Reflection highlight
            ctx.strokeStyle = `hsla(${hue}, 70%, 80%, ${alpha * 2})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Glass reflection line
            const reflectAngle = Math.atan2(this._my - shard.cy, this._mx - shard.cx) - shard.rotation;
            const reflLen = shard.radius * 0.6;
            ctx.strokeStyle = `hsla(${hue + 30}, 30%, 90%, ${alpha * 1.5})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(reflectAngle) * -reflLen, Math.sin(reflectAngle) * -reflLen);
            ctx.lineTo(Math.cos(reflectAngle) * reflLen, Math.sin(reflectAngle) * reflLen);
            ctx.stroke();

            ctx.restore();
        }
    }

    _drawInfiniteCorridor(ctx, system) {
        const cx = this._mx, cy = this._my;

        for (let i = this._frames.length - 1; i >= 0; i--) {
            const frame = this._frames[i];
            const scale = frame.scale;
            const wobX = Math.sin(frame.wobblePhase) * frame.wobbleAmount;
            const wobY = Math.cos(frame.wobblePhase * 0.7) * frame.wobbleAmount;
            const hue = (this.hue + frame.hueShift) % 360;
            const alpha = (0.03 + (1 - scale) * 0.04) * this.intensity;
            const hw = system.width * scale * 0.4;
            const hh = system.height * scale * 0.4;

            ctx.save();
            ctx.translate(cx + wobX, cy + wobY);
            ctx.rotate(frame.rotation + this.tick * 0.001);

            ctx.strokeStyle = `hsla(${hue}, 60%, 65%, ${alpha})`;
            ctx.lineWidth = 1 + (1 - scale) * 2;
            ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);

            // Corner highlights
            const cornerSize = 8 * scale;
            ctx.fillStyle = `hsla(${hue}, 80%, 80%, ${alpha * 1.5})`;
            ctx.fillRect(-hw, -hh, cornerSize, cornerSize);
            ctx.fillRect(hw - cornerSize, -hh, cornerSize, cornerSize);
            ctx.fillRect(-hw, hh - cornerSize, cornerSize, cornerSize);
            ctx.fillRect(hw - cornerSize, hh - cornerSize, cornerSize, cornerSize);

            ctx.restore();
        }

        // Connecting lines between frames
        if (this._frames.length > 1) {
            ctx.strokeStyle = `hsla(${this.hue}, 40%, 60%, 0.02)`;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < this._frames.length - 1; i++) {
                const f1 = this._frames[i], f2 = this._frames[i + 1];
                const w1 = system.width * f1.scale * 0.4;
                const w2 = system.width * f2.scale * 0.4;
                const h1 = system.height * f1.scale * 0.4;
                const h2 = system.height * f2.scale * 0.4;
                ctx.beginPath();
                ctx.moveTo(cx - w1, cy - h1);
                ctx.lineTo(cx - w2, cy - h2);
                ctx.moveTo(cx + w1, cy - h1);
                ctx.lineTo(cx + w2, cy - h2);
                ctx.moveTo(cx - w1, cy + h1);
                ctx.lineTo(cx - w2, cy + h2);
                ctx.moveTo(cx + w1, cy + h1);
                ctx.lineTo(cx + w2, cy + h2);
                ctx.stroke();
            }
        }
    }

    _drawPrismSplit(ctx, system) {
        // Draw prism at cursor
        const prismSize = 15;
        const alpha = 0.1 * this.intensity;
        ctx.fillStyle = `hsla(${this.hue}, 30%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(this._mx, this._my - prismSize);
        ctx.lineTo(this._mx - prismSize, this._my + prismSize);
        ctx.lineTo(this._mx + prismSize, this._my + prismSize);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `hsla(${this.hue}, 50%, 90%, ${alpha * 2})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw rays
        for (const r of this._rays) {
            const rAlpha = r.life * 0.15 * this.intensity;
            const endX = r.x + Math.cos(r.angle) * r.length;
            const endY = r.y + Math.sin(r.angle) * r.length;

            // Glow
            ctx.strokeStyle = `hsla(${r.hue}, 90%, 70%, ${rAlpha * 0.3})`;
            ctx.lineWidth = r.width * 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Core
            ctx.strokeStyle = `hsla(${r.hue}, 95%, 80%, ${rAlpha})`;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    _drawMandala(ctx, system) {
        const cx = this._centerX, cy = this._centerY;
        const n = this._segments;

        // Draw mandala rings
        for (const ring of this._mandalaRings) {
            const alpha = ring.life * 0.08 * this.intensity;
            ctx.strokeStyle = `hsla(${ring.hue}, 60%, 65%, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, ring.radius, 0, TAU);
            ctx.stroke();
        }

        // Draw symmetrized mandala points
        for (const p of this._mandalaPoints) {
            const alpha = p.life * 0.08 * this.intensity;
            const dist = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
            const baseAngle = Math.atan2(p.dy, p.dx);

            for (let i = 0; i < n; i++) {
                const angle = baseAngle + (i / n) * TAU;
                const px = cx + Math.cos(angle) * dist;
                const py = cy + Math.sin(angle) * dist;
                ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(px, py, p.size, 0, TAU);
                ctx.fill();

                // Mirror reflection
                const mirrorAngle = -baseAngle + (i / n) * TAU;
                const mpx = cx + Math.cos(mirrorAngle) * dist;
                const mpy = cy + Math.sin(mirrorAngle) * dist;
                ctx.fillStyle = `hsla(${(p.hue + 30) % 360}, 70%, 65%, ${alpha * 0.6})`;
                ctx.beginPath();
                ctx.arc(mpx, mpy, p.size * 0.7, 0, TAU);
                ctx.fill();
            }
        }
    }

    _drawDimensionalTear(ctx, system) {
        for (const t of this._tears) {
            const alpha = t.life * 0.2 * this.intensity;
            const peel = t.peelAmount;

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);

            // The tear line
            ctx.strokeStyle = `hsla(${t.hue}, 80%, 85%, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-t.length / 2, 0);
            ctx.lineTo(t.length / 2, 0);
            ctx.stroke();

            // Peeled-back layer
            const peelH = t.width * peel;
            ctx.fillStyle = `hsla(${(t.hue + 180) % 360}, 60%, 50%, ${alpha * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(-t.length / 2, 0);
            ctx.quadraticCurveTo(0, -peelH, t.length / 2, 0);
            ctx.fill();

            // Bottom peel
            ctx.fillStyle = `hsla(${(t.hue + 90) % 360}, 60%, 50%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(-t.length / 2, 0);
            ctx.quadraticCurveTo(0, peelH, t.length / 2, 0);
            ctx.fill();

            // Bright edge glow
            ctx.strokeStyle = `hsla(${t.hue}, 90%, 90%, ${alpha * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(-t.length / 2, 0);
            ctx.quadraticCurveTo(0, -peelH, t.length / 2, 0);
            ctx.stroke();

            ctx.restore();
        }
    }
}
