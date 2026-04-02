/**
 * @file prism_refraction_effects.js
 * @description Light beams traverse the canvas and refract through crystal prisms
 * placed by user clicks. Beams split into rainbow spectra when passing through
 * crystals, creating beautiful caustic patterns. Crystal shapes and beam behaviors
 * vary dramatically by seed.
 *
 * Modes:
 * 0 - Classic Prism: triangular crystals split white beams into rainbow fans
 * 1 - Disco Ball: rotating faceted sphere at cursor scatters light everywhere
 * 2 - Ice Cave: hexagonal ice crystals that slowly grow and refract beams
 * 3 - Fiber Optic: beams travel along curved paths, split at junction nodes
 * 4 - Lighthouse: rotating beam sweeps across field of randomly placed crystals
 * 5 - Laser Maze: beams bounce off mirror-crystals, cursor redirects reflections
 */

const TAU = Math.PI * 2;

class Crystal {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.size = 20;
        this.sides = 3;
        this.hue = 0;
        this.life = 0;
        this.maxLife = 500;
        this.growProgress = 0;
        this.refractAngle = 0.4;
        this.facets = 3;
        this.age = 0; // Visual aging
    }
}

class LightBeam {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.speed = 3;
        this.hue = 0;
        this.alpha = 0.4;
        this.width = 2;
        this.life = 0;
        this.maxLife = 200;
        this.trail = [];
        this.maxTrail = 40;
        this.isRainbow = false;
        this.wavelength = 0;
    }
}

export class PrismRefraction {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 80;
        this.intensity = 1;
        this._rng = Math.random;

        this.crystals = [];
        this.crystalPool = [];
        this.maxCrystals = 15;

        this.beams = [];
        this.beamPool = [];
        this.maxBeams = 30;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMX = 0;
        this._prevMY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this._lighthouseAngle = 0;
        this._lighthouseSpeed = 0.02;
        this._discoRotation = 0;
        this._discoFacets = 12;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 60 + rng() * 30;
        this.intensity = 0.7 + rng() * 0.6;
        this.tick = 0;
        this._rng = rng;

        for (const c of this.crystals) this.crystalPool.push(c);
        for (const b of this.beams) this.beamPool.push(b);
        this.crystals = [];
        this.beams = [];

        this._lighthouseSpeed = 0.01 + rng() * 0.03;
        this._discoFacets = 8 + Math.floor(rng() * 12);

        if (this.mode === 2 || this.mode === 4 || this.mode === 5) {
            const count = 5 + Math.floor(rng() * 8);
            const W = window.innerWidth, H = window.innerHeight;
            for (let i = 0; i < count; i++) {
                this._spawnCrystal(
                    rng() * W * 0.8 + W * 0.1,
                    rng() * H * 0.8 + H * 0.1,
                    rng
                );
            }
        }
    }

    _spawnCrystal(x, y, rng) {
        if (this.crystals.length >= this.maxCrystals) return;
        const c = this.crystalPool.length > 0 ? this.crystalPool.pop() : new Crystal();
        c.x = x;
        c.y = y;
        c.rotation = rng() * TAU;
        c.size = 15 + rng() * 30;
        c.hue = (this.hue + rng() * 60 - 30 + 360) % 360;
        c.life = 400 + Math.floor(rng() * 300);
        c.maxLife = c.life;
        c.growProgress = 0;
        c.refractAngle = 0.2 + rng() * 0.6;
        c.age = 0;

        switch (this.mode) {
            case 0: c.sides = 3; break;
            case 2: c.sides = 6; break;
            case 5: c.sides = 4; break;
            default: c.sides = 3 + Math.floor(rng() * 4); break;
        }
        c.facets = c.sides;

        this.crystals.push(c);
    }

    _spawnBeam(x, y, angle, rng, isRainbow = false, wavelength = -1) {
        if (this.beams.length >= this.maxBeams) return;
        const b = this.beamPool.length > 0 ? this.beamPool.pop() : new LightBeam();
        b.x = x;
        b.y = y;
        b.angle = angle;
        b.speed = 2 + rng() * 3;
        b.alpha = 0.35;
        b.width = isRainbow ? 1.5 : 2;
        b.life = 120 + Math.floor(rng() * 80);
        b.maxLife = b.life;
        b.trail = [];
        b.isRainbow = isRainbow;
        b.wavelength = wavelength >= 0 ? wavelength : -1;

        if (isRainbow && wavelength >= 0) {
            b.hue = wavelength * 51;
        } else {
            b.hue = this.hue;
        }

        this.beams.push(b);
    }

    _refractBeam(crystal, beam) {
        const spread = crystal.refractAngle;
        const colors = 7;
        for (let i = 0; i < colors; i++) {
            const offsetAngle = beam.angle + (i / colors - 0.5) * spread;
            this._spawnBeam(beam.x, beam.y, offsetAngle, this._rng, true, i);
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

        // Click to place crystal + mode-specific actions
        if (isClicking && !this._wasClicking) {
            switch (this.mode) {
                case 0: case 3:
                    this._spawnCrystal(mx, my, this._rng);
                    break;
                case 1: // Disco: click pulses a burst of beams
                    for (let i = 0; i < this._discoFacets; i++) {
                        const angle = (i / this._discoFacets) * TAU + this._discoRotation;
                        this._spawnBeam(mx, my, angle, this._rng, true, i % 7);
                    }
                    break;
                case 2: // Ice: click shatters nearest crystal into beams
                    { let nearest = null, nd = Infinity;
                    for (const c of this.crystals) {
                        const d = (c.x - mx) ** 2 + (c.y - my) ** 2;
                        if (d < nd && d < 10000) { nd = d; nearest = c; }
                    }
                    if (nearest) {
                        for (let i = 0; i < 7; i++) {
                            this._spawnBeam(nearest.x, nearest.y, (i / 7) * TAU, this._rng, true, i);
                        }
                        nearest.growProgress *= 0.5; // Crack effect
                    }
                    } break;
                case 4: // Lighthouse: click reverses rotation
                    this._lighthouseSpeed *= -1;
                    break;
                case 5: // Laser: click fires a beam from cursor
                    this._spawnBeam(mx, my,
                        Math.atan2(my - window.innerHeight / 2, mx - window.innerWidth / 2),
                        this._rng);
                    break;
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Spawn beams (with cap enforcement)
        if (this.beams.length < this.maxBeams) {
            switch (this.mode) {
                case 0:
                    if (this.tick % 30 === 0) {
                        const edge = Math.floor(this._rng() * 4);
                        const W = window.innerWidth, H = window.innerHeight;
                        let bx, by, ba;
                        if (edge === 0) { bx = 0; by = this._rng() * H; ba = this._rng() * 0.6 - 0.3; }
                        else if (edge === 1) { bx = W; by = this._rng() * H; ba = Math.PI + this._rng() * 0.6 - 0.3; }
                        else if (edge === 2) { bx = this._rng() * W; by = 0; ba = Math.PI / 2 + this._rng() * 0.6 - 0.3; }
                        else { bx = this._rng() * W; by = H; ba = -Math.PI / 2 + this._rng() * 0.6 - 0.3; }
                        this._spawnBeam(bx, by, ba, this._rng);
                    }
                    break;
                case 1: // Disco
                    this._discoRotation += 0.03;
                    if (this.tick % 5 === 0) {
                        const facet = (this.tick / 5) % this._discoFacets;
                        const angle = (facet / this._discoFacets) * TAU + this._discoRotation;
                        this._spawnBeam(mx, my, angle, this._rng, true, Math.floor(this._rng() * 7));
                    }
                    break;
                case 3: // Fiber optic
                    if (this.tick % 15 === 0) {
                        this._spawnBeam(mx, my, this._rng() * TAU, this._rng);
                    }
                    break;
                case 4: // Lighthouse
                    this._lighthouseAngle += this._lighthouseSpeed;
                    if (this.tick % 3 === 0) {
                        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
                        this._spawnBeam(cx, cy, this._lighthouseAngle, this._rng);
                    }
                    break;
                case 5: // Laser maze - speed-responsive: faster cursor = more beams
                    if (this.tick % 8 === 0 && (isClicking || this._mouseSpeed > 5)) {
                        const angle = Math.atan2(my - window.innerHeight / 2, mx - window.innerWidth / 2);
                        this._spawnBeam(mx, my, angle, this._rng);
                    }
                    break;
            }
        }

        // Update crystals with aging
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const c = this.crystals[i];
            c.growProgress = Math.min(1, c.growProgress + 0.02);
            c.age++;

            if (this.mode === 2) {
                c.rotation += 0.002;
                c.size = Math.min(c.size + 0.02, 50);
            }

            // Non-persistent crystals age and die
            if (this.mode !== 2 && this.mode !== 4 && this.mode !== 5) {
                c.life--;
                if (c.life <= 0) {
                    this.crystalPool.push(c);
                    this.crystals[i] = this.crystals[this.crystals.length - 1];
                    this.crystals.pop();
                }
            }
        }

        // Update beams
        const W = window.innerWidth, H = window.innerHeight;
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const b = this.beams[i];
            b.life--;

            let moveX = Math.cos(b.angle) * b.speed;
            let moveY = Math.sin(b.angle) * b.speed;

            // Fiber optic: curve toward cursor
            if (this.mode === 3) {
                const bdx = mx - b.x, bdy = my - b.y;
                const targetAngle = Math.atan2(bdy, bdx);
                let diff = targetAngle - b.angle;
                if (diff > Math.PI) diff -= TAU;
                if (diff < -Math.PI) diff += TAU;
                b.angle += diff * 0.02;
                moveX = Math.cos(b.angle) * b.speed;
                moveY = Math.sin(b.angle) * b.speed;
            }

            b.x += moveX;
            b.y += moveY;

            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > b.maxTrail) b.trail.shift();

            // Crystal collisions: only fully grown crystals
            if (!b.isRainbow) {
                for (const c of this.crystals) {
                    if (c.growProgress < 0.5) continue;
                    const cdx = b.x - c.x, cdy = b.y - c.y;
                    const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cd < c.size * c.growProgress) {
                        this._refractBeam(c, b);
                        b.life = 0;
                        break;
                    }
                }
            }

            // Laser maze: rainbow beams reflect off crystals
            if (this.mode === 5 && b.isRainbow) {
                for (const c of this.crystals) {
                    if (c.growProgress < 0.5) continue;
                    const cdx = b.x - c.x, cdy = b.y - c.y;
                    const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cd < c.size * c.growProgress) {
                        const normal = Math.atan2(cdy, cdx);
                        b.angle = 2 * normal - b.angle + Math.PI;
                        b.x = c.x + Math.cos(normal) * (c.size + 2);
                        b.y = c.y + Math.sin(normal) * (c.size + 2);
                        break;
                    }
                }
            }

            if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
                this.beamPool.push(b);
                this.beams[i] = this.beams[this.beams.length - 1];
                this.beams.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw crystals
        for (const c of this.crystals) {
            const size = c.size * c.growProgress;
            if (size < 2) continue;

            const lifeAlpha = (c.life < 60 ? c.life / 60 : 1) * this.intensity;
            // Aging shimmer
            const shimmer = Math.sin(this.tick * 0.03 + c.age * 0.01) * 0.1 + 0.9;

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);

            // Outer glow (larger, softer)
            const outerGrad = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2.5);
            outerGrad.addColorStop(0, `hsla(${c.hue}, ${this.saturation}%, 75%, ${0.1 * lifeAlpha * shimmer})`);
            outerGrad.addColorStop(1, `hsla(${c.hue}, ${this.saturation}%, 75%, 0)`);
            ctx.fillStyle = outerGrad;
            ctx.beginPath();
            ctx.arc(0, 0, size * 2.5, 0, TAU);
            ctx.fill();

            // Crystal body
            ctx.beginPath();
            for (let i = 0; i < c.sides; i++) {
                const angle = (i / c.sides) * TAU;
                const x = Math.cos(angle) * size;
                const y = Math.sin(angle) * size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();

            ctx.fillStyle = `hsla(${c.hue}, ${this.saturation}%, 70%, ${0.12 * lifeAlpha})`;
            ctx.fill();
            ctx.strokeStyle = `hsla(${c.hue}, ${this.saturation}%, 85%, ${0.4 * lifeAlpha * shimmer})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Inner facet lines
            ctx.lineWidth = 0.5;
            for (let i = 0; i < c.sides; i++) {
                const angle = (i / c.sides) * TAU;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
                ctx.strokeStyle = `hsla(${c.hue}, ${this.saturation}%, 90%, ${0.15 * lifeAlpha})`;
                ctx.stroke();
            }

            // Inner glow core
            const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
            innerGrad.addColorStop(0, `hsla(${c.hue}, 100%, 90%, ${0.15 * lifeAlpha * shimmer})`);
            innerGrad.addColorStop(1, `hsla(${c.hue}, ${this.saturation}%, 80%, 0)`);
            ctx.fillStyle = innerGrad;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.6, 0, TAU);
            ctx.fill();

            ctx.restore();
        }

        // Draw beams with multi-pass
        for (const b of this.beams) {
            if (b.trail.length < 2) continue;

            const lifeAlpha = Math.min(1, b.life / 30) * b.alpha * this.intensity;

            // Pass 1: Wide glow
            ctx.beginPath();
            ctx.moveTo(b.trail[0].x, b.trail[0].y);
            for (let i = 1; i < b.trail.length; i++) {
                ctx.lineTo(b.trail[i].x, b.trail[i].y);
            }
            ctx.lineWidth = b.width * 4;
            ctx.lineCap = 'round';
            if (b.isRainbow) {
                ctx.strokeStyle = `hsla(${b.hue}, 100%, 65%, ${lifeAlpha * 0.15})`;
            } else {
                ctx.strokeStyle = `hsla(0, 0%, 90%, ${lifeAlpha * 0.12})`;
            }
            ctx.stroke();

            // Pass 2: Core beam
            ctx.lineWidth = b.width;
            if (b.isRainbow) {
                ctx.strokeStyle = `hsla(${b.hue}, 100%, 70%, ${lifeAlpha})`;
            } else {
                ctx.strokeStyle = `hsla(0, 0%, 95%, ${lifeAlpha})`;
            }
            ctx.stroke();

            // Beam head glow
            const head = b.trail[b.trail.length - 1];
            const glowSize = b.isRainbow ? 5 : 8;
            const headGrad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, glowSize);
            const headColor = b.isRainbow ?
                `hsla(${b.hue}, 100%, 85%,` : `hsla(0, 0%, 100%,`;
            headGrad.addColorStop(0, headColor + (lifeAlpha * 0.6) + ')');
            headGrad.addColorStop(1, headColor + '0)');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(head.x, head.y, glowSize, 0, TAU);
            ctx.fill();
        }

        // Disco ball center
        if (this.mode === 1) {
            const gx = this._mouseX, gy = this._mouseY;
            // Multi-layer disco ball
            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 25);
            grad.addColorStop(0, `hsla(0, 0%, 100%, 0.2)`);
            grad.addColorStop(0.5, `hsla(0, 0%, 85%, 0.08)`);
            grad.addColorStop(1, `hsla(0, 0%, 80%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(gx, gy, 25, 0, TAU);
            ctx.fill();

            // Rotating facet sparkles
            ctx.lineWidth = 1;
            for (let i = 0; i < this._discoFacets; i++) {
                const angle = (i / this._discoFacets) * TAU + this._discoRotation;
                const sparkle = Math.sin(this.tick * 0.15 + i * 0.8) * 0.5 + 0.5;
                ctx.strokeStyle = `hsla(${(i / this._discoFacets) * 360}, 70%, 75%, ${0.2 * sparkle})`;
                ctx.beginPath();
                ctx.moveTo(gx + Math.cos(angle) * 5, gy + Math.sin(angle) * 5);
                ctx.lineTo(gx + Math.cos(angle) * 18, gy + Math.sin(angle) * 18);
                ctx.stroke();
            }
        }

        // Lighthouse center glow
        if (this.mode === 4) {
            const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
            grad.addColorStop(0, `hsla(60, 100%, 92%, 0.25)`);
            grad.addColorStop(0.5, `hsla(50, 90%, 80%, 0.08)`);
            grad.addColorStop(1, `hsla(60, 100%, 90%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }
}
