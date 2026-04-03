/**
 * @file shockwave_prism_effects.js
 * @description Prismatic shockwave rings that split white light into spectrum bands.
 * Each click sends expanding rainbow rings that refract and interfere with each other.
 * Mouse movement bends the light paths, creating visible chromatic dispersion.
 *
 * Modes:
 * 0 - Prism Burst: Click sends concentric rainbow rings with spectral separation
 * 1 - Diamond Refraction: Hexagonal faceted shockwaves that split into gem-like patterns
 * 2 - Soap Bubble: Thin-film interference creates iridescent expanding membranes
 * 3 - Newton's Rings: Interference patterns create alternating bright/dark bands
 * 4 - Diffraction Grating: Parallel wave fronts create spectral fans
 * 5 - Supernova Spectrum: Massive explosion with expanding spectral shell and debris
 */

const TAU = Math.PI * 2;
const SPECTRUM = [0, 30, 60, 120, 180, 240, 270, 300]; // Rainbow hues

export class ShockwavePrism {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.waves = [];
        this.wavePool = [];
        this.maxWaves = 15;

        // Debris particles for supernova mode
        this.debris = [];
        this.debrisPool = [];
        this.maxDebris = 200;

        // Interference pattern cache
        this._interferencePhase = 0;

        // Diffraction grating lines
        this._gratingLines = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : Math.floor(rng() * 360);
        this.intensity = 0.6 + rng() * 0.6;
        this.waves = [];
        this.debris = [];
        this._interferencePhase = rng() * TAU;

        if (this.mode === 4) {
            this._gratingLines = [];
            const count = 5 + Math.floor(rng() * 8);
            for (let i = 0; i < count; i++) {
                this._gratingLines.push({
                    angle: rng() * TAU,
                    spacing: 20 + rng() * 40,
                    phase: rng() * TAU,
                    speed: 0.01 + rng() * 0.02
                });
            }
        }
    }

    _spawnWave(x, y, power) {
        if (this.waves.length >= this.maxWaves) return;
        const w = this.wavePool.length > 0 ? this.wavePool.pop() : {};
        w.x = x;
        w.y = y;
        w.radius = 0;
        w.maxRadius = 150 + power * 200;
        w.speed = 2 + power * 4;
        w.life = 1;
        w.power = power;
        w.birthTick = this.tick;
        w.facets = this.mode === 1 ? 6 + Math.floor(Math.random() * 3) : 0;
        this.waves.push(w);
    }

    _spawnDebris(x, y, count) {
        for (let i = 0; i < count && this.debris.length < this.maxDebris; i++) {
            const d = this.debrisPool.length > 0 ? this.debrisPool.pop() : {};
            const angle = Math.random() * TAU;
            const speed = 1 + Math.random() * 6;
            d.x = x;
            d.y = y;
            d.vx = Math.cos(angle) * speed;
            d.vy = Math.sin(angle) * speed;
            d.life = 40 + Math.random() * 80;
            d.maxLife = d.life;
            d.hue = SPECTRUM[Math.floor(Math.random() * SPECTRUM.length)];
            d.size = 1 + Math.random() * 3;
            d.trail = [];
            this.debris.push(d);
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        if (isClicking && !this._wasClicking) {
            const power = 0.5 + Math.min(this._mouseSpeed / 20, 1) * 0.5;
            this._spawnWave(mx, my, power);
            if (this.mode === 5) {
                this._spawnDebris(mx, my, 30 + Math.floor(power * 40));
            }
            if (this.mode === 2) {
                // Soap bubble: spawn cluster
                for (let i = 0; i < 3; i++) {
                    this._spawnWave(
                        mx + (Math.random() - 0.5) * 40,
                        my + (Math.random() - 0.5) * 40,
                        power * (0.5 + Math.random() * 0.5)
                    );
                }
            }
        }

        // Continuous waves on mouse movement for some modes
        if (this._mouseSpeed > 5 && this.tick % 8 === 0) {
            if (this.mode === 0 || this.mode === 3) {
                this._spawnWave(mx, my, 0.3);
            }
        }

        this._wasClicking = isClicking;
        this._isClicking = isClicking;
        this._interferencePhase += 0.02;

        // Update waves
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const w = this.waves[i];
            w.radius += w.speed;
            w.life = Math.max(0, 1 - w.radius / w.maxRadius);
            if (w.life <= 0) {
                this.wavePool.push(w);
                this.waves[i] = this.waves[this.waves.length - 1];
                this.waves.pop();
            }
        }

        // Update debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.x += d.vx;
            d.y += d.vy;
            d.vx *= 0.98;
            d.vy *= 0.98;
            d.vy += 0.02; // slight gravity
            d.life--;

            // Store trail (max 6 points)
            if (this.tick % 2 === 0) {
                d.trail.push(d.x, d.y);
                if (d.trail.length > 12) {
                    d.trail.splice(0, 2);
                }
            }

            if (d.life <= 0) {
                this.debrisPool.push(d);
                this.debris[i] = this.debris[this.debris.length - 1];
                this.debris.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.mode === 0) this._drawPrismBurst(ctx);
        else if (this.mode === 1) this._drawDiamondRefraction(ctx);
        else if (this.mode === 2) this._drawSoapBubble(ctx);
        else if (this.mode === 3) this._drawNewtonRings(ctx);
        else if (this.mode === 4) this._drawDiffractionGrating(ctx);
        else if (this.mode === 5) this._drawSupernovaSpectrum(ctx);

        ctx.restore();
    }

    _drawPrismBurst(ctx) {
        for (const w of this.waves) {
            const bandWidth = 3 + w.radius * 0.08;
            for (let s = 0; s < SPECTRUM.length; s++) {
                const offset = s * bandWidth - (SPECTRUM.length * bandWidth) / 2;
                const r = w.radius + offset;
                if (r < 0) continue;
                const alpha = w.life * 0.25 * this.intensity;
                ctx.strokeStyle = `hsla(${SPECTRUM[s]}, 90%, 65%, ${alpha})`;
                ctx.lineWidth = 1.5 + w.life;
                ctx.beginPath();
                ctx.arc(w.x, w.y, r, 0, TAU);
                ctx.stroke();
            }
            // White core flash
            if (w.life > 0.7) {
                const flash = (w.life - 0.7) * 3.3;
                ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.3 * this.intensity})`;
                ctx.beginPath();
                ctx.arc(w.x, w.y, 10 + (1 - flash) * 20, 0, TAU);
                ctx.fill();
            }
        }
    }

    _drawDiamondRefraction(ctx) {
        for (const w of this.waves) {
            const facets = w.facets || 6;
            for (let s = 0; s < 6; s++) {
                const r = w.radius + s * 4;
                const alpha = w.life * 0.2 * this.intensity;
                const hue = (s * 60 + this.tick * 2) % 360;
                ctx.strokeStyle = `hsla(${hue}, 85%, 70%, ${alpha})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                for (let f = 0; f <= facets; f++) {
                    const angle = (f / facets) * TAU + this.tick * 0.01;
                    const px = w.x + Math.cos(angle) * r;
                    const py = w.y + Math.sin(angle) * r;
                    if (f === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    _drawSoapBubble(ctx) {
        for (const w of this.waves) {
            // Thin-film interference: hue depends on radius (thickness)
            const filmHue = (w.radius * 2 + this.tick * 0.5) % 360;
            const alpha = w.life * 0.12 * this.intensity;

            // Outer membrane
            const grad = ctx.createRadialGradient(w.x, w.y, w.radius * 0.8, w.x, w.y, w.radius);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.7, `hsla(${filmHue}, 80%, 70%, ${alpha * 0.5})`);
            grad.addColorStop(0.85, `hsla(${(filmHue + 60) % 360}, 90%, 75%, ${alpha})`);
            grad.addColorStop(0.95, `hsla(${(filmHue + 120) % 360}, 85%, 65%, ${alpha * 0.7})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, TAU);
            ctx.fill();

            // Specular highlight
            if (w.life > 0.3) {
                const hlx = w.x - w.radius * 0.3;
                const hly = w.y - w.radius * 0.3;
                ctx.fillStyle = `rgba(255, 255, 255, ${w.life * 0.08 * this.intensity})`;
                ctx.beginPath();
                ctx.ellipse(hlx, hly, w.radius * 0.15, w.radius * 0.1, -0.5, 0, TAU);
                ctx.fill();
            }
        }
    }

    _drawNewtonRings(ctx) {
        for (const w of this.waves) {
            const ringCount = Math.floor(w.radius / 12);
            for (let r = 0; r < ringCount; r++) {
                const ringR = r * 12;
                // Interference: alternating constructive/destructive
                const phase = r * 0.5 + this._interferencePhase;
                const brightness = (Math.sin(phase) + 1) / 2;
                const hue = (r * 30 + this.tick * 0.5) % 360;
                const alpha = brightness * w.life * 0.15 * this.intensity;
                ctx.strokeStyle = `hsla(${hue}, 80%, ${50 + brightness * 30}%, ${alpha})`;
                ctx.lineWidth = 2 + brightness * 2;
                ctx.beginPath();
                ctx.arc(w.x, w.y, ringR, 0, TAU);
                ctx.stroke();
            }
        }
    }

    _drawDiffractionGrating(ctx) {
        // Spectral fans from cursor position toward grating lines
        const mx = this._mx, my = this._my;
        for (const line of this._gratingLines) {
            line.phase += line.speed;
            for (let order = -3; order <= 3; order++) {
                if (order === 0) continue;
                const angle = line.angle + order * 0.15 + Math.sin(this.tick * 0.01 + line.phase) * 0.1;
                const hue = Math.abs(order) === 1 ? 0 : Math.abs(order) === 2 ? 120 : 240;
                const len = 100 + Math.abs(order) * 50;
                const alpha = (0.08 / Math.abs(order)) * this.intensity;
                ctx.strokeStyle = `hsla(${(hue + this.tick) % 360}, 80%, 65%, ${alpha})`;
                ctx.lineWidth = 2 / Math.abs(order);
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(
                    mx + Math.cos(angle) * len,
                    my + Math.sin(angle) * len
                );
                ctx.stroke();
            }
        }

        // Draw waves normally
        for (const w of this.waves) {
            for (let s = 0; s < SPECTRUM.length; s++) {
                const r = w.radius + s * 3;
                const alpha = w.life * 0.15 * this.intensity;
                ctx.strokeStyle = `hsla(${SPECTRUM[s]}, 85%, 65%, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(w.x, w.y, r, 0, TAU);
                ctx.stroke();
            }
        }
    }

    _drawSupernovaSpectrum(ctx) {
        // Expanding spectral shell
        for (const w of this.waves) {
            // Inner white-hot core
            if (w.life > 0.5) {
                const coreAlpha = (w.life - 0.5) * 2 * 0.4 * this.intensity;
                const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.radius * 0.3);
                grad.addColorStop(0, `rgba(255, 255, 240, ${coreAlpha})`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.radius * 0.3, 0, TAU);
                ctx.fill();
            }

            // Spectral shell bands
            for (let s = 0; s < SPECTRUM.length; s++) {
                const bandR = w.radius * (0.85 + s * 0.025);
                const alpha = w.life * 0.2 * this.intensity;
                ctx.strokeStyle = `hsla(${SPECTRUM[s]}, 90%, 65%, ${alpha})`;
                ctx.lineWidth = 2 + w.life * 3;
                ctx.beginPath();
                ctx.arc(w.x, w.y, bandR, 0, TAU);
                ctx.stroke();
            }
        }

        // Debris trails
        for (const d of this.debris) {
            const lifeRatio = d.life / d.maxLife;
            const alpha = lifeRatio * 0.5 * this.intensity;

            // Trail
            if (d.trail.length >= 4) {
                ctx.strokeStyle = `hsla(${d.hue}, 80%, 60%, ${alpha * 0.3})`;
                ctx.lineWidth = d.size * 0.5;
                ctx.beginPath();
                ctx.moveTo(d.trail[0], d.trail[1]);
                for (let t = 2; t < d.trail.length; t += 2) {
                    ctx.lineTo(d.trail[t], d.trail[t + 1]);
                }
                ctx.lineTo(d.x, d.y);
                ctx.stroke();
            }

            // Particle
            ctx.fillStyle = `hsla(${d.hue}, 85%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size * lifeRatio, 0, TAU);
            ctx.fill();
        }
    }
}
