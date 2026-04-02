/**
 * @file cosmic_dust_effects.js
 * @description Thousands of tiny dust motes that self-organize into seed-determined
 * geometric formations (spirals, helixes, shells, lattices). The cursor acts as a
 * gravitational/magnetic force that scatters and reforms the dust. Formations morph
 * between shapes over time, creating hypnotic emergent patterns.
 *
 * Modes:
 * 0 - Golden Spiral: dust forms a Fibonacci spiral that cursor unwinds
 * 1 - Crystal Lattice: dust snaps to a rotating 3D-projected grid
 * 2 - DNA Helix: double helix that cursor stretches and compresses
 * 3 - Shell Growth: nautilus shell pattern that grows from click points
 * 4 - Orbital Rings: concentric particle rings like Saturn, cursor tilts them
 * 5 - Flock Murmuration: starling-like flocking that forms abstract shapes
 */

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;

export class CosmicDust {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 70;
        this.intensity = 1;
        this._rng = Math.random;

        this.particles = [];
        this.maxParticles = 500;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        this._formationScale = 1;
        this._rotationAngle = 0;
        this._rotationSpeed = 0.005;

        // Cached trig values (hoisted out of per-particle loop)
        this._cosA = 1;
        this._sinA = 0;
        this._cosB = 1;
        this._sinB = 0;
        this._cosR = 1;
        this._sinR = 0;

        this._latticeType = 0;
        this._latticeSpacing = 30;
        this._helixRadius = 80;
        this._helixPitch = 10;
        this._helixTwist = 0;
        this._ringCount = 5;
        this._ringTilt = 0;
        this._targetTilt = 0;
        this._shellCenters = [];

        // Throttle formation recompute
        this._lastFormationTick = -999;
        this._formationInterval = 3; // Recompute every N frames
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.intensity = 0.7 + rng() * 0.6;
        this.tick = 0;
        this._rng = rng;
        this._shellCenters = [];
        this._lastFormationTick = -999;

        this._rotationSpeed = 0.003 + rng() * 0.008;
        this._formationScale = 0.8 + rng() * 0.6;

        switch (this.mode) {
            case 1:
                this._latticeType = Math.floor(rng() * 3);
                this._latticeSpacing = 20 + rng() * 25;
                this.maxParticles = 350;
                break;
            case 2:
                this._helixRadius = 50 + rng() * 80;
                this._helixPitch = 6 + rng() * 10;
                break;
            case 4:
                this._ringCount = 3 + Math.floor(rng() * 5);
                break;
            case 5:
                this.maxParticles = 400;
                break;
            default:
                this.maxParticles = 350;
                break;
        }

        const W = window.innerWidth, H = window.innerHeight;
        this.particles = [];
        const count = this.maxParticles;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: rng() * W,
                y: rng() * H,
                vx: 0,
                vy: 0,
                tx: 0,
                ty: 0,
                size: 0.8 + rng() * 1.5,
                hue: (this.hue + rng() * 40 - 20 + 360) % 360,
                alpha: 0.3 + rng() * 0.4,
                phase: rng() * TAU,
                returnSpeed: 0.02 + rng() * 0.03,
            });
        }

        this._computeFormation();
    }

    _computeFormation() {
        const W = window.innerWidth, H = window.innerHeight;
        const cx = W / 2, cy = H / 2;
        const scale = Math.min(W, H) * 0.35 * this._formationScale;

        // Hoist trig computations out of per-particle loop
        this._cosA = Math.cos(this._rotationAngle);
        this._sinA = Math.sin(this._rotationAngle);
        this._cosB = Math.cos(this._rotationAngle * 0.7);
        this._sinB = Math.sin(this._rotationAngle * 0.7);
        this._cosR = Math.cos(this._rotationAngle * 0.3);
        this._sinR = Math.sin(this._rotationAngle * 0.3);

        const cosA = this._cosA, sinA = this._sinA;
        const cosB = this._cosB, sinB = this._sinB;
        const cosR = this._cosR, sinR = this._sinR;

        const pLen = this.particles.length;
        const perSide = this.mode === 1 ? Math.ceil(Math.cbrt(pLen)) : 0;

        for (let i = 0; i < pLen; i++) {
            const p = this.particles[i];
            const t = i / pLen;

            switch (this.mode) {
                case 0: { // Golden spiral
                    const angle = i * TAU / PHI;
                    const r = Math.sqrt(t) * scale;
                    p.tx = cx + Math.cos(angle + this._rotationAngle) * r;
                    p.ty = cy + Math.sin(angle + this._rotationAngle) * r;
                    break;
                }
                case 1: { // Crystal lattice (3D projected)
                    const ix = i % perSide;
                    const iy = Math.floor(i / perSide) % perSide;
                    const iz = Math.floor(i / (perSide * perSide));
                    const spacing = this._latticeSpacing;

                    let lx = (ix - perSide / 2) * spacing;
                    let ly = (iy - perSide / 2) * spacing;
                    let lz = (iz - perSide / 2) * spacing;

                    if (this._latticeType === 1 && iy % 2 === 1) lx += spacing * 0.5;
                    if (this._latticeType === 2) { lx += ly * 0.3; lz += ly * 0.3; }

                    // 3D rotation using cached trig
                    const rx = lx * cosA - lz * sinA;
                    const rz = lx * sinA + lz * cosA;
                    const ry = ly * cosB - rz * sinB;

                    const perspective = 500 / (500 + rz * sinA + 200);
                    p.tx = cx + rx * perspective;
                    p.ty = cy + ry * perspective;
                    p.alpha = 0.2 + perspective * 0.3;
                    break;
                }
                case 2: { // DNA double helix
                    const helixT = t * 20;
                    const strand = i % 2;
                    const strandAngle = helixT + strand * Math.PI + this._helixTwist;
                    const x = Math.cos(strandAngle) * this._helixRadius;
                    const y = (t - 0.5) * H * 0.8;

                    const px = x * cosR;
                    const depth = x * sinR;
                    const perspective = 400 / (400 + depth + 200);

                    p.tx = cx + px * perspective;
                    p.ty = cy + y * perspective;

                    if (i % 10 < 2 && strand === 0) {
                        p.tx = cx + Math.cos(strandAngle) * this._helixRadius * 0.5 * cosR;
                    }
                    break;
                }
                case 3: { // Nautilus shell
                    if (this._shellCenters.length === 0) {
                        this._shellCenters.push({ x: cx, y: cy });
                    }
                    const center = this._shellCenters[i % this._shellCenters.length];
                    const shellAngle = t * TAU * 4 + this._rotationAngle;
                    const shellR = Math.min(Math.exp(0.15 * (t * TAU * 4)) * 5, scale);
                    p.tx = center.x + Math.cos(shellAngle) * shellR;
                    p.ty = center.y + Math.sin(shellAngle) * shellR;
                    break;
                }
                case 4: { // Orbital rings
                    const ring = Math.floor(t * this._ringCount);
                    const ringT = (t * this._ringCount) % 1;
                    const ringRadius = (ring + 1) / this._ringCount * scale;
                    const ringAngle = ringT * TAU + ring * 0.5 + this._rotationAngle * (ring % 2 === 0 ? 1 : -1);
                    const yScale = 0.3 + Math.abs(Math.cos(this._ringTilt + ring * 0.8)) * 0.7;
                    p.tx = cx + Math.cos(ringAngle) * ringRadius;
                    p.ty = cy + Math.sin(ringAngle) * ringRadius * yScale;
                    break;
                }
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        const mdx = mx - this._prevMX;
        const mdy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
        this._prevMX = mx;
        this._prevMY = my;

        // Click events
        if (isClicking && !this._wasClicking) {
            switch (this.mode) {
                case 0: // Spiral: click creates explosive scatter
                    for (const p of this.particles) {
                        const dx = p.x - mx, dy = p.y - my;
                        const d = Math.sqrt(dx * dx + dy * dy) || 1;
                        if (d < 250) {
                            const force = (1 - d / 250) * 6;
                            p.vx += (dx / d) * force;
                            p.vy += (dy / d) * force;
                        }
                    }
                    break;
                case 1: // Lattice: click shatters and reassembles
                    for (const p of this.particles) {
                        p.vx += (this._rng() - 0.5) * 8;
                        p.vy += (this._rng() - 0.5) * 8;
                    }
                    break;
                case 2: // Helix: click stretches/compresses
                    this._helixRadius = 30 + this._rng() * 120;
                    break;
                case 3: // Shell: click adds a new growth center
                    this._shellCenters.push({ x: mx, y: my });
                    if (this._shellCenters.length > 5) this._shellCenters.shift();
                    this._lastFormationTick = -999; // Force recompute
                    break;
                case 4: // Rings: click scatters ring particles outward
                    for (const p of this.particles) {
                        const dx = p.x - mx, dy = p.y - my;
                        const d = Math.sqrt(dx * dx + dy * dy) || 1;
                        if (d < 200) {
                            p.vx += (dx / d) * 4;
                            p.vy += (dy / d) * 4;
                        }
                    }
                    break;
                case 5: // Flock: click creates implosion toward click point
                    for (const p of this.particles) {
                        const dx = mx - p.x, dy = my - p.y;
                        const d = Math.sqrt(dx * dx + dy * dy) || 1;
                        if (d < 300) {
                            p.vx += (dx / d) * 3;
                            p.vy += (dy / d) * 3;
                        }
                    }
                    break;
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Rotation
        this._rotationAngle += this._rotationSpeed;
        this._helixTwist += 0.01;

        if (this.mode === 4) {
            this._targetTilt = (my / window.innerHeight - 0.5) * Math.PI * 0.8;
            this._ringTilt += (this._targetTilt - this._ringTilt) * 0.02;
        }

        // Throttled formation recompute (every N frames instead of every frame)
        if (this.mode !== 5 && this.tick - this._lastFormationTick >= this._formationInterval) {
            this._lastFormationTick = this.tick;
            this._computeFormation();
        }

        // Update particles
        const W = window.innerWidth, H = window.innerHeight;
        const pLen = this.particles.length;

        for (let i = 0; i < pLen; i++) {
            const p = this.particles[i];

            const cdx = mx - p.x;
            const cdy = my - p.y;
            const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;

            if (this.mode === 5) {
                // Flocking with spatial sampling
                let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
                let neighbors = 0;
                const step = Math.max(1, Math.floor(pLen / 30));
                for (let j = (i * 7) % step; j < pLen; j += step) {
                    if (j === i) continue;
                    const other = this.particles[j];
                    const odx = other.x - p.x;
                    const ody = other.y - p.y;
                    // Early axis check
                    if (odx > 60 || odx < -60 || ody > 60 || ody < -60) continue;
                    const od = odx * odx + ody * ody;
                    if (od < 3600 && od > 0) {
                        const d = Math.sqrt(od);
                        if (d < 20) { sepX -= odx / d; sepY -= ody / d; }
                        aliX += other.vx; aliY += other.vy;
                        cohX += other.x; cohY += other.y;
                        neighbors++;
                    }
                }

                if (neighbors > 0) {
                    aliX /= neighbors; aliY /= neighbors;
                    cohX = cohX / neighbors - p.x;
                    cohY = cohY / neighbors - p.y;
                    p.vx += sepX * 0.15 + (aliX - p.vx) * 0.05 + cohX * 0.005;
                    p.vy += sepY * 0.15 + (aliY - p.vy) * 0.05 + cohY * 0.005;
                }

                // Cursor attraction/repulsion (stronger than before)
                if (cd < 200) {
                    const force = isClicking ? -3 : 1;
                    p.vx += (cdx / cd) * force * (1 - cd / 200) * 0.15;
                    p.vy += (cdy / cd) * force * (1 - cd / 200) * 0.15;
                }

                // Shape-shifting: stronger centering force
                const shapeCX = W / 2 + Math.sin(this.tick * 0.002) * 200;
                const shapeCY = H / 2 + Math.cos(this.tick * 0.003) * 150;
                p.vx += (shapeCX - p.x) * 0.001;
                p.vy += (shapeCY - p.y) * 0.001;

                const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (spd > 3) { p.vx = (p.vx / spd) * 3; p.vy = (p.vy / spd) * 3; }
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.x += p.vx;
                p.y += p.vy;
            } else {
                // Formation mode
                let fx = (p.tx - p.x) * p.returnSpeed;
                let fy = (p.ty - p.y) * p.returnSpeed;

                // Cursor disruption (stronger, speed-responsive)
                const disruptRadius = isClicking ? 250 : 150;
                const speedBoost = Math.min(2, 1 + this._mouseSpeed * 0.03);
                if (cd < disruptRadius) {
                    const force = (1 - cd / disruptRadius) * (isClicking ? 6 : 2.5) * speedBoost;
                    fx -= (cdx / cd) * force;
                    fy -= (cdy / cd) * force;
                }

                fx += Math.sin(this.tick * 0.02 + p.phase) * 0.05;
                fy += Math.cos(this.tick * 0.025 + p.phase * 1.3) * 0.05;

                p.vx = (p.vx + fx) * 0.9;
                p.vy = (p.vy + fy) * 0.9;
                p.x += p.vx;
                p.y += p.vy;
            }

            // Screen wrap
            if (p.x < -20) p.x = W + 20;
            if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20;
            if (p.y > H + 20) p.y = -20;
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const p of this.particles) {
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const speedGlow = Math.min(1, speed * 0.4);
            const size = p.size;
            const alpha = p.alpha * (0.4 + speedGlow * 0.2) * this.intensity;

            // Fast particles get brighter and leave a motion streak
            const lightness = 55 + speedGlow * 30;

            // Core dot
            ctx.fillStyle = `hsla(${p.hue}, ${this.saturation}%, ${lightness}%, ${alpha})`;
            ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);

            // Speed glow halo for fast particles
            if (speed > 1.5) {
                const glowAlpha = alpha * 0.25 * speedGlow;
                const glowSize = size * (2 + speedGlow * 2);
                ctx.fillStyle = `hsla(${p.hue}, ${this.saturation}%, 75%, ${glowAlpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, glowSize, 0, TAU);
                ctx.fill();
            }

            // Motion streak for very fast particles
            if (speed > 3) {
                const streakAlpha = alpha * 0.3;
                ctx.strokeStyle = `hsla(${p.hue}, ${this.saturation}%, ${lightness}%, ${streakAlpha})`;
                ctx.lineWidth = size * 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.stroke();
            }
        }

        // Ring outlines
        if (this.mode === 4) {
            const cxS = window.innerWidth / 2, cyS = window.innerHeight / 2;
            const scale = Math.min(window.innerWidth, window.innerHeight) * 0.35 * this._formationScale;
            ctx.lineWidth = 0.5;
            for (let r = 0; r < this._ringCount; r++) {
                const ringRadius = (r + 1) / this._ringCount * scale;
                const yScale = 0.3 + Math.abs(Math.cos(this._ringTilt + r * 0.8)) * 0.7;
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${0.06 * this.intensity})`;
                ctx.beginPath();
                ctx.ellipse(cxS, cyS, ringRadius, ringRadius * yScale, 0, 0, TAU);
                ctx.stroke();
            }
        }

        // Helix backbone
        if (this.mode === 2) {
            const cxS = window.innerWidth / 2, cyS = window.innerHeight / 2;
            ctx.lineWidth = 0.4;
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, ${0.04 * this.intensity})`;
            ctx.beginPath();
            for (let t = 0; t < 1; t += 0.005) {
                const helixT = t * 20;
                const x = Math.cos(helixT + this._helixTwist) * this._helixRadius;
                const y = (t - 0.5) * window.innerHeight * 0.8;
                const perspective = 400 / (400 + x * this._sinR + 200);
                const px = cxS + x * this._cosR * perspective;
                const py = cyS + y * perspective;
                if (t === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
}
