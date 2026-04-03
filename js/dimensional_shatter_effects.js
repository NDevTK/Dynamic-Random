/**
 * @file dimensional_shatter_effects.js
 * @description Interactive effect: clicking causes the screen to visually
 * "shatter" into geometric shards that fly outward, rotate, and fade.
 * Each shard reflects a tinted version of its origin. Shards vary by seed:
 * triangular, rectangular, hexagonal, or crystalline. Mouse proximity
 * causes nearby shards to wobble and glow. Moving the mouse fast creates
 * a trail of micro-fractures.
 *
 * Seed controls: shard shape, explosion force, shard count per click,
 * rotation speed, color tint per shard, gravity on falling shards,
 * reassembly behavior (fade vs snap-back vs dissolve), and crack style.
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
        // Shard shape: 0=triangles, 1=rectangles, 2=hexagons, 3=mixed
        this.shardShape = Math.floor(rng() * 4);
        this.explosionForce = 3 + rng() * 8;
        this.shardGravity = 0.02 + rng() * 0.06;
        // Reassembly: 0=fade out, 1=shrink+spin, 2=fall off screen, 3=dissolve into sparks
        this.reassemblyStyle = Math.floor(rng() * 4);
        this.shardsPerClick = 8 + Math.floor(rng() * 12);
        this.rotationSpeed = 0.02 + rng() * 0.08;
        // Crack style: 0=lightning, 1=straight lines, 2=branching, 3=web
        this.crackStyle = Math.floor(rng() * 4);

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 60 + rng() * 30, l: 50 + rng() * 30 },
            { h: rng() * 360, s: 50 + rng() * 40, l: 55 + rng() * 25 },
        ];

        this.shards = [];
        this.shardPool = [];
        this.cracks = [];
        this.crackPool = [];
    }

    update(mx, my, isClicking) {
        this._tick++;

        const dx = mx - this._lastMx;
        const dy = my - this._lastMy;
        const speed = Math.sqrt(dx * dx + dy * dy);

        // Fast mouse creates micro-cracks
        if (speed > 15 && this.cracks.length < this.maxCracks) {
            let crack = this.crackPool.length > 0 ? this.crackPool.pop() : {};
            crack.x = mx;
            crack.y = my;
            crack.life = 1.0;
            crack.angle = Math.atan2(dy, dx);
            crack.length = 20 + speed * 1.5;
            crack.branches = this._generateCrackBranches(crack, speed);
            this.cracks.push(crack);
        }

        // Click creates shatter explosion
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            const count = Math.min(this.shardsPerClick, this.maxShards - this.shards.length);
            for (let i = 0; i < count; i++) {
                let shard = this.shardPool.length > 0 ? this.shardPool.pop() : {};
                const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                const force = this.explosionForce * (0.5 + Math.random() * 0.8);
                shard.x = mx + Math.cos(angle) * (5 + Math.random() * 15);
                shard.y = my + Math.sin(angle) * (5 + Math.random() * 15);
                shard.vx = Math.cos(angle) * force;
                shard.vy = Math.sin(angle) * force;
                shard.rotation = Math.random() * Math.PI * 2;
                shard.rotSpeed = (Math.random() - 0.5) * this.rotationSpeed;
                shard.size = 8 + Math.random() * 20;
                shard.life = 1.0;
                shard.decay = 0.005 + Math.random() * 0.01;
                shard.colorIdx = Math.floor(Math.random() * this.palette.length);
                shard.shapeType = this.shardShape === 3
                    ? Math.floor(Math.random() * 3)
                    : this.shardShape;
                shard.vertices = this._generateVertices(shard.shapeType, shard.size);
                this.shards.push(shard);
            }

            // Big crack at click point
            if (this.cracks.length < this.maxCracks) {
                for (let i = 0; i < 3; i++) {
                    let crack = this.crackPool.length > 0 ? this.crackPool.pop() : {};
                    crack.x = mx;
                    crack.y = my;
                    crack.life = 1.0;
                    crack.angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
                    crack.length = 50 + Math.random() * 80;
                    crack.branches = this._generateCrackBranches(crack, 30);
                    this.cracks.push(crack);
                }
            }
        }
        if (!isClicking) this._clickRegistered = false;

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

            // Mouse proximity wobble
            const sdx = mx - s.x;
            const sdy = my - s.y;
            const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sdist < 80) {
                s.rotSpeed += (Math.random() - 0.5) * 0.01;
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

    _generateVertices(shapeType, size) {
        const verts = [];
        if (shapeType === 0) {
            // Triangle with random wobble
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                const r = size * (0.7 + Math.random() * 0.3);
                verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
        } else if (shapeType === 1) {
            // Rectangle/parallelogram
            const w = size * (0.5 + Math.random() * 0.5);
            const h = size * (0.3 + Math.random() * 0.7);
            const skew = (Math.random() - 0.5) * w * 0.3;
            verts.push({ x: -w / 2 + skew, y: -h / 2 });
            verts.push({ x: w / 2 + skew, y: -h / 2 });
            verts.push({ x: w / 2 - skew, y: h / 2 });
            verts.push({ x: -w / 2 - skew, y: h / 2 });
        } else {
            // Hexagon
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                const r = size * (0.8 + Math.random() * 0.2) * 0.6;
                verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
        }
        return verts;
    }

    _generateCrackBranches(crack, speed) {
        const branches = [];
        const count = this.crackStyle === 2 ? 2 + Math.floor(Math.random() * 3) :
            this.crackStyle === 3 ? 3 + Math.floor(Math.random() * 3) : 1;

        for (let i = 0; i < count; i++) {
            const branchAngle = crack.angle + (Math.random() - 0.5) * 1.5;
            const branchLen = crack.length * (0.3 + Math.random() * 0.5);
            const startT = 0.3 + Math.random() * 0.5;
            branches.push({ angle: branchAngle, length: branchLen, startT });
        }
        return branches;
    }

    draw(ctx) {
        // Draw cracks
        if (this.cracks.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const crack of this.cracks) {
                const alpha = crack.life * 0.5;
                const c = this.palette[0];
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 20}%, ${alpha})`;
                ctx.lineWidth = 1.5;

                // Main crack line
                ctx.beginPath();
                ctx.moveTo(crack.x, crack.y);
                if (this.crackStyle === 0) {
                    // Lightning-style jagged
                    let cx = crack.x, cy = crack.y;
                    const segs = 6;
                    for (let s = 1; s <= segs; s++) {
                        const t = s / segs;
                        cx = crack.x + Math.cos(crack.angle) * crack.length * t + (Math.random() - 0.5) * 10;
                        cy = crack.y + Math.sin(crack.angle) * crack.length * t + (Math.random() - 0.5) * 10;
                        ctx.lineTo(cx, cy);
                    }
                } else {
                    const ex = crack.x + Math.cos(crack.angle) * crack.length;
                    const ey = crack.y + Math.sin(crack.angle) * crack.length;
                    ctx.lineTo(ex, ey);
                }
                ctx.stroke();

                // Draw branches
                if (crack.branches) {
                    ctx.lineWidth = 1;
                    for (const b of crack.branches) {
                        const sx = crack.x + Math.cos(crack.angle) * crack.length * b.startT;
                        const sy = crack.y + Math.sin(crack.angle) * crack.length * b.startT;
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        ctx.lineTo(sx + Math.cos(b.angle) * b.length, sy + Math.sin(b.angle) * b.length);
                        ctx.stroke();
                    }
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
                    alpha = shard.life;
                    scale = 0.5 + shard.life * 0.5;
                }

                ctx.save();
                ctx.translate(shard.x, shard.y);
                ctx.rotate(shard.rotation);
                ctx.scale(scale, scale);

                // Shard body
                ctx.beginPath();
                const v = shard.vertices;
                ctx.moveTo(v[0].x, v[0].y);
                for (let i = 1; i < v.length; i++) {
                    ctx.lineTo(v[i].x, v[i].y);
                }
                ctx.closePath();

                // Fill with gradient-like effect
                ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.3})`;
                ctx.fill();

                // Bright edge
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 15}%, ${alpha * 0.6})`;
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
