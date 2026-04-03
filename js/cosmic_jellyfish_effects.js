/**
 * @file cosmic_jellyfish_effects.js
 * @description Bioluminescent jellyfish-like entities that float across the screen.
 * Each has a pulsating bell, trailing tentacles, and responds to cursor proximity.
 * Clicking near them causes a bioluminescent flash. The cursor acts as a current
 * that pushes them gently.
 *
 * Modes:
 * 0 - Deep Ocean: Translucent bells with long flowing tentacles, deep blue palette
 * 1 - Alien Bloom: Geometric jellyfish with fractal tentacle patterns, neon colors
 * 2 - Lantern Festival: Glowing paper lantern-like creatures that drift upward
 * 3 - Spore Cloud: Tiny pulsating spores that cluster and separate, trailing threads
 * 4 - Medusa Swarm: Large aggressive jellyfish that hunt the cursor with stinging arcs
 * 5 - Celestial Drift: Ethereal translucent forms with star-like inner organs
 */

const TAU = Math.PI * 2;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class CosmicJellyfish {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 220;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.jellies = [];
        this.maxJellies = 12;

        // Flash particles on click
        this._flashes = [];
        this._flashPool = [];
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 220;
        this.intensity = 0.5 + rng() * 0.6;
        this.jellies = [];
        this._flashes = [];

        const W = window.innerWidth, H = window.innerHeight;
        const count = this.mode === 3 ? 20 + Math.floor(rng() * 15)
            : this.mode === 4 ? 4 + Math.floor(rng() * 3)
            : 6 + Math.floor(rng() * 6);
        this.maxJellies = count;

        for (let i = 0; i < count; i++) {
            const size = this.mode === 3 ? 8 + rng() * 12
                : this.mode === 4 ? 40 + rng() * 40
                : 15 + rng() * 35;
            this.jellies.push({
                x: rng() * W,
                y: rng() * H,
                vx: (rng() - 0.5) * 0.5,
                vy: this.mode === 2 ? -0.5 - rng() * 1 : (rng() - 0.5) * 0.3,
                size,
                bellPhase: rng() * TAU,
                bellSpeed: 0.02 + rng() * 0.03,
                hueOffset: (rng() - 0.5) * 40,
                tentacleCount: this.mode === 3 ? 3 : 4 + Math.floor(rng() * 5),
                tentacleLength: size * (1.5 + rng() * 2),
                tentaclePhase: rng() * TAU,
                tentacleSpeed: 0.01 + rng() * 0.02,
                glow: 0.3 + rng() * 0.5,
                // Trail history for tentacles
                history: [],
                maxHistory: 12,
                // Inner organs for celestial mode
                organCount: 2 + Math.floor(rng() * 4),
                organPhase: rng() * TAU,
            });
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Click flash - always spawn bioluminescent burst, plus disturb nearby jellies
        if (isClicking && !this._wasClicking) {
            let hitAny = false;
            for (const j of this.jellies) {
                const dx = mx - j.x, dy = my - j.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < j.size * 3 + 100) {
                    j.glow = 1;
                    hitAny = true;
                    // Spawn flash particles from jellyfish
                    for (let f = 0; f < 8; f++) {
                        const seed = this.tick * 31 + f * 97;
                        const flash = this._flashPool.length > 0 ? this._flashPool.pop() : {};
                        const angle = _prand(seed) * TAU;
                        flash.x = j.x;
                        flash.y = j.y;
                        flash.vx = Math.cos(angle) * (1 + _prand(seed + 1) * 3);
                        flash.vy = Math.sin(angle) * (1 + _prand(seed + 2) * 3);
                        flash.life = 20 + _prand(seed + 3) * 20;
                        flash.maxLife = flash.life;
                        flash.hue = (this.hue + j.hueOffset + _prand(seed + 4) * 30) % 360;
                        this._flashes.push(flash);
                    }
                    // Push away from click
                    if (dist > 0) {
                        j.vx -= (dx / dist) * 3;
                        j.vy -= (dy / dist) * 3;
                    }
                }
            }
            // Always spawn click-point flash even if no jelly was hit
            if (!hitAny) {
                for (let f = 0; f < 6; f++) {
                    const seed = this.tick * 19 + f * 61;
                    const flash = this._flashPool.length > 0 ? this._flashPool.pop() : {};
                    const angle = _prand(seed) * TAU;
                    flash.x = mx;
                    flash.y = my;
                    flash.vx = Math.cos(angle) * (0.5 + _prand(seed + 1) * 2);
                    flash.vy = Math.sin(angle) * (0.5 + _prand(seed + 2) * 2);
                    flash.life = 15 + _prand(seed + 3) * 15;
                    flash.maxLife = flash.life;
                    flash.hue = (this.hue + _prand(seed + 4) * 40) % 360;
                    this._flashes.push(flash);
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        const W = window.innerWidth, H = window.innerHeight;

        for (const j of this.jellies) {
            j.bellPhase += j.bellSpeed;
            j.tentaclePhase += j.tentacleSpeed;
            j.glow *= 0.97;

            // Cursor avoidance / attraction
            const dx = mx - j.x, dy = my - j.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.mode === 4 && dist < 400) {
                // Medusa hunts cursor
                j.vx += (dx / dist) * 0.05;
                j.vy += (dy / dist) * 0.05;
            } else if (dist < 200 && dist > 0) {
                // Gentle avoidance
                const avoid = (1 - dist / 200) * 0.3;
                j.vx -= (dx / dist) * avoid;
                j.vy -= (dy / dist) * avoid;
            }

            // Current from mouse movement
            if (dist < 300) {
                const influence = (1 - dist / 300) * 0.02;
                j.vx += (mx - this._pmx) * influence;
                j.vy += (my - this._pmy) * influence;
            }

            // Natural drift
            j.vx += Math.sin(this.tick * 0.003 + j.bellPhase) * 0.005;
            if (this.mode !== 2) {
                j.vy += Math.cos(this.tick * 0.002 + j.tentaclePhase) * 0.005;
            }

            // Pulsation thrust (like real jellyfish)
            const pulse = Math.sin(j.bellPhase);
            if (pulse > 0.8) {
                j.vy -= 0.1 * (this.mode === 2 ? 2 : 1);
            }

            // Damping
            j.vx *= 0.99;
            j.vy *= 0.99;

            j.x += j.vx;
            j.y += j.vy;

            // Wrap
            if (j.x < -j.size * 2) j.x = W + j.size;
            if (j.x > W + j.size * 2) j.x = -j.size;
            if (j.y < -j.size * 2) j.y = H + j.size;
            if (j.y > H + j.size * 2) j.y = -j.size;
            if (this.mode === 2 && j.y < -j.size * 2) {
                j.y = H + j.size;
                j.x = _prand(this.tick * 7 + j.bellPhase * 100) * W;
            }

            // Store position history for tentacle dynamics (ring buffer to avoid splice)
            if (this.tick % 2 === 0) {
                if (j.history.length < j.maxHistory * 2) {
                    j.history.push(j.x, j.y);
                } else {
                    if (j._histIdx === undefined) j._histIdx = 0;
                    j.history[j._histIdx] = j.x;
                    j.history[j._histIdx + 1] = j.y;
                    j._histIdx = (j._histIdx + 2) % (j.maxHistory * 2);
                }
            }
        }

        // Update flashes
        for (let i = this._flashes.length - 1; i >= 0; i--) {
            const f = this._flashes[i];
            f.x += f.vx;
            f.y += f.vy;
            f.vx *= 0.95;
            f.vy *= 0.95;
            f.life--;
            if (f.life <= 0) {
                this._flashPool.push(f);
                this._flashes[i] = this._flashes[this._flashes.length - 1];
                this._flashes.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const j of this.jellies) {
            const bellPulse = (Math.sin(j.bellPhase) + 1) / 2;
            const hue = (this.hue + j.hueOffset + 360) % 360;
            const glow = Math.max(j.glow, 0.3 + bellPulse * 0.2);
            const baseAlpha = glow * 0.3 * this.intensity;

            if (this.mode === 0) this._drawDeepOcean(ctx, j, hue, bellPulse, baseAlpha);
            else if (this.mode === 1) this._drawAlienBloom(ctx, j, hue, bellPulse, baseAlpha);
            else if (this.mode === 2) this._drawLantern(ctx, j, hue, bellPulse, baseAlpha);
            else if (this.mode === 3) this._drawSpore(ctx, j, hue, bellPulse, baseAlpha);
            else if (this.mode === 4) this._drawMedusa(ctx, j, hue, bellPulse, baseAlpha);
            else if (this.mode === 5) this._drawCelestial(ctx, j, hue, bellPulse, baseAlpha);
        }

        // Flash particles
        for (const f of this._flashes) {
            const lifeRatio = f.life / f.maxLife;
            const alpha = lifeRatio * 0.4 * this.intensity;
            ctx.fillStyle = `hsla(${f.hue}, 80%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2 + lifeRatio * 3, 0, TAU);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawBell(ctx, j, hue, bellPulse, alpha, squash) {
        const w = j.size * (0.8 + bellPulse * 0.2);
        const h = j.size * (0.6 + squash);
        ctx.beginPath();
        ctx.ellipse(j.x, j.y, w, h, 0, Math.PI, 0);
        // Close with curve for bell bottom
        ctx.quadraticCurveTo(j.x + w * 0.8, j.y + h * 0.3, j.x, j.y + h * 0.1);
        ctx.quadraticCurveTo(j.x - w * 0.8, j.y + h * 0.3, j.x - w, j.y);
        ctx.closePath();
    }

    _drawTentacles(ctx, j, hue, alpha, count, length) {
        const spacing = j.size * 1.5 / (count + 1);
        for (let t = 0; t < count; t++) {
            const baseX = j.x - j.size * 0.6 + (t + 1) * spacing;
            const baseY = j.y + j.size * 0.1;
            const tentAlpha = alpha * (0.3 + Math.sin(j.tentaclePhase + t * 0.5) * 0.1);

            ctx.strokeStyle = `hsla(${(hue + t * 10) % 360}, 70%, 65%, ${tentAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);

            let px = baseX, py = baseY;
            const segments = 8;
            for (let s = 1; s <= segments; s++) {
                const frac = s / segments;
                const sway = Math.sin(j.tentaclePhase * 2 + t * 0.7 + s * 0.3) * (10 + frac * 20);
                // Use history for lag effect
                let lagX = 0;
                if (j.history.length >= 4) {
                    const hi = Math.max(0, j.history.length - 2 - s * 2);
                    lagX = (j.history[hi] - j.x) * frac * 0.3;
                }
                px = baseX + sway + lagX;
                py = baseY + frac * length;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    }

    _drawDeepOcean(ctx, j, hue, bellPulse, alpha) {
        // Outer glow
        const grad = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, j.size * 2);
        grad.addColorStop(0, `hsla(${hue}, 60%, 60%, ${alpha * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(j.x, j.y, j.size * 2, 0, TAU);
        ctx.fill();

        // Bell
        ctx.fillStyle = `hsla(${hue}, 50%, 55%, ${alpha * 0.6})`;
        this._drawBell(ctx, j, hue, bellPulse, alpha, 0.4 - bellPulse * 0.1);
        ctx.fill();

        // Inner rim highlight
        ctx.strokeStyle = `hsla(${hue + 20}, 70%, 80%, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        this._drawBell(ctx, j, hue, bellPulse, alpha, 0.3 - bellPulse * 0.1);
        ctx.stroke();

        this._drawTentacles(ctx, j, hue, alpha, j.tentacleCount, j.tentacleLength);
    }

    _drawAlienBloom(ctx, j, hue, bellPulse, alpha) {
        // Geometric bell: rotating polygon
        const sides = 5 + Math.floor(j.tentacleCount / 2);
        const r = j.size * (0.8 + bellPulse * 0.2);
        const rotation = this.tick * 0.005 + j.bellPhase;

        ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${alpha * 0.5})`;
        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
            const angle = rotation + (s / sides) * TAU;
            const pr = r * (1 + Math.sin(angle * 3) * 0.1);
            const px = j.x + Math.cos(angle) * pr;
            const py = j.y + Math.sin(angle) * pr * 0.6;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Fractal tentacles: branching lines
        for (let t = 0; t < j.tentacleCount; t++) {
            const baseAngle = (t / j.tentacleCount) * Math.PI + Math.PI * 0.5;
            const bx = j.x + Math.cos(baseAngle + rotation) * r * 0.3;
            const by = j.y + Math.sin(baseAngle + rotation) * r * 0.3 + j.size * 0.2;
            this._drawFractalTentacle(ctx, bx, by, baseAngle, j.tentacleLength * 0.7, 3,
                hue, alpha * 0.3, j.tentaclePhase + t);
        }
    }

    _drawFractalTentacle(ctx, x, y, angle, length, depth, hue, alpha, phase) {
        if (depth <= 0 || length < 5) return;
        const sway = Math.sin(phase + this.tick * 0.02 + depth) * 0.3;
        const endX = x + Math.cos(angle + sway) * length;
        const endY = y + Math.sin(angle + sway) * length;

        ctx.strokeStyle = `hsla(${(hue + depth * 20) % 360}, 80%, 65%, ${alpha})`;
        ctx.lineWidth = depth * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        this._drawFractalTentacle(ctx, endX, endY, angle + 0.4, length * 0.6, depth - 1, hue, alpha * 0.7, phase);
        this._drawFractalTentacle(ctx, endX, endY, angle - 0.4, length * 0.6, depth - 1, hue, alpha * 0.7, phase);
    }

    _drawLantern(ctx, j, hue, bellPulse, alpha) {
        const r = j.size * (0.9 + bellPulse * 0.1);
        // Paper lantern glow
        const grad = ctx.createRadialGradient(j.x, j.y - r * 0.2, r * 0.2, j.x, j.y, r * 1.5);
        grad.addColorStop(0, `hsla(${hue}, 80%, 75%, ${alpha * 0.8})`);
        grad.addColorStop(0.6, `hsla(${hue + 10}, 70%, 60%, ${alpha * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(j.x, j.y, r * 1.5, 0, TAU);
        ctx.fill();

        // Lantern body
        ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(j.x, j.y, r, r * 1.2, 0, 0, TAU);
        ctx.fill();

        // String below
        ctx.strokeStyle = `hsla(${hue}, 40%, 50%, ${alpha * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(j.x, j.y + r * 1.2);
        const swayX = Math.sin(j.tentaclePhase * 2) * 5;
        ctx.quadraticCurveTo(j.x + swayX, j.y + r * 2, j.x + swayX * 1.5, j.y + r * 2.5);
        ctx.stroke();
    }

    _drawSpore(ctx, j, hue, bellPulse, alpha) {
        const r = j.size * (0.8 + bellPulse * 0.3);
        // Tiny glowing spore
        ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(j.x, j.y, r, 0, TAU);
        ctx.fill();

        // Pulsing aura
        if (bellPulse > 0.5) {
            ctx.fillStyle = `hsla(${hue + 20}, 80%, 80%, ${(bellPulse - 0.5) * alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(j.x, j.y, r * 2, 0, TAU);
            ctx.fill();
        }

        // Thin thread connections to nearby spores
        ctx.strokeStyle = `hsla(${hue}, 50%, 60%, ${alpha * 0.15})`;
        ctx.lineWidth = 0.3;
    }

    _drawMedusa(ctx, j, hue, bellPulse, alpha) {
        const r = j.size;
        // Threatening glow
        const grad = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, r * 2.5);
        grad.addColorStop(0, `hsla(${hue}, 70%, 50%, ${alpha * 0.15})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(j.x, j.y, r * 2.5, 0, TAU);
        ctx.fill();

        // Large pulsing bell
        ctx.fillStyle = `hsla(${hue}, 60%, 45%, ${alpha * 0.4})`;
        this._drawBell(ctx, j, hue, bellPulse, alpha, 0.5 - bellPulse * 0.15);
        ctx.fill();

        // Stinging tentacles (longer, more menacing)
        this._drawTentacles(ctx, j, hue, alpha * 1.2, j.tentacleCount, j.tentacleLength * 1.5);

        // Electric sting near cursor - multiple crackling arcs
        const dx = this._mx - j.x, dy = this._my - j.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r * 4 && dist > 0) {
            const proximity = 1 - dist / (r * 4);
            const stingCount = 1 + Math.floor(proximity * 3);
            for (let s = 0; s < stingCount; s++) {
                const stingAlpha = proximity * 0.15 * this.intensity / stingCount;
                ctx.strokeStyle = `hsla(${(hue + 30 + s * 15) % 360}, 90%, 80%, ${stingAlpha})`;
                ctx.lineWidth = 0.8 + proximity;
                ctx.beginPath();
                // Start from different tentacle tips
                const startAngle = (s / stingCount) * Math.PI * 0.6 - Math.PI * 0.3;
                const sx = j.x + Math.cos(startAngle + j.tentaclePhase) * r * 0.8;
                const sy = j.y + r * 0.3 + Math.sin(startAngle + j.tentaclePhase) * r * 0.3;
                ctx.moveTo(sx, sy);
                // Jagged path with jitter
                const segments = 4;
                for (let seg = 1; seg <= segments; seg++) {
                    const t = seg / segments;
                    const bx = sx + (this._mx - sx) * t;
                    const by = sy + (this._my - sy) * t;
                    const jitter = (1 - t) * 15 * proximity;
                    const jx = bx + Math.sin(this.tick * 0.5 + s * 2.1 + seg * 1.7) * jitter;
                    const jy = by + Math.cos(this.tick * 0.4 + s * 1.9 + seg * 2.3) * jitter;
                    ctx.lineTo(jx, jy);
                }
                ctx.stroke();
            }
            // Impact glow at cursor
            if (proximity > 0.3) {
                const impactAlpha = (proximity - 0.3) * 0.15 * this.intensity;
                ctx.fillStyle = `hsla(${hue + 30}, 90%, 85%, ${impactAlpha})`;
                ctx.beginPath();
                ctx.arc(this._mx, this._my, 4 + proximity * 6, 0, TAU);
                ctx.fill();
            }
        }
    }

    _drawCelestial(ctx, j, hue, bellPulse, alpha) {
        const r = j.size;
        // Ethereal outer glow
        const grad = ctx.createRadialGradient(j.x, j.y, 0, j.x, j.y, r * 2);
        grad.addColorStop(0, `hsla(${hue}, 40%, 70%, ${alpha * 0.2})`);
        grad.addColorStop(0.5, `hsla(${hue + 30}, 50%, 60%, ${alpha * 0.1})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(j.x, j.y, r * 2, 0, TAU);
        ctx.fill();

        // Translucent bell
        ctx.fillStyle = `hsla(${hue}, 30%, 60%, ${alpha * 0.25})`;
        this._drawBell(ctx, j, hue, bellPulse, alpha, 0.45 - bellPulse * 0.1);
        ctx.fill();

        // Star-like inner organs
        for (let o = 0; o < j.organCount; o++) {
            const orgAngle = j.organPhase + (o / j.organCount) * TAU + this.tick * 0.005;
            const orgR = r * 0.3;
            const ox = j.x + Math.cos(orgAngle) * orgR;
            const oy = j.y - r * 0.15 + Math.sin(orgAngle) * orgR * 0.4;
            const orgBright = (Math.sin(this.tick * 0.04 + o * 1.5) + 1) / 2;
            const oAlpha = orgBright * alpha * 0.5;

            // Star cross pattern
            ctx.strokeStyle = `hsla(${(hue + o * 40) % 360}, 80%, 85%, ${oAlpha})`;
            ctx.lineWidth = 0.8;
            const starSize = 3 + orgBright * 4;
            ctx.beginPath();
            ctx.moveTo(ox - starSize, oy);
            ctx.lineTo(ox + starSize, oy);
            ctx.moveTo(ox, oy - starSize);
            ctx.lineTo(ox, oy + starSize);
            ctx.stroke();

            ctx.fillStyle = `hsla(${(hue + o * 40) % 360}, 90%, 90%, ${oAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(ox, oy, 1.5, 0, TAU);
            ctx.fill();
        }

        this._drawTentacles(ctx, j, hue, alpha * 0.5, j.tentacleCount, j.tentacleLength);
    }
}
