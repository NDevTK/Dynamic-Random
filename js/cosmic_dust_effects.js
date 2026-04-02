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
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio

export class CosmicDust {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.saturation = 70;
        this._rng = Math.random;

        // Particles
        this.particles = [];
        this.maxParticles = 600;

        // Target positions (formation shape)
        this.targets = [];

        // Mouse
        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._mouseSpeed = 0;
        this._prevMX = 0;
        this._prevMY = 0;

        // Formation params
        this._formationPhase = 0;
        this._formationScale = 1;
        this._rotationAngle = 0;
        this._rotationSpeed = 0.005;

        // Lattice params
        this._latticeType = 0;
        this._latticeSpacing = 30;

        // Helix params
        this._helixRadius = 80;
        this._helixPitch = 10;
        this._helixTwist = 0;

        // Ring params
        this._ringCount = 5;
        this._ringTilt = 0;
        this._targetTilt = 0;

        // Shell growth points
        this._shellCenters = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 50 + rng() * 40;
        this.tick = 0;
        this._rng = rng;
        this._shellCenters = [];

        this._rotationSpeed = 0.003 + rng() * 0.008;
        this._formationScale = 0.8 + rng() * 0.6;

        // Mode-specific config
        switch (this.mode) {
            case 1:
                this._latticeType = Math.floor(rng() * 3); // cubic, hex, diamond
                this._latticeSpacing = 20 + rng() * 25;
                this.maxParticles = 400;
                break;
            case 2:
                this._helixRadius = 50 + rng() * 80;
                this._helixPitch = 6 + rng() * 10;
                break;
            case 4:
                this._ringCount = 3 + Math.floor(rng() * 5);
                break;
            case 5:
                this.maxParticles = 500;
                break;
        }

        // Initialize particles
        const W = window.innerWidth, H = window.innerHeight;
        this.particles = [];
        const count = Math.min(this.maxParticles, this.mode === 5 ? 500 : 400);

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: rng() * W,
                y: rng() * H,
                vx: 0,
                vy: 0,
                tx: 0, // target x
                ty: 0, // target y
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

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const t = i / this.particles.length;

            switch (this.mode) {
                case 0: { // Golden spiral
                    const angle = i * TAU / PHI;
                    const r = Math.sqrt(i / this.particles.length) * scale;
                    p.tx = cx + Math.cos(angle + this._rotationAngle) * r;
                    p.ty = cy + Math.sin(angle + this._rotationAngle) * r;
                    break;
                }
                case 1: { // Crystal lattice (3D projected)
                    const perSide = Math.ceil(Math.cbrt(this.particles.length));
                    const ix = i % perSide;
                    const iy = Math.floor(i / perSide) % perSide;
                    const iz = Math.floor(i / (perSide * perSide));
                    const spacing = this._latticeSpacing;

                    let lx = (ix - perSide / 2) * spacing;
                    let ly = (iy - perSide / 2) * spacing;
                    let lz = (iz - perSide / 2) * spacing;

                    // Hex offset
                    if (this._latticeType === 1 && iy % 2 === 1) lx += spacing * 0.5;
                    // Diamond
                    if (this._latticeType === 2) {
                        lx += ly * 0.3;
                        lz += ly * 0.3;
                    }

                    // Rotate in 3D
                    const cosA = Math.cos(this._rotationAngle);
                    const sinA = Math.sin(this._rotationAngle);
                    const cosB = Math.cos(this._rotationAngle * 0.7);
                    const sinB = Math.sin(this._rotationAngle * 0.7);

                    const rx = lx * cosA - lz * sinA;
                    const rz = lx * sinA + lz * cosA;
                    const ry = ly * cosB - rz * sinB;

                    // Perspective projection
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

                    // 3D rotation
                    const cosR = Math.cos(this._rotationAngle * 0.3);
                    const sinR = Math.sin(this._rotationAngle * 0.3);
                    const px = x * cosR;
                    const depth = x * sinR;
                    const perspective = 400 / (400 + depth + 200);

                    p.tx = cx + px * perspective;
                    p.ty = cy + y * perspective;

                    // Rungs between strands
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
                    const shellR = Math.exp(0.15 * (t * TAU * 4)) * 5;
                    const clampedR = Math.min(shellR, scale);
                    p.tx = center.x + Math.cos(shellAngle) * clampedR;
                    p.ty = center.y + Math.sin(shellAngle) * clampedR;
                    break;
                }
                case 4: { // Orbital rings
                    const ring = Math.floor(t * this._ringCount);
                    const ringT = (t * this._ringCount) % 1;
                    const ringRadius = (ring + 1) / this._ringCount * scale;
                    const ringAngle = ringT * TAU + ring * 0.5 + this._rotationAngle * (ring % 2 === 0 ? 1 : -1);

                    // Tilt rings
                    const tiltY = Math.sin(this._ringTilt + ring * 0.8) * 0.5;
                    const x = Math.cos(ringAngle) * ringRadius;
                    const y = Math.sin(ringAngle) * ringRadius * (0.3 + Math.abs(Math.cos(this._ringTilt + ring * 0.8)) * 0.7);

                    p.tx = cx + x;
                    p.ty = cy + y;
                    break;
                }
                case 5: { // Flock murmuration - no fixed targets, use flocking
                    // Targets computed dynamically in update
                    break;
                }
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;
        this._isClicking = isClicking;

        const dx = mx - this._prevMX;
        const dy = my - this._prevMY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._prevMX = mx;
        this._prevMY = my;

        // Rotation
        this._rotationAngle += this._rotationSpeed;
        this._helixTwist += 0.01;

        // Ring tilt follows cursor
        if (this.mode === 4) {
            this._targetTilt = (my / window.innerHeight - 0.5) * Math.PI * 0.8;
            this._ringTilt += (this._targetTilt - this._ringTilt) * 0.02;
        }

        // Shell growth on click
        if (this.mode === 3 && isClicking && this.tick % 30 === 0) {
            this._shellCenters.push({ x: mx, y: my });
            if (this._shellCenters.length > 5) this._shellCenters.shift();
        }

        // Recompute formation targets (except flock mode)
        if (this.mode !== 5) {
            this._computeFormation();
        }

        // Update particles
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Distance to cursor
            const cdx = mx - p.x;
            const cdy = my - p.y;
            const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;

            if (this.mode === 5) {
                // Flocking behavior
                let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0;
                let neighbors = 0;
                // Sample a subset for performance
                const step = Math.max(1, Math.floor(this.particles.length / 50));
                for (let j = 0; j < this.particles.length; j += step) {
                    if (j === i) continue;
                    const other = this.particles[j];
                    const odx = other.x - p.x;
                    const ody = other.y - p.y;
                    const od = odx * odx + ody * ody;
                    if (od < 3600 && od > 0) { // Within 60px
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

                // Cursor attraction/repulsion
                if (cd < 200) {
                    const force = isClicking ? -2 : 0.5;
                    p.vx += (cdx / cd) * force * (1 - cd / 200) * 0.1;
                    p.vy += (cdy / cd) * force * (1 - cd / 200) * 0.1;
                }

                // Shape-shifting force: periodically attract to a center
                const shapeCX = window.innerWidth / 2 + Math.sin(this.tick * 0.002) * 200;
                const shapeCY = window.innerHeight / 2 + Math.cos(this.tick * 0.003) * 150;
                p.vx += (shapeCX - p.x) * 0.0003;
                p.vy += (shapeCY - p.y) * 0.0003;

                // Speed limit
                const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (spd > 3) { p.vx = (p.vx / spd) * 3; p.vy = (p.vy / spd) * 3; }

                p.vx *= 0.98;
                p.vy *= 0.98;
                p.x += p.vx;
                p.y += p.vy;
            } else {
                // Formation mode: spring toward target, repelled by cursor
                let fx = (p.tx - p.x) * p.returnSpeed;
                let fy = (p.ty - p.y) * p.returnSpeed;

                // Cursor disruption
                const disruptRadius = isClicking ? 250 : 150;
                if (cd < disruptRadius) {
                    const force = (1 - cd / disruptRadius) * (isClicking ? 5 : 2);
                    fx -= (cdx / cd) * force;
                    fy -= (cdy / cd) * force;
                }

                // Small wandering
                fx += Math.sin(this.tick * 0.02 + p.phase) * 0.05;
                fy += Math.cos(this.tick * 0.025 + p.phase * 1.3) * 0.05;

                p.vx = (p.vx + fx) * 0.9;
                p.vy = (p.vy + fy) * 0.9;
                p.x += p.vx;
                p.y += p.vy;
            }

            // Screen wrap
            const W = window.innerWidth, H = window.innerHeight;
            if (p.x < -20) p.x = W + 20;
            if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20;
            if (p.y > H + 20) p.y = -20;
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Batch particles by approximate hue for fewer style changes
        // Since most share similar hues, we can draw many with one fillStyle
        const baseAlpha = 0.4;

        for (const p of this.particles) {
            const alpha = p.alpha * baseAlpha;
            const size = p.size;

            // Speed-based brightness boost
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const brightBoost = Math.min(1, speed * 0.3);

            ctx.fillStyle = `hsla(${p.hue}, ${this.saturation}%, ${55 + brightBoost * 25}%, ${alpha + brightBoost * 0.1})`;
            ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);

            // Glow for fast particles
            if (speed > 2) {
                ctx.fillStyle = `hsla(${p.hue}, ${this.saturation}%, 75%, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 2, 0, TAU);
                ctx.fill();
            }
        }

        // Mode-specific overlays
        if (this.mode === 4) {
            // Ring traces
            const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
            const scale = Math.min(window.innerWidth, window.innerHeight) * 0.35 * this._formationScale;
            ctx.lineWidth = 0.5;
            for (let r = 0; r < this._ringCount; r++) {
                const ringRadius = (r + 1) / this._ringCount * scale;
                const yScale = 0.3 + Math.abs(Math.cos(this._ringTilt + r * 0.8)) * 0.7;
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, 0.05)`;
                ctx.beginPath();
                ctx.ellipse(cx, cy, ringRadius, ringRadius * yScale, 0, 0, TAU);
                ctx.stroke();
            }
        }

        if (this.mode === 2) {
            // Helix backbone hint
            ctx.lineWidth = 0.3;
            ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 60%, 0.03)`;
            ctx.beginPath();
            const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
            for (let t = 0; t < 1; t += 0.005) {
                const helixT = t * 20;
                const x = Math.cos(helixT + this._helixTwist) * this._helixRadius;
                const y = (t - 0.5) * window.innerHeight * 0.8;
                const cosR = Math.cos(this._rotationAngle * 0.3);
                const perspective = 400 / (400 + x * Math.sin(this._rotationAngle * 0.3) + 200);
                const px = cx + x * cosR * perspective;
                const py = cy + y * perspective;
                if (t === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
}
