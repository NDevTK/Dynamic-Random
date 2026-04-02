/**
 * @file chromatic_worms_effects.js
 * @description Prismatic worm entities that swim through the canvas, splitting into
 * separate R/G/B channel ghosts when near the cursor. Each worm has unique personality
 * traits (speed, curiosity, shyness) driven by the seed. The chromatic separation
 * creates beautiful rainbow fringing effects reminiscent of optical aberration.
 *
 * Modes:
 * 0 - Shoal: worms travel in schools, splitting apart near cursor like startled fish
 * 1 - Predator: one large worm hunts smaller ones, cursor repels the predator
 * 2 - Symbiosis: worms link together forming chains, chromatic split on the chain
 * 3 - Mitosis: worms periodically split into two, each inheriting partial color
 * 4 - Ouroboros: worms chase their own tails forming loops, loops refract light
 * 5 - Migration: worms follow invisible "currents" that shift based on cursor position
 */

const TAU = Math.PI * 2;

class Worm {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.segments = [];
        this.segmentCount = 12;
        this.hue = 0;
        this.thickness = 2;
        this.speed = 1;
        this.curiosity = 0.5;
        this.shyness = 0.5;
        this.phase = 0;
        this.wobbleFreq = 0.1;
        this.wobbleAmp = 5;
        this.chromaticSpread = 0;
        this.targetChromaticSpread = 0;
        this.alive = true;
        this.age = 0;
        this.isPredator = false;
        this.chainPartner = -1;
        this.splitTimer = 0;
        this.tailChaseRadius = 0;
    }
}

export class ChromaticWorms {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 80;
        this.worms = [];
        this.wormPool = [];
        this.maxWorms = 15;
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._rng = Math.random;

        // Migration currents
        this.currents = [];
        this.currentPhase = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 60 + rng() * 30;
        this.tick = 0;
        this._rng = rng;

        // Reset worms
        for (const w of this.worms) this.wormPool.push(w);
        this.worms = [];

        const wormCount = this.mode === 1 ? 8 + Math.floor(rng() * 5) : 6 + Math.floor(rng() * 8);
        this.maxWorms = wormCount + 5;

        for (let i = 0; i < wormCount; i++) {
            this._spawnWorm(rng, i === 0 && this.mode === 1);
        }

        // Migration currents
        if (this.mode === 5) {
            this.currents = [];
            const count = 3 + Math.floor(rng() * 4);
            for (let i = 0; i < count; i++) {
                this.currents.push({
                    x: rng() * window.innerWidth,
                    y: rng() * window.innerHeight,
                    angle: rng() * TAU,
                    strength: 0.3 + rng() * 0.7,
                    radius: 100 + rng() * 300,
                });
            }
        }
    }

    _spawnWorm(rng, isPredator = false) {
        const w = this.wormPool.length > 0 ? this.wormPool.pop() : new Worm();
        w.reset();
        w.x = rng() * window.innerWidth;
        w.y = rng() * window.innerHeight;
        w.vx = (rng() - 0.5) * 2;
        w.vy = (rng() - 0.5) * 2;
        w.hue = (this.hue + rng() * 120 - 60 + 360) % 360;
        w.segmentCount = isPredator ? 25 : 8 + Math.floor(rng() * 12);
        w.thickness = isPredator ? 5 : 1.5 + rng() * 3;
        w.speed = isPredator ? 1.5 : 0.8 + rng() * 1.5;
        w.curiosity = rng();
        w.shyness = rng();
        w.wobbleFreq = 0.05 + rng() * 0.15;
        w.wobbleAmp = 3 + rng() * 8;
        w.phase = rng() * TAU;
        w.isPredator = isPredator;
        w.splitTimer = 200 + Math.floor(rng() * 300);
        w.tailChaseRadius = 30 + rng() * 60;

        // Initialize segments at spawn position
        w.segments = [];
        for (let i = 0; i < w.segmentCount; i++) {
            w.segments.push({ x: w.x, y: w.y });
        }

        this.worms.push(w);
        return w;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;
        this._isClicking = isClicking;

        const W = window.innerWidth;
        const H = window.innerHeight;

        for (let wi = this.worms.length - 1; wi >= 0; wi--) {
            const w = this.worms[wi];
            w.age++;

            // Distance to cursor
            const dx = mx - w.x;
            const dy = my - w.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Chromatic aberration based on cursor proximity
            const proximityFactor = Math.max(0, 1 - dist / 250);
            w.targetChromaticSpread = proximityFactor * (isClicking ? 25 : 15);
            w.chromaticSpread += (w.targetChromaticSpread - w.chromaticSpread) * 0.1;

            // Mode-specific steering
            let steerX = 0, steerY = 0;

            switch (this.mode) {
                case 0: { // Shoal
                    // Flock toward center of mass, avoid cursor when close
                    let cx = 0, cy = 0, count = 0;
                    for (const other of this.worms) {
                        if (other === w) continue;
                        const odx = other.x - w.x;
                        const ody = other.y - w.y;
                        const od = odx * odx + ody * ody;
                        if (od < 40000) {
                            cx += other.x; cy += other.y; count++;
                            if (od < 900) { steerX -= odx * 0.01; steerY -= ody * 0.01; }
                        }
                    }
                    if (count > 0) {
                        steerX += (cx / count - w.x) * 0.002;
                        steerY += (cy / count - w.y) * 0.002;
                    }
                    // Flee from cursor
                    if (dist < 200) {
                        const flee = (1 - dist / 200) * w.shyness * 3;
                        steerX -= (dx / dist) * flee;
                        steerY -= (dy / dist) * flee;
                    }
                    break;
                }
                case 1: { // Predator
                    if (w.isPredator) {
                        // Hunt nearest non-predator, repelled by cursor
                        let nearest = null, nd = Infinity;
                        for (const other of this.worms) {
                            if (other.isPredator || !other.alive) continue;
                            const odx = other.x - w.x, ody = other.y - w.y;
                            const od = odx * odx + ody * ody;
                            if (od < nd) { nd = od; nearest = other; }
                        }
                        if (nearest) {
                            steerX += (nearest.x - w.x) * 0.01;
                            steerY += (nearest.y - w.y) * 0.01;
                        }
                        if (dist < 150) {
                            steerX -= (dx / dist) * 2;
                            steerY -= (dy / dist) * 2;
                        }
                    } else {
                        // Flee from predator, attracted slightly to cursor for safety
                        for (const other of this.worms) {
                            if (!other.isPredator) continue;
                            const odx = other.x - w.x, ody = other.y - w.y;
                            const od = Math.sqrt(odx * odx + ody * ody) || 1;
                            if (od < 200) {
                                steerX -= (odx / od) * 3;
                                steerY -= (ody / od) * 3;
                            }
                        }
                        if (dist < 300) {
                            steerX += (dx / dist) * w.curiosity * 0.5;
                            steerY += (dy / dist) * w.curiosity * 0.5;
                        }
                    }
                    break;
                }
                case 2: { // Symbiosis - gentle wandering, attracted to partners
                    steerX += Math.sin(this.tick * 0.01 + w.phase) * 0.3;
                    steerY += Math.cos(this.tick * 0.013 + w.phase) * 0.3;
                    if (dist < 200) {
                        steerX += (dx / dist) * w.curiosity * 0.8;
                        steerY += (dy / dist) * w.curiosity * 0.8;
                    }
                    break;
                }
                case 3: { // Mitosis - wander, occasionally split
                    steerX += Math.sin(this.tick * 0.008 + w.phase * 3) * 0.5;
                    steerY += Math.cos(this.tick * 0.011 + w.phase * 2) * 0.5;
                    if (dist < 150) {
                        steerX += (dx / dist) * w.curiosity;
                        steerY += (dy / dist) * w.curiosity;
                    }
                    w.splitTimer--;
                    if (w.splitTimer <= 0 && this.worms.length < this.maxWorms) {
                        w.splitTimer = 200 + Math.floor(this._rng() * 300);
                        const child = this._spawnWorm(this._rng);
                        child.x = w.x + (this._rng() - 0.5) * 20;
                        child.y = w.y + (this._rng() - 0.5) * 20;
                        child.hue = (w.hue + 30) % 360;
                        child.segmentCount = Math.max(5, w.segmentCount - 2);
                        child.thickness = w.thickness * 0.8;
                        w.segmentCount = Math.max(5, w.segmentCount - 2);
                    }
                    break;
                }
                case 4: { // Ouroboros - chase own tail
                    if (w.segments.length > 3) {
                        const tail = w.segments[w.segments.length - 1];
                        const tdx = tail.x - w.x, tdy = tail.y - w.y;
                        const td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
                        if (td > w.tailChaseRadius * 0.5) {
                            steerX += (tdx / td) * 0.8;
                            steerY += (tdy / td) * 0.8;
                        }
                    }
                    // Cursor pushes loops around
                    if (dist < 200) {
                        const push = (1 - dist / 200) * 2;
                        steerX -= (dx / dist) * push;
                        steerY -= (dy / dist) * push;
                    }
                    break;
                }
                case 5: { // Migration - follow currents
                    for (const c of this.currents) {
                        const cdx = w.x - c.x, cdy = w.y - c.y;
                        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                        if (cd < c.radius) {
                            const influence = (1 - cd / c.radius) * c.strength;
                            steerX += Math.cos(c.angle) * influence;
                            steerY += Math.sin(c.angle) * influence;
                        }
                    }
                    // Cursor shifts currents
                    this.currentPhase += 0.001;
                    break;
                }
            }

            // Wobble
            const wobble = Math.sin(this.tick * w.wobbleFreq + w.phase) * w.wobbleAmp;
            const moveAngle = Math.atan2(w.vy, w.vx);
            steerX += Math.cos(moveAngle + Math.PI / 2) * wobble * 0.02;
            steerY += Math.sin(moveAngle + Math.PI / 2) * wobble * 0.02;

            // Apply steering
            w.vx += steerX * 0.1;
            w.vy += steerY * 0.1;

            // Limit speed
            const spd = Math.sqrt(w.vx * w.vx + w.vy * w.vy);
            if (spd > w.speed * 3) {
                w.vx = (w.vx / spd) * w.speed * 3;
                w.vy = (w.vy / spd) * w.speed * 3;
            }

            // Damping
            w.vx *= 0.98;
            w.vy *= 0.98;

            // Move head
            w.x += w.vx;
            w.y += w.vy;

            // Wrap around screen
            if (w.x < -50) w.x = W + 50;
            if (w.x > W + 50) w.x = -50;
            if (w.y < -50) w.y = H + 50;
            if (w.y > H + 50) w.y = -50;

            // Update segments (follow the leader)
            if (w.segments.length > 0) {
                w.segments[0].x = w.x;
                w.segments[0].y = w.y;
                for (let i = 1; i < w.segments.length; i++) {
                    const prev = w.segments[i - 1];
                    const seg = w.segments[i];
                    const sdx = prev.x - seg.x;
                    const sdy = prev.y - seg.y;
                    const sd = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
                    const spacing = w.thickness * 2;
                    if (sd > spacing) {
                        seg.x += (sdx / sd) * (sd - spacing);
                        seg.y += (sdy / sd) * (sd - spacing);
                    }
                }
            }
        }

        // Update migration currents
        if (this.mode === 5) {
            for (const c of this.currents) {
                c.angle += Math.sin(this.tick * 0.005 + c.x * 0.001) * 0.02;
                // Cursor influence on nearby currents
                const cdx = this._mouseX - c.x;
                const cdy = this._mouseY - c.y;
                const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cd < 300) {
                    c.angle += Math.atan2(cdy, cdx) * 0.001 * (1 - cd / 300);
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const w of this.worms) {
            if (w.segments.length < 2) continue;

            const spread = w.chromaticSpread;

            // Draw 3 chromatic channels offset from each other
            const channels = spread > 0.5 ? [
                { offset: -spread, color: `hsla(0, 100%, 60%,`, label: 'r' },
                { offset: 0, color: `hsla(120, 100%, 60%,`, label: 'g' },
                { offset: spread, color: `hsla(240, 100%, 60%,`, label: 'b' },
            ] : [
                { offset: 0, color: `hsla(${w.hue}, ${this.saturation}%, 60%,`, label: 'main' },
            ];

            for (const ch of channels) {
                ctx.beginPath();
                const ox = ch.offset;

                ctx.moveTo(w.segments[0].x + ox, w.segments[0].y);
                for (let i = 1; i < w.segments.length - 1; i++) {
                    const curr = w.segments[i];
                    const next = w.segments[i + 1];
                    const cpx = (curr.x + next.x) / 2 + ox;
                    const cpy = (curr.y + next.y) / 2;
                    ctx.quadraticCurveTo(curr.x + ox, curr.y, cpx, cpy);
                }
                const last = w.segments[w.segments.length - 1];
                ctx.lineTo(last.x + ox, last.y);

                // Thickness tapers toward tail
                ctx.lineWidth = w.thickness;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const alpha = spread > 0.5 ? 0.25 : 0.4;
                ctx.strokeStyle = ch.color + alpha + ')';
                ctx.stroke();

                // Glow at head
                const headAlpha = spread > 0.5 ? 0.15 : 0.25;
                ctx.fillStyle = ch.color + headAlpha + ')';
                ctx.beginPath();
                ctx.arc(w.segments[0].x + ox, w.segments[0].y, w.thickness * 2, 0, TAU);
                ctx.fill();
            }

            // Ouroboros mode: draw loop glow when tail is near head
            if (this.mode === 4 && w.segments.length > 3) {
                const head = w.segments[0];
                const tail = w.segments[w.segments.length - 1];
                const ldx = head.x - tail.x, ldy = head.y - tail.y;
                const ld = Math.sqrt(ldx * ldx + ldy * ldy);
                if (ld < w.tailChaseRadius) {
                    const loopAlpha = (1 - ld / w.tailChaseRadius) * 0.15;
                    const cx = (head.x + tail.x) / 2;
                    const cy = (head.y + tail.y) / 2;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w.tailChaseRadius);
                    grad.addColorStop(0, `hsla(${w.hue}, 90%, 70%, ${loopAlpha})`);
                    grad.addColorStop(1, `hsla(${w.hue}, 90%, 70%, 0)`);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, w.tailChaseRadius, 0, TAU);
                    ctx.fill();
                }
            }
        }

        // Symbiosis mode: draw links between nearby worms
        if (this.mode === 2) {
            ctx.lineWidth = 1;
            for (let i = 0; i < this.worms.length; i++) {
                for (let j = i + 1; j < this.worms.length; j++) {
                    const a = this.worms[i], b = this.worms[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 120) {
                        const alpha = (1 - d / 120) * 0.2;
                        const linkHue = (a.hue + b.hue) / 2;
                        const spread = Math.max(a.chromaticSpread, b.chromaticSpread);
                        if (spread > 2) {
                            // Chromatic link
                            ctx.strokeStyle = `hsla(0, 100%, 60%, ${alpha})`;
                            ctx.beginPath(); ctx.moveTo(a.x - spread, a.y); ctx.lineTo(b.x - spread, b.y); ctx.stroke();
                            ctx.strokeStyle = `hsla(120, 100%, 60%, ${alpha})`;
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                            ctx.strokeStyle = `hsla(240, 100%, 60%, ${alpha})`;
                            ctx.beginPath(); ctx.moveTo(a.x + spread, a.y); ctx.lineTo(b.x + spread, b.y); ctx.stroke();
                        } else {
                            ctx.strokeStyle = `hsla(${linkHue}, 70%, 60%, ${alpha})`;
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                        }
                    }
                }
            }
        }

        ctx.restore();
    }
}
