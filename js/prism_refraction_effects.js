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
const DEG60 = Math.PI / 3;

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
        this.refractAngle = 0.4; // How much to spread beams
        this.facets = 3;
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
        this.wavelength = 0; // 0-6 for ROYGBIV
    }
}

export class PrismRefraction {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.saturation = 80;
        this._rng = Math.random;

        this.crystals = [];
        this.crystalPool = [];
        this.maxCrystals = 15;

        this.beams = [];
        this.beamPool = [];
        this.maxBeams = 30;

        this._mouseX = 0;
        this._mouseY = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Lighthouse
        this._lighthouseAngle = 0;
        this._lighthouseSpeed = 0.02;

        // Disco
        this._discoRotation = 0;
        this._discoFacets = 12;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.saturation = 60 + rng() * 30;
        this.tick = 0;
        this._rng = rng;

        for (const c of this.crystals) this.crystalPool.push(c);
        for (const b of this.beams) this.beamPool.push(b);
        this.crystals = [];
        this.beams = [];

        this._lighthouseSpeed = 0.01 + rng() * 0.03;
        this._discoFacets = 8 + Math.floor(rng() * 12);

        // Pre-place crystals for some modes
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

        switch (this.mode) {
            case 0: c.sides = 3; break;
            case 2: c.sides = 6; break;
            case 5: c.sides = 4; break; // Mirrors are rectangles
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
        b.alpha = 0.3;
        b.width = isRainbow ? 1.5 : 2;
        b.life = 120 + Math.floor(rng() * 80);
        b.maxLife = b.life;
        b.trail = [];
        b.isRainbow = isRainbow;
        b.wavelength = wavelength >= 0 ? wavelength : -1;

        if (isRainbow && wavelength >= 0) {
            b.hue = wavelength * 51; // 0, 51, 102, 153, 204, 255, 306
        } else {
            b.hue = this.hue;
        }

        this.beams.push(b);
    }

    _refractBeam(crystal, beam) {
        // Split beam into rainbow spectrum
        const spread = crystal.refractAngle;
        const colors = 7;
        for (let i = 0; i < colors; i++) {
            const offsetAngle = beam.angle + (i / colors - 0.5) * spread;
            this._spawnBeam(
                beam.x, beam.y, offsetAngle, this._rng,
                true, i
            );
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._mouseX = mx;
        this._mouseY = my;

        // Click to place crystal
        if (isClicking && !this._wasClicking) {
            if (this.mode === 0 || this.mode === 3) {
                this._spawnCrystal(mx, my, this._rng);
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Spawn beams based on mode
        switch (this.mode) {
            case 0: // Classic - beams from edges
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

            case 1: // Disco ball
                this._discoRotation += 0.03;
                if (this.tick % 5 === 0) {
                    const facet = (this.tick / 5) % this._discoFacets;
                    const angle = (facet / this._discoFacets) * TAU + this._discoRotation;
                    this._spawnBeam(mx, my, angle, this._rng, true,
                        Math.floor(this._rng() * 7));
                }
                break;

            case 3: // Fiber optic - curved beams from cursor
                if (this.tick % 15 === 0) {
                    const angle = this._rng() * TAU;
                    this._spawnBeam(mx, my, angle, this._rng);
                }
                break;

            case 4: // Lighthouse
                this._lighthouseAngle += this._lighthouseSpeed;
                if (this.tick % 3 === 0) {
                    const cx = window.innerWidth / 2;
                    const cy = window.innerHeight / 2;
                    this._spawnBeam(cx, cy, this._lighthouseAngle, this._rng);
                }
                break;

            case 5: // Laser maze - beam from cursor direction
                if (this.tick % 8 === 0 && isClicking) {
                    const angle = Math.atan2(my - window.innerHeight / 2, mx - window.innerWidth / 2);
                    this._spawnBeam(mx, my, angle, this._rng);
                }
                break;
        }

        // Update crystals
        for (let i = this.crystals.length - 1; i >= 0; i--) {
            const c = this.crystals[i];
            c.growProgress = Math.min(1, c.growProgress + 0.02);

            if (this.mode === 2) {
                // Ice crystals slowly rotate
                c.rotation += 0.002;
                c.size = Math.min(c.size + 0.02, 50);
            }

            // Persistent modes don't die
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

            // Move beam
            let moveX = Math.cos(b.angle) * b.speed;
            let moveY = Math.sin(b.angle) * b.speed;

            // Fiber optic: curve toward cursor
            if (this.mode === 3) {
                const dx = mx - b.x, dy = my - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - b.angle;
                while (diff > Math.PI) diff -= TAU;
                while (diff < -Math.PI) diff += TAU;
                b.angle += diff * 0.02;
                moveX = Math.cos(b.angle) * b.speed;
                moveY = Math.sin(b.angle) * b.speed;
            }

            b.x += moveX;
            b.y += moveY;

            // Record trail
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > b.maxTrail) b.trail.shift();

            // Check crystal collisions (only for non-rainbow beams)
            if (!b.isRainbow) {
                for (const c of this.crystals) {
                    if (c.growProgress < 0.5) continue;
                    const cdx = b.x - c.x;
                    const cdy = b.y - c.y;
                    const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cd < c.size * c.growProgress) {
                        this._refractBeam(c, b);
                        b.life = 0;
                        break;
                    }
                }
            }

            // Laser maze: reflect off mirror crystals
            if (this.mode === 5 && b.isRainbow) {
                for (const c of this.crystals) {
                    const cdx = b.x - c.x;
                    const cdy = b.y - c.y;
                    const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cd < c.size * c.growProgress) {
                        // Reflect
                        const normal = Math.atan2(cdy, cdx);
                        b.angle = 2 * normal - b.angle + Math.PI;
                        b.x = c.x + Math.cos(normal) * (c.size + 2);
                        b.y = c.y + Math.sin(normal) * (c.size + 2);
                        break;
                    }
                }
            }

            // Remove off-screen or dead beams
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

            const lifeAlpha = c.life < 60 ? c.life / 60 : 1;

            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);

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

            ctx.fillStyle = `hsla(${c.hue}, ${this.saturation}%, 70%, ${0.05 * lifeAlpha})`;
            ctx.fill();
            ctx.strokeStyle = `hsla(${c.hue}, ${this.saturation}%, 80%, ${0.3 * lifeAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Inner facet lines
            for (let i = 0; i < c.sides; i++) {
                const angle = (i / c.sides) * TAU;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * size * 0.7, Math.sin(angle) * size * 0.7);
                ctx.strokeStyle = `hsla(${c.hue}, ${this.saturation}%, 85%, ${0.1 * lifeAlpha})`;
                ctx.stroke();
            }

            // Crystal glow
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
            grad.addColorStop(0, `hsla(${c.hue}, ${this.saturation}%, 80%, ${0.08 * lifeAlpha})`);
            grad.addColorStop(1, `hsla(${c.hue}, ${this.saturation}%, 80%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, 0, TAU);
            ctx.fill();

            ctx.restore();
        }

        // Draw beams
        for (const b of this.beams) {
            if (b.trail.length < 2) continue;

            const lifeAlpha = Math.min(1, b.life / 30) * b.alpha;

            ctx.beginPath();
            ctx.moveTo(b.trail[0].x, b.trail[0].y);
            for (let i = 1; i < b.trail.length; i++) {
                ctx.lineTo(b.trail[i].x, b.trail[i].y);
            }

            ctx.lineWidth = b.width;
            ctx.lineCap = 'round';

            if (b.isRainbow) {
                ctx.strokeStyle = `hsla(${b.hue}, 100%, 65%, ${lifeAlpha})`;
            } else {
                ctx.strokeStyle = `hsla(0, 0%, 90%, ${lifeAlpha})`;
            }
            ctx.stroke();

            // Beam head glow
            const head = b.trail[b.trail.length - 1];
            const glowSize = b.isRainbow ? 4 : 6;
            ctx.fillStyle = b.isRainbow ?
                `hsla(${b.hue}, 100%, 80%, ${lifeAlpha * 0.5})` :
                `hsla(0, 0%, 100%, ${lifeAlpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(head.x, head.y, glowSize, 0, TAU);
            ctx.fill();
        }

        // Disco ball center glow
        if (this.mode === 1) {
            const gx = this._mouseX, gy = this._mouseY;
            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 30);
            grad.addColorStop(0, `hsla(0, 0%, 100%, 0.15)`);
            grad.addColorStop(0.5, `hsla(0, 0%, 80%, 0.05)`);
            grad.addColorStop(1, `hsla(0, 0%, 80%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(gx, gy, 30, 0, TAU);
            ctx.fill();

            // Rotating facets
            ctx.lineWidth = 0.5;
            for (let i = 0; i < this._discoFacets; i++) {
                const angle = (i / this._discoFacets) * TAU + this._discoRotation;
                ctx.strokeStyle = `hsla(${(i / this._discoFacets) * 360}, 60%, 70%, 0.15)`;
                ctx.beginPath();
                ctx.moveTo(gx + Math.cos(angle) * 5, gy + Math.sin(angle) * 5);
                ctx.lineTo(gx + Math.cos(angle) * 20, gy + Math.sin(angle) * 20);
                ctx.stroke();
            }
        }

        // Lighthouse center
        if (this.mode === 4) {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
            grad.addColorStop(0, `hsla(60, 100%, 90%, 0.2)`);
            grad.addColorStop(1, `hsla(60, 100%, 90%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }
}
