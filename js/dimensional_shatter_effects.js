/**
 * @file dimensional_shatter_effects.js
 * @description Interactive effect: clicking causes the screen to visually
 * "shatter" into geometric shards that fly outward, rotate, and fade.
 * Shards vary by seed: triangular, rectangular, hexagonal, or crystalline.
 * Mouse proximity causes nearby shards to wobble and glow. Moving the
 * mouse fast creates a trail of micro-fractures. Cracks are pre-computed
 * at spawn time (not re-randomized each draw frame) for stability.
 *
 * Seed controls: shard shape, explosion force, shard count per click,
 * rotation speed, color tint per shard, gravity on falling shards,
 * reassembly behavior (fade vs shrink+spin vs fall vs dissolve), and
 * crack style (lightning/straight/branching/web).
 */

export class DimensionalShatter {
    constructor() {
        this.shards = [];
        this.shardPool = [];
        this.cracks = [];
        this.crackPool = [];
        this.maxShards = 80;
        this.maxCracks = 40;
        this.shardShape = 0;
        this.explosionForce = 5;
        this.shardGravity = 0.05;
        this.reassemblyStyle = 0;
        this.palette = [];
        this._clickRegistered = false;
        this._tick = 0;
        this._lastMx = 0;
        this._lastMy = 0;
    }

    configure(rng, palette) {
        this.shardShape = Math.floor(rng() * 4);
        this.explosionForce = 3 + rng() * 8;
        this.shardGravity = 0.02 + rng() * 0.06;
        this.reassemblyStyle = Math.floor(rng() * 4);
        this.shardsPerClick = 8 + Math.floor(rng() * 12);
        this.rotationSpeed = 0.02 + rng() * 0.08;
        this.crackStyle = Math.floor(rng() * 4);
        // Mouse proximity effect distance squared (avoid sqrt in update)
        this.wobbleDistSq = 80 * 80;
        // Shard edge glow intensity varies per seed
        this.edgeGlow = 0.3 + rng() * 0.5;
        // Screen flash on click
        this.flashIntensity = 0.05 + rng() * 0.1;

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 60 + rng() * 30, l: 50 + rng() * 30 },
            { h: rng() * 360, s: 50 + rng() * 40, l: 55 + rng() * 25 },
        ];

        this.shards = [];
        this.shardPool = [];
        this.cracks = [];
        this.crackPool = [];
    }

    // Deterministic per-tick pseudo-random
    _prand(seed) {
        return ((seed * 2654435761) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this._tick++;

        const dx = mx - this._lastMx;
        const dy = my - this._lastMy;
        const speedSq = dx * dx + dy * dy;

        // Fast mouse creates micro-cracks (speed > 15 => speedSq > 225)
        if (speedSq > 225 && this.cracks.length < this.maxCracks) {
            const speed = Math.sqrt(speedSq);
            let crack = this.crackPool.length > 0 ? this.crackPool.pop() : {};
            crack.x = mx;
            crack.y = my;
            crack.life = 1.0;
            crack.angle = Math.atan2(dy, dx);
            crack.length = 20 + speed * 1.5;
            // Pre-compute crack geometry at spawn time (stable rendering)
            crack.segments = this._buildCrackGeometry(crack);
            this.cracks.push(crack);
        }

        // Click creates shatter explosion
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            this._shatterFlash = this.flashIntensity;
            const count = Math.min(this.shardsPerClick, this.maxShards - this.shards.length);
            const t = this._tick;
            for (let i = 0; i < count; i++) {
                let shard = this.shardPool.length > 0 ? this.shardPool.pop() : {};
                const pr1 = this._prand(t * 7 + i * 31);
                const pr2 = this._prand(t * 13 + i * 47);
                const pr3 = this._prand(t * 19 + i * 61);
                const angle = (i / count) * Math.PI * 2 + (pr1 - 0.5) * 0.5;
                const force = this.explosionForce * (0.5 + pr2 * 0.8);
                shard.x = mx + Math.cos(angle) * (5 + pr3 * 15);
                shard.y = my + Math.sin(angle) * (5 + pr3 * 15);
                shard.vx = Math.cos(angle) * force;
                shard.vy = Math.sin(angle) * force;
                shard.rotation = pr1 * Math.PI * 2;
                shard.rotSpeed = (pr2 - 0.5) * this.rotationSpeed;
                shard.size = 8 + pr3 * 20;
                shard.life = 1.0;
                shard.decay = 0.005 + pr1 * 0.01;
                shard.colorIdx = i % this.palette.length;
                shard.shapeType = this.shardShape === 3
                    ? Math.floor(pr2 * 3)
                    : this.shardShape;
                shard.vertices = this._generateVertices(shard.shapeType, shard.size, t + i);
                this.shards.push(shard);
            }

            // Big cracks at click point
            for (let i = 0; i < 3 && this.cracks.length < this.maxCracks; i++) {
                let crack = this.crackPool.length > 0 ? this.crackPool.pop() : {};
                const pr = this._prand(t * 41 + i * 71);
                crack.x = mx;
                crack.y = my;
                crack.life = 1.0;
                crack.angle = (i / 3) * Math.PI * 2 + pr * 0.5;
                crack.length = 50 + pr * 80;
                crack.segments = this._buildCrackGeometry(crack);
                this.cracks.push(crack);
            }
        }
        if (!isClicking) this._clickRegistered = false;

        // Decay flash
        if (this._shatterFlash > 0) this._shatterFlash *= 0.85;

        // Update shards
        for (let i = this.shards.length - 1; i >= 0; i--) {
            const s = this.shards[i];
            s.x += s.vx;
            s.y += s.vy;
            s.rotation += s.rotSpeed;
            s.life -= s.decay;

            if (this.reassemblyStyle === 2) {
                s.vy += this.shardGravity;
            } else {
                s.vx *= 0.97;
                s.vy *= 0.97;
            }

            // Mouse proximity wobble (use distSq to avoid sqrt)
            const sdx = mx - s.x;
            const sdy = my - s.y;
            if (sdx * sdx + sdy * sdy < this.wobbleDistSq) {
                s.rotSpeed += (this._prand(this._tick + i * 3) - 0.5) * 0.01;
            }

            if (s.life <= 0 || s.y > window.innerHeight + 50) {
                if (this.shardPool.length < this.maxShards) this.shardPool.push(s);
                this.shards[i] = this.shards[this.shards.length - 1];
                this.shards.pop();
            }
        }

        // Decay cracks
        for (let i = this.cracks.length - 1; i >= 0; i--) {
            this.cracks[i].life -= 0.015;
            if (this.cracks[i].life <= 0) {
                if (this.crackPool.length < this.maxCracks) this.crackPool.push(this.cracks[i]);
                this.cracks[i] = this.cracks[this.cracks.length - 1];
                this.cracks.pop();
            }
        }

        this._lastMx = mx;
        this._lastMy = my;
    }

    _generateVertices(shapeType, size, seed) {
        const verts = [];
        if (shapeType === 0) {
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 + (this._prand(seed + i * 17) - 0.5) * 0.4;
                const r = size * (0.7 + this._prand(seed + i * 23) * 0.3);
                verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
        } else if (shapeType === 1) {
            const pr1 = this._prand(seed + 1);
            const pr2 = this._prand(seed + 2);
            const pr3 = this._prand(seed + 3);
            const w = size * (0.5 + pr1 * 0.5);
            const h = size * (0.3 + pr2 * 0.7);
            const skew = (pr3 - 0.5) * w * 0.3;
            verts.push({ x: -w / 2 + skew, y: -h / 2 });
            verts.push({ x: w / 2 + skew, y: -h / 2 });
            verts.push({ x: w / 2 - skew, y: h / 2 });
            verts.push({ x: -w / 2 - skew, y: h / 2 });
        } else {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const r = size * (0.8 + this._prand(seed + i * 11) * 0.2) * 0.6;
                verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
        }
        return verts;
    }

    // Pre-compute crack line segments at spawn time for stable rendering
    _buildCrackGeometry(crack) {
        const segs = [];
        const cos = Math.cos(crack.angle);
        const sin = Math.sin(crack.angle);

        if (this.crackStyle === 0) {
            // Lightning-style jagged — deterministic offsets baked in
            let cx = crack.x, cy = crack.y;
            segs.push({ x: cx, y: cy });
            const steps = 6;
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const pr = this._prand(this._tick * 7 + s * 53 + crack.x | 0);
                cx = crack.x + cos * crack.length * t + (pr - 0.5) * 16;
                cy = crack.y + sin * crack.length * t + (this._prand(this._tick * 11 + s * 29) - 0.5) * 16;
                segs.push({ x: cx, y: cy });
            }
        } else {
            segs.push({ x: crack.x, y: crack.y });
            segs.push({ x: crack.x + cos * crack.length, y: crack.y + sin * crack.length });
        }

        // Branches
        const branchCount = this.crackStyle === 2 ? 2 + Math.floor(this._prand(this._tick * 43) * 3) :
            this.crackStyle === 3 ? 3 + Math.floor(this._prand(this._tick * 47) * 3) : 1;
        const branches = [];
        for (let i = 0; i < branchCount; i++) {
            const pr = this._prand(this._tick * 61 + i * 37);
            const pr2 = this._prand(this._tick * 67 + i * 41);
            const bAngle = crack.angle + (pr - 0.5) * 1.5;
            const bLen = crack.length * (0.3 + pr2 * 0.5);
            const startT = 0.3 + pr * 0.5;
            const sx = crack.x + cos * crack.length * startT;
            const sy = crack.y + sin * crack.length * startT;
            branches.push({ sx, sy, ex: sx + Math.cos(bAngle) * bLen, ey: sy + Math.sin(bAngle) * bLen });
        }

        return { main: segs, branches };
    }

    draw(ctx) {
        // Screen flash
        if (this._shatterFlash > 0.005) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const c = this.palette[0];
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, 90%, ${this._shatterFlash})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }

        // Draw cracks
        if (this.cracks.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const crack of this.cracks) {
                const alpha = crack.life * 0.5;
                if (alpha < 0.01) continue;
                const c = this.palette[0];
                const geom = crack.segments;

                // Main crack line
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, ${alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(geom.main[0].x, geom.main[0].y);
                for (let s = 1; s < geom.main.length; s++) {
                    ctx.lineTo(geom.main[s].x, geom.main[s].y);
                }
                ctx.stroke();

                // Bright core line
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, 95%, ${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Branches
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, ${alpha * 0.7})`;
                ctx.lineWidth = 1;
                for (const b of geom.branches) {
                    ctx.beginPath();
                    ctx.moveTo(b.sx, b.sy);
                    ctx.lineTo(b.ex, b.ey);
                    ctx.stroke();
                }
            }
        }

        // Draw shards
        if (this.shards.length > 0) {
            for (const shard of this.shards) {
                if (shard.life <= 0.01) continue;

                const c = this.palette[shard.colorIdx];
                let scale = 1;
                let alpha = shard.life;

                if (this.reassemblyStyle === 1) {
                    scale = shard.life;
                } else if (this.reassemblyStyle === 3) {
                    scale = 0.5 + shard.life * 0.5;
                }

                ctx.save();
                ctx.translate(shard.x, shard.y);
                ctx.rotate(shard.rotation);
                ctx.scale(scale, scale);

                const v = shard.vertices;
                ctx.beginPath();
                ctx.moveTo(v[0].x, v[0].y);
                for (let i = 1; i < v.length; i++) {
                    ctx.lineTo(v[i].x, v[i].y);
                }
                ctx.closePath();

                // Fill
                ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.3})`;
                ctx.fill();

                // Bright edge
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 15}%, ${alpha * this.edgeGlow})`;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Glow for fresh shards
                if (shard.life > 0.7) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, ${(shard.life - 0.7) * 0.5})`;
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                }

                ctx.restore();
            }
        }

        ctx.globalCompositeOperation = 'source-over';
    }
}
