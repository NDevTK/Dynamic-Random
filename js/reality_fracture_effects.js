/**
 * @file reality_fracture_effects.js
 * @description Screen fracturing and reality-break effects. Creates floating
 * geometric shards that reflect/distort parts of the scene, glitch corridors
 * that tear across the screen, void cracks that spread from click points,
 * and debris particles flying from crack origins.
 *
 * Seed controls: shard count, crack style, void color, fracture pattern
 * (radial, grid, organic, shattered), glitch intensity, and repair speed.
 */

export class RealityFracture {
    constructor() {
        this._shards = [];
        this._cracks = [];
        this._crackPool = [];
        this._voidZones = [];
        this._voidPool = [];
        this._glitchBands = [];
        this._debris = [];
        this._debrisPool = [];
        this._tick = 0;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._fracturePattern = 0;
        this._baseHue = 280;
        this._voidHue = 260;
        this._glitchIntensity = 0.5;
        this._repairSpeed = 0.01;
        this._maxShards = 15;
        this._maxCracks = 20;
        this._maxDebris = 100;
        this._distortionStrength = 0;
        this._screenShake = 0;

        // Cached Path2D for shards (avoid rebuilding paths each frame)
        this._shardPaths = [];
    }

    configure(rng, hues) {
        this._tick = 0;
        this._shards = [];
        this._cracks = [];
        this._voidZones = [];
        this._glitchBands = [];
        this._debris = [];
        this._shardPaths = [];
        this._screenShake = 0;

        this._fracturePattern = Math.floor(rng() * 4);
        this._baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._voidHue = hues.length > 1 ? hues[1].h : (this._baseHue + 180) % 360;
        this._glitchIntensity = 0.2 + rng() * 0.8;
        this._repairSpeed = 0.005 + rng() * 0.02;
        this._maxShards = 8 + Math.floor(rng() * 12);
        this._maxCracks = 12 + Math.floor(rng() * 16);
        this._distortionStrength = 5 + rng() * 25;

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Pre-generate floating shards with cached Path2D
        const shardCount = 3 + Math.floor(rng() * this._maxShards);
        for (let i = 0; i < shardCount; i++) {
            const shard = this._createShard(rng, w, h);
            this._shards.push(shard);
            this._shardPaths.push(this._buildShardPath(shard));
        }

        // Pre-generate glitch bands
        const bandCount = 2 + Math.floor(rng() * 5);
        for (let i = 0; i < bandCount; i++) {
            this._glitchBands.push({
                y: rng() * h,
                height: 1 + rng() * 8,
                offset: 0,
                maxOffset: 10 + rng() * 40,
                speed: 0.5 + rng() * 2,
                phase: rng() * Math.PI * 2,
                active: false,
                activeTimer: 0,
                hue: (this._baseHue + rng() * 60) % 360,
            });
        }
    }

    _buildShardPath(shard) {
        const path = new Path2D();
        path.moveTo(shard.points[0].x, shard.points[0].y);
        for (let i = 1; i < shard.points.length; i++) {
            path.lineTo(shard.points[i].x, shard.points[i].y);
        }
        path.closePath();
        return path;
    }

    _createShard(rng, w, h) {
        const cx = rng() * w;
        const cy = rng() * h;
        const size = 30 + rng() * 80;
        const sides = 3 + Math.floor(rng() * 4);
        const points = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 + (rng() - 0.5) * 0.5;
            const r = size * (0.5 + rng() * 0.5);
            points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        return {
            x: cx, y: cy,
            vx: (rng() - 0.5) * 1,
            vy: (rng() - 0.5) * 1,
            rotation: rng() * Math.PI * 2,
            rotSpeed: (rng() - 0.5) * 0.02,
            points,
            alpha: 0.3 + rng() * 0.4,
            hue: (this._baseHue + (rng() - 0.5) * 60 + 360) % 360,
            pulsePhase: rng() * Math.PI * 2,
            borderGlow: rng() > 0.4,
            innerGlow: rng() > 0.6, // extra inner highlight
        };
    }

    // Tick-based pseudo-random
    _prand(seed) {
        return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);
        const wasClicking = this._isClicking;
        this._isClicking = isClicking;

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Decay screen shake
        this._screenShake *= 0.9;

        // Spawn cracks + debris on click
        if (isClicking && !wasClicking) {
            this._spawnCrack(mx, my);
            this._spawnDebris(mx, my, 15);
            this._screenShake = Math.min(8, this._screenShake + 4);
        }

        // Update shards
        for (const shard of this._shards) {
            const dx = mx - shard.x;
            const dy = my - shard.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > 2500 && distSq < 250000) { // 50-500 range
                const dist = Math.sqrt(distSq);
                shard.vx += (dx / dist) * 0.03;
                shard.vy += (dy / dist) * 0.03;
            }
            if (isClicking && distSq < 90000 && distSq > 1) { // < 300
                const dist = Math.sqrt(distSq);
                const scatter = 2 + this._mouseSpeed * 0.1;
                shard.vx -= (dx / dist) * scatter;
                shard.vy -= (dy / dist) * scatter;
            }

            shard.vx *= 0.98;
            shard.vy *= 0.98;
            shard.x += shard.vx;
            shard.y += shard.vy;
            shard.rotation += shard.rotSpeed;

            // Wrap
            if (shard.x < -100) shard.x = w + 100;
            if (shard.x > w + 100) shard.x = -100;
            if (shard.y < -100) shard.y = h + 100;
            if (shard.y > h + 100) shard.y = -100;

            shard.pulsePhase += 0.03;
        }

        // Update cracks
        for (let i = this._cracks.length - 1; i >= 0; i--) {
            const crack = this._cracks[i];
            crack.life -= this._repairSpeed;
            crack.growth = Math.min(1, crack.growth + 0.05);
            if (crack.life <= 0) {
                this._crackPool.push(crack);
                this._cracks[i] = this._cracks[this._cracks.length - 1];
                this._cracks.pop();
            }
        }

        // Update void zones
        for (let i = this._voidZones.length - 1; i >= 0; i--) {
            const vz = this._voidZones[i];
            vz.radius += vz.growSpeed;
            vz.life -= 0.008;
            if (vz.life <= 0) {
                this._voidPool.push(vz);
                this._voidZones[i] = this._voidZones[this._voidZones.length - 1];
                this._voidZones.pop();
            }
        }

        // Update debris particles
        for (let i = this._debris.length - 1; i >= 0; i--) {
            const d = this._debris[i];
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.05; // gravity
            d.vx *= 0.99;
            d.rotation += d.rotSpeed;
            d.life--;
            if (d.life <= 0) {
                this._debrisPool.push(d);
                this._debris[i] = this._debris[this._debris.length - 1];
                this._debris.pop();
            }
        }

        // Glitch bands - tick-based activation
        for (let gi = 0; gi < this._glitchBands.length; gi++) {
            const band = this._glitchBands[gi];
            if (!band.active && this._prand(this._tick * 11 + gi * 37) < 0.005 * this._glitchIntensity) {
                band.active = true;
                band.activeTimer = 5 + ((this._prand(this._tick * 7 + gi) * 20) | 0);
            }
            if (band.active) {
                band.offset = Math.sin(this._tick * band.speed + band.phase) * band.maxOffset;
                band.activeTimer--;
                if (band.activeTimer <= 0) {
                    band.active = false;
                    band.offset = 0;
                }
            }
            // Bands react to cursor proximity
            const bandDist = Math.abs(my - band.y);
            if (bandDist < 100) {
                band.active = true;
                band.activeTimer = Math.max(band.activeTimer, 3);
                band.offset = (1 - bandDist / 100) * band.maxOffset * (mx > w / 2 ? 1 : -1);
            }
        }

        // Spawn void zone on hold
        if (isClicking && this._tick % 30 === 0 && this._voidZones.length < 5) {
            const seed = this._tick * 13 + 7;
            let vz = this._voidPool.length > 0 ? this._voidPool.pop() : {};
            vz.x = mx;
            vz.y = my;
            vz.radius = 10;
            vz.maxRadius = 50 + this._prand(seed) * 100;
            vz.life = 1;
            vz.growSpeed = 1 + this._prand(seed + 1) * 2;
            vz.hue = this._voidHue;
            this._voidZones.push(vz);
        }
    }

    _spawnDebris(x, y, count) {
        for (let i = 0; i < count && this._debris.length < this._maxDebris; i++) {
            const seed = this._tick * 31 + i * 7;
            let d = this._debrisPool.length > 0 ? this._debrisPool.pop() : {};
            const angle = this._prand(seed) * Math.PI * 2;
            const spd = 2 + this._prand(seed + 1) * 8;
            d.x = x;
            d.y = y;
            d.vx = Math.cos(angle) * spd;
            d.vy = Math.sin(angle) * spd - 2;
            d.life = 30 + (this._prand(seed + 2) * 40) | 0;
            d.maxLife = d.life;
            d.size = 1 + this._prand(seed + 3) * 4;
            d.rotation = this._prand(seed + 4) * Math.PI * 2;
            d.rotSpeed = (this._prand(seed + 5) - 0.5) * 0.2;
            d.hue = (this._baseHue + this._prand(seed + 6) * 40 - 20 + 360) % 360;
            this._debris.push(d);
        }
    }

    _spawnCrack(x, y) {
        if (this._cracks.length >= this._maxCracks) return;

        const baseSeed = this._tick * 17 + 3;
        const branchCount = 3 + ((this._prand(baseSeed) * 5) | 0);

        for (let b = 0; b < branchCount; b++) {
            let crack = this._crackPool.length > 0 ? this._crackPool.pop() : {};
            crack.x = x;
            crack.y = y;
            crack.life = 1;
            crack.growth = 0;

            const seed = baseSeed + b * 100;
            const segments = 5 + ((this._prand(seed) * 10) | 0);
            const startAngle = (b / branchCount) * Math.PI * 2 + (this._prand(seed + 1) - 0.5) * 0.5;
            crack.path = [{ x: 0, y: 0 }];
            let cx = 0, cy = 0;
            let curAngle = startAngle;

            for (let s = 0; s < segments; s++) {
                const sSeed = seed + s * 10;
                const len = 10 + this._prand(sSeed) * 40;
                curAngle += (this._prand(sSeed + 1) - 0.5) * 1.2;
                cx += Math.cos(curAngle) * len;
                cy += Math.sin(curAngle) * len;
                crack.path.push({ x: cx, y: cy });
            }

            crack.hue = (this._baseHue + this._prand(seed + 50) * 40 - 20 + 360) % 360;
            crack.width = 1 + this._prand(seed + 51) * 2;
            crack.glowWidth = 3 + this._prand(seed + 52) * 8;

            this._cracks.push(crack);
        }
    }

    draw(ctx, system) {
        const w = system.width || window.innerWidth;
        const h = system.height || window.innerHeight;

        ctx.save();

        // Screen shake offset
        if (this._screenShake > 0.5) {
            const sx = (this._prand(this._tick * 3) - 0.5) * this._screenShake * 2;
            const sy = (this._prand(this._tick * 5 + 1) - 0.5) * this._screenShake * 2;
            ctx.translate(sx, sy);
        }

        // Draw void zones
        for (const vz of this._voidZones) {
            const alpha = vz.life * 0.3;
            const grad = ctx.createRadialGradient(vz.x, vz.y, 0, vz.x, vz.y, vz.radius);
            grad.addColorStop(0, `hsla(${vz.hue | 0}, 80%, 5%, ${alpha.toFixed(3)})`);
            grad.addColorStop(0.5, `hsla(${vz.hue | 0}, 90%, 15%, ${(alpha * 0.7).toFixed(3)})`);
            grad.addColorStop(0.8, `hsla(${vz.hue | 0}, 70%, 30%, ${(alpha * 0.3).toFixed(3)})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(vz.x, vz.y, vz.radius, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing distortion ring
            const ringPulse = Math.sin(this._tick * 0.1) * 0.15 + 0.35;
            ctx.strokeStyle = `hsla(${vz.hue | 0}, 100%, 70%, ${(vz.life * ringPulse).toFixed(3)})`;
            ctx.lineWidth = 1 + Math.sin(this._tick * 0.15) * 0.5;
            ctx.beginPath();
            ctx.arc(vz.x, vz.y, vz.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw cracks with glow + core in one pass
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const crack of this._cracks) {
            if (crack.path.length < 2) continue;
            const alpha = crack.life;
            const visibleSegments = Math.ceil(crack.path.length * crack.growth);

            // Glow layer
            ctx.strokeStyle = `hsla(${crack.hue | 0}, 100%, 80%, ${(alpha * 0.3).toFixed(3)})`;
            ctx.lineWidth = crack.glowWidth;
            ctx.beginPath();
            ctx.moveTo(crack.x + crack.path[0].x, crack.y + crack.path[0].y);
            for (let i = 1; i < visibleSegments; i++) {
                ctx.lineTo(crack.x + crack.path[i].x, crack.y + crack.path[i].y);
            }
            ctx.stroke();

            // Core line
            ctx.strokeStyle = `hsla(${crack.hue | 0}, 100%, 95%, ${(alpha * 0.8).toFixed(3)})`;
            ctx.lineWidth = crack.width;
            ctx.beginPath();
            ctx.moveTo(crack.x + crack.path[0].x, crack.y + crack.path[0].y);
            for (let i = 1; i < visibleSegments; i++) {
                ctx.lineTo(crack.x + crack.path[i].x, crack.y + crack.path[i].y);
            }
            ctx.stroke();
        }

        // Draw debris particles
        for (const d of this._debris) {
            const alpha = (d.life / d.maxLife) * 0.7;
            const size = d.size * (d.life / d.maxLife);
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);
            ctx.fillStyle = `hsla(${d.hue | 0}, 90%, 75%, ${alpha.toFixed(3)})`;
            // Draw as small shard (triangle)
            ctx.beginPath();
            ctx.moveTo(-size, -size * 0.5);
            ctx.lineTo(size, 0);
            ctx.lineTo(-size * 0.3, size * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Draw floating shards using cached Path2D
        for (let si = 0; si < this._shards.length; si++) {
            const shard = this._shards[si];
            const pulse = Math.sin(shard.pulsePhase) * 0.15;
            const alpha = (shard.alpha + pulse) * 0.6;

            ctx.save();
            ctx.translate(shard.x, shard.y);
            ctx.rotate(shard.rotation);

            // Fill with flat color (avoid per-frame gradient allocation for shards)
            ctx.fillStyle = `hsla(${shard.hue | 0}, 65%, 25%, ${(alpha * 0.4).toFixed(3)})`;
            ctx.fill(this._shardPaths[si]);

            // Inner glow highlight
            if (shard.innerGlow) {
                ctx.fillStyle = `hsla(${(shard.hue + 20) % 360}, 80%, 50%, ${(alpha * 0.15).toFixed(3)})`;
                ctx.fill(this._shardPaths[si]);
            }

            // Border glow
            if (shard.borderGlow) {
                ctx.strokeStyle = `hsla(${shard.hue | 0}, 100%, 80%, ${(alpha * 0.6).toFixed(3)})`;
                ctx.lineWidth = 1;
                ctx.stroke(this._shardPaths[si]);
            }

            ctx.restore();
        }

        // Draw glitch bands
        ctx.globalCompositeOperation = 'source-over';
        for (const band of this._glitchBands) {
            if (!band.active || Math.abs(band.offset) < 1) continue;

            ctx.save();
            ctx.globalAlpha = 0.15 * this._glitchIntensity;

            // RGB split
            ctx.fillStyle = `hsla(${band.hue | 0}, 100%, 50%, 0.3)`;
            ctx.fillRect(band.offset, band.y, w, band.height);

            ctx.fillStyle = `hsla(${(band.hue + 120) % 360}, 100%, 50%, 0.2)`;
            ctx.fillRect(-band.offset, band.y + 1, w, band.height);

            // White flash line
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(0, band.y, w, 1);

            ctx.restore();
        }

        ctx.restore();
    }
}
