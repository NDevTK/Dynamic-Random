/**
 * @file reality_fracture_effects.js
 * @description Screen fracturing and reality-break effects. Creates floating
 * geometric shards that reflect/distort parts of the scene, glitch corridors
 * that tear across the screen, and void cracks that spread from click points.
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
        this._tick = 0;
        this._mx = 0;
        this._my = 0;
        this._isClicking = false;
        this._fracturePattern = 0;
        this._baseHue = 280;
        this._voidHue = 260;
        this._glitchIntensity = 0.5;
        this._repairSpeed = 0.01;
        this._maxShards = 15;
        this._maxCracks = 20;
        this._distortionStrength = 0;
    }

    configure(rng, hues) {
        this._tick = 0;
        this._shards = [];
        this._cracks = [];
        this._voidZones = [];
        this._glitchBands = [];

        this._fracturePattern = Math.floor(rng() * 4); // 0=radial, 1=grid, 2=organic, 3=shattered
        this._baseHue = hues.length > 0 ? hues[0].h : Math.floor(rng() * 360);
        this._voidHue = hues.length > 1 ? hues[1].h : (this._baseHue + 180) % 360;
        this._glitchIntensity = 0.2 + rng() * 0.8;
        this._repairSpeed = 0.005 + rng() * 0.02;
        this._maxShards = 8 + Math.floor(rng() * 12);
        this._maxCracks = 12 + Math.floor(rng() * 16);
        this._distortionStrength = 5 + rng() * 25;

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Pre-generate floating shards
        const shardCount = 3 + Math.floor(rng() * this._maxShards);
        for (let i = 0; i < shardCount; i++) {
            this._shards.push(this._createShard(rng, w, h));
        }

        // Pre-generate some glitch bands
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
            reflectOffset: { x: (rng() - 0.5) * 100, y: (rng() - 0.5) * 100 },
            pulsePhase: rng() * Math.PI * 2,
            borderGlow: rng() > 0.5,
        };
    }

    update(mx, my, isClicking) {
        this._tick++;
        this._mx = mx;
        this._my = my;
        const wasClicking = this._isClicking;
        this._isClicking = isClicking;

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Spawn cracks on click
        if (isClicking && !wasClicking) {
            this._spawnCrack(mx, my, w, h);
        }

        // Update shards
        for (const shard of this._shards) {
            // Float toward cursor gently
            const dx = mx - shard.x;
            const dy = my - shard.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 50 && dist < 500) {
                shard.vx += (dx / dist) * 0.03;
                shard.vy += (dy / dist) * 0.03;
            }
            if (isClicking && dist < 300) {
                // Scatter on click
                shard.vx -= (dx / dist) * 2;
                shard.vy -= (dy / dist) * 2;
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

        // Update cracks (they grow then fade)
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

        // Update void zones (expanding circles of distortion)
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

        // Glitch bands - randomly activate/deactivate
        for (const band of this._glitchBands) {
            if (!band.active && Math.random() < 0.005 * this._glitchIntensity) {
                band.active = true;
                band.activeTimer = 5 + Math.floor(Math.random() * 20);
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

        // Spawn void zone on right-click hold
        if (isClicking && this._tick % 30 === 0 && this._voidZones.length < 5) {
            let vz = this._voidPool.length > 0 ? this._voidPool.pop() : {};
            vz.x = mx;
            vz.y = my;
            vz.radius = 10;
            vz.maxRadius = 50 + Math.random() * 100;
            vz.life = 1;
            vz.growSpeed = 1 + Math.random() * 2;
            vz.hue = this._voidHue;
            this._voidZones.push(vz);
        }
    }

    _spawnCrack(x, y, w, h) {
        if (this._cracks.length >= this._maxCracks) return;

        const branchCount = 3 + Math.floor(Math.random() * 5);
        for (let b = 0; b < branchCount; b++) {
            let crack = this._crackPool.length > 0 ? this._crackPool.pop() : {};
            crack.x = x;
            crack.y = y;
            crack.life = 1;
            crack.growth = 0;

            // Generate crack path
            const segments = 5 + Math.floor(Math.random() * 10);
            const angle = (b / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            crack.path = [{ x: 0, y: 0 }];
            let cx = 0, cy = 0;
            let curAngle = angle;

            for (let s = 0; s < segments; s++) {
                const len = 10 + Math.random() * 40;
                curAngle += (Math.random() - 0.5) * 1.2;
                cx += Math.cos(curAngle) * len;
                cy += Math.sin(curAngle) * len;
                crack.path.push({ x: cx, y: cy });
            }

            crack.hue = (this._baseHue + Math.random() * 40 - 20 + 360) % 360;
            crack.width = 1 + Math.random() * 2;
            crack.glowWidth = 3 + Math.random() * 8;

            this._cracks.push(crack);
        }
    }

    draw(ctx, system) {
        const w = system.width || window.innerWidth;
        const h = system.height || window.innerHeight;

        ctx.save();

        // Draw void zones
        for (const vz of this._voidZones) {
            const alpha = vz.life * 0.3;
            const grad = ctx.createRadialGradient(vz.x, vz.y, 0, vz.x, vz.y, vz.radius);
            grad.addColorStop(0, `hsla(${vz.hue}, 80%, 5%, ${alpha})`);
            grad.addColorStop(0.5, `hsla(${vz.hue}, 90%, 15%, ${alpha * 0.7})`);
            grad.addColorStop(0.8, `hsla(${vz.hue}, 70%, 30%, ${alpha * 0.3})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(vz.x, vz.y, vz.radius, 0, Math.PI * 2);
            ctx.fill();

            // Distortion ring
            ctx.strokeStyle = `hsla(${vz.hue}, 100%, 70%, ${vz.life * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(vz.x, vz.y, vz.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw cracks
        ctx.globalCompositeOperation = 'lighter';
        for (const crack of this._cracks) {
            if (crack.path.length < 2) continue;
            const alpha = crack.life;
            const visibleSegments = Math.ceil(crack.path.length * crack.growth);

            // Glow layer
            ctx.save();
            ctx.strokeStyle = `hsla(${crack.hue}, 100%, 80%, ${alpha * 0.3})`;
            ctx.lineWidth = crack.glowWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(crack.x + crack.path[0].x, crack.y + crack.path[0].y);
            for (let i = 1; i < visibleSegments; i++) {
                ctx.lineTo(crack.x + crack.path[i].x, crack.y + crack.path[i].y);
            }
            ctx.stroke();
            ctx.restore();

            // Core line
            ctx.strokeStyle = `hsla(${crack.hue}, 100%, 95%, ${alpha * 0.8})`;
            ctx.lineWidth = crack.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(crack.x + crack.path[0].x, crack.y + crack.path[0].y);
            for (let i = 1; i < visibleSegments; i++) {
                ctx.lineTo(crack.x + crack.path[i].x, crack.y + crack.path[i].y);
            }
            ctx.stroke();
        }

        // Draw floating shards
        for (const shard of this._shards) {
            const pulse = Math.sin(shard.pulsePhase) * 0.15;
            const alpha = (shard.alpha + pulse) * 0.6;

            ctx.save();
            ctx.translate(shard.x, shard.y);
            ctx.rotate(shard.rotation);

            // Shard fill with gradient
            const grad = ctx.createLinearGradient(
                shard.points[0].x, shard.points[0].y,
                shard.points[Math.floor(shard.points.length / 2)].x,
                shard.points[Math.floor(shard.points.length / 2)].y
            );
            grad.addColorStop(0, `hsla(${shard.hue}, 60%, 20%, ${alpha * 0.5})`);
            grad.addColorStop(0.5, `hsla(${shard.hue}, 70%, 40%, ${alpha * 0.3})`);
            grad.addColorStop(1, `hsla(${(shard.hue + 30) % 360}, 50%, 15%, ${alpha * 0.4})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(shard.points[0].x, shard.points[0].y);
            for (let i = 1; i < shard.points.length; i++) {
                ctx.lineTo(shard.points[i].x, shard.points[i].y);
            }
            ctx.closePath();
            ctx.fill();

            // Border glow
            if (shard.borderGlow) {
                ctx.strokeStyle = `hsla(${shard.hue}, 100%, 80%, ${alpha * 0.6})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        }

        // Draw glitch bands (horizontal displacement lines)
        ctx.globalCompositeOperation = 'source-over';
        for (const band of this._glitchBands) {
            if (!band.active || Math.abs(band.offset) < 1) continue;

            // Draw a colored displacement band
            ctx.save();
            ctx.globalAlpha = 0.15 * this._glitchIntensity;

            // RGB split effect
            ctx.fillStyle = `hsla(${band.hue}, 100%, 50%, 0.3)`;
            ctx.fillRect(band.offset, band.y, w, band.height);

            ctx.fillStyle = `hsla(${(band.hue + 120) % 360}, 100%, 50%, 0.2)`;
            ctx.fillRect(-band.offset, band.y + 1, w, band.height);

            // White flash line
            ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
            ctx.fillRect(0, band.y, w, 1);

            ctx.restore();
        }

        ctx.restore();
    }
}
