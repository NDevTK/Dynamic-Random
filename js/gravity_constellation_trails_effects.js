/**
 * @file gravity_constellation_trails_effects.js
 * @description Interactive effect: mouse movement leaves behind glowing anchor
 * points that form constellation-like patterns. Stars are connected by gravity-
 * curved arcs (not straight lines) that bend based on a seed-determined gravity
 * field. Constellations pulse with energy and slowly rotate. Clicking "pins" a
 * permanent bright star that attracts nearby arc connections.
 *
 * Seed controls: arc curvature direction, star brightness curve, connection
 * distance, constellation rotation speed, gravity field angle, color temperature,
 * and whether arcs shimmer or remain steady.
 */

export class GravityConstellationTrails {
    constructor() {
        this.stars = [];
        this.starPool = [];
        this.pinnedStars = [];
        this.maxStars = 50;
        this.maxPinned = 12;
        this.connectionDist = 200;
        this.gravityAngle = 0;
        this.gravityStrength = 30;
        this.rotationSpeed = 0.0005;
        this.shimmer = false;
        this.palette = [];
        this.spawnTimer = 0;
        this.spawnInterval = 4;
        this._tick = 0;
        this._lastMx = 0;
        this._lastMy = 0;
        this._clickRegistered = false;
    }

    configure(rng, palette) {
        this.gravityAngle = rng() * Math.PI * 2;
        this.gravityStrength = 15 + rng() * 50;
        this.rotationSpeed = (rng() - 0.5) * 0.002;
        this.connectionDist = 120 + rng() * 180;
        this.shimmer = rng() > 0.4;
        this.spawnInterval = 3 + Math.floor(rng() * 6);
        this.maxStars = 30 + Math.floor(rng() * 30);

        this.palette = palette && palette.length >= 2 ? palette : [
            { h: rng() * 360, s: 50 + rng() * 40, l: 70 + rng() * 20 },
            { h: rng() * 360, s: 60 + rng() * 30, l: 60 + rng() * 20 },
            { h: rng() * 360, s: 40 + rng() * 30, l: 80 + rng() * 15 },
        ];

        // Arc style: 0=quadratic gravity, 1=sine wave, 2=zigzag, 3=spiral
        this.arcStyle = Math.floor(rng() * 4);
        // Star shape: 0=circle, 1=diamond, 2=cross, 3=4-point star
        this.starShape = Math.floor(rng() * 4);

        this.stars = [];
        this.starPool = [];
        this.pinnedStars = [];
    }

    update(mx, my, isClicking) {
        this._tick++;
        const dx = mx - this._lastMx;
        const dy = my - this._lastMy;
        const speed = Math.sqrt(dx * dx + dy * dy);

        this.spawnTimer++;

        // Spawn trail stars from movement
        if (speed > 1.5 && this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (this.stars.length < this.maxStars) {
                let star = this.starPool.length > 0 ? this.starPool.pop() : {};
                star.x = mx;
                star.y = my;
                star.life = 1.0;
                star.decay = 0.003 + Math.random() * 0.004;
                star.size = 1.5 + speed * 0.15;
                star.brightness = 0.6 + Math.random() * 0.4;
                star.colorIdx = Math.floor(Math.random() * this.palette.length);
                star.phase = Math.random() * Math.PI * 2;
                this.stars.push(star);
            }
        }

        // Pin star on click
        if (isClicking && !this._clickRegistered) {
            this._clickRegistered = true;
            if (this.pinnedStars.length < this.maxPinned) {
                this.pinnedStars.push({
                    x: mx, y: my,
                    size: 4 + Math.random() * 3,
                    pulse: 0,
                    colorIdx: Math.floor(Math.random() * this.palette.length),
                    birth: this._tick,
                });
            }
        }
        if (!isClicking) this._clickRegistered = false;

        // Decay stars
        for (let i = this.stars.length - 1; i >= 0; i--) {
            this.stars[i].life -= this.stars[i].decay;
            if (this.stars[i].life <= 0) {
                if (this.starPool.length < this.maxStars) this.starPool.push(this.stars[i]);
                this.stars[i] = this.stars[this.stars.length - 1];
                this.stars.pop();
            }
        }

        this._lastMx = mx;
        this._lastMy = my;
    }

    draw(ctx) {
        const allStars = [...this.stars, ...this.pinnedStars.map(p => ({
            ...p, life: 1.0, brightness: 1.0,
        }))];

        if (allStars.length < 2) return;

        const distSq = this.connectionDist * this.connectionDist;
        const tick = this._tick;
        const gAngle = this.gravityAngle + tick * this.rotationSpeed;
        const gx = Math.cos(gAngle) * this.gravityStrength;
        const gy = Math.sin(gAngle) * this.gravityStrength;

        // Draw arcs between nearby stars
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < allStars.length; i++) {
            const a = allStars[i];
            for (let j = i + 1; j < allStars.length; j++) {
                const b = allStars[j];
                const ddx = b.x - a.x;
                const ddy = b.y - a.y;
                const d2 = ddx * ddx + ddy * ddy;
                if (d2 > distSq) continue;

                const alpha = Math.min(a.life, b.life) * (1 - d2 / distSq) * 0.25;
                if (alpha < 0.01) continue;

                const shimmerAlpha = this.shimmer
                    ? alpha * (0.7 + 0.3 * Math.sin(tick * 0.05 + i + j))
                    : alpha;

                const c = this.palette[a.colorIdx || 0];
                ctx.strokeStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${shimmerAlpha})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);

                // Draw gravity-curved arc
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                const dist = Math.sqrt(d2);

                if (this.arcStyle === 0) {
                    // Quadratic curve bent by gravity
                    const cpx = midX + gx * (dist / this.connectionDist);
                    const cpy = midY + gy * (dist / this.connectionDist);
                    ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
                } else if (this.arcStyle === 1) {
                    // Sine wave arc
                    const steps = 8;
                    for (let s = 1; s <= steps; s++) {
                        const t = s / steps;
                        const px = a.x + ddx * t;
                        const py = a.y + ddy * t + Math.sin(t * Math.PI) * gy * 0.5;
                        ctx.lineTo(px, py);
                    }
                } else if (this.arcStyle === 2) {
                    // Zigzag
                    const segs = 6;
                    const perpX = -ddy / dist;
                    const perpY = ddx / dist;
                    for (let s = 1; s < segs; s++) {
                        const t = s / segs;
                        const offset = (s % 2 === 0 ? 1 : -1) * 8;
                        ctx.lineTo(a.x + ddx * t + perpX * offset, a.y + ddy * t + perpY * offset);
                    }
                    ctx.lineTo(b.x, b.y);
                } else {
                    // Spiral arc
                    const cpx = midX + gx * 0.5 - ddy * 0.15;
                    const cpy = midY + gy * 0.5 + ddx * 0.15;
                    ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
                }
                ctx.stroke();
            }
        }

        // Draw star points
        for (const star of this.stars) {
            const c = this.palette[star.colorIdx];
            const pulse = this.shimmer ? 0.7 + 0.3 * Math.sin(tick * 0.08 + star.phase) : 1;
            const a = star.life * star.brightness * pulse;
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a * 0.6})`;
            this._drawStar(ctx, star.x, star.y, star.size * star.life);
        }

        // Draw pinned stars with glow
        for (const pin of this.pinnedStars) {
            const c = this.palette[pin.colorIdx];
            const age = (tick - pin.birth) * 0.02;
            const pulse = 0.8 + 0.2 * Math.sin(age);

            // Glow
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l + 10}%, ${0.15 * pulse})`;
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, pin.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `hsla(${c.h}, ${c.s}%, ${c.l}%, ${0.8 * pulse})`;
            this._drawStar(ctx, pin.x, pin.y, pin.size * pulse);
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    _drawStar(ctx, x, y, size) {
        ctx.beginPath();
        if (this.starShape === 0) {
            ctx.arc(x, y, size, 0, Math.PI * 2);
        } else if (this.starShape === 1) {
            // Diamond
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size * 0.7, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size * 0.7, y);
            ctx.closePath();
        } else if (this.starShape === 2) {
            // Cross
            const w = size * 0.3;
            ctx.moveTo(x - w, y - size); ctx.lineTo(x + w, y - size);
            ctx.lineTo(x + w, y - w); ctx.lineTo(x + size, y - w);
            ctx.lineTo(x + size, y + w); ctx.lineTo(x + w, y + w);
            ctx.lineTo(x + w, y + size); ctx.lineTo(x - w, y + size);
            ctx.lineTo(x - w, y + w); ctx.lineTo(x - size, y + w);
            ctx.lineTo(x - size, y - w); ctx.lineTo(x - w, y - w);
            ctx.closePath();
        } else {
            // 4-point star
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? size : size * 0.35;
                const px = x + Math.cos(angle) * r;
                const py = y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.fill();
    }
}
