/**
 * @file time_crystal_effects.js
 * @description Floating geometric crystal shards that rotate, refract light into
 * prismatic rainbows, and periodically snap into ordered lattice formations before
 * dissolving back into floating chaos. Cursor proximity causes crystals to resonate
 * and emit harmonic light pulses.
 *
 * Modes:
 * 0 - Prismatic Drift: crystals float freely, refracting rainbow light beams
 * 1 - Lattice Snap: crystals periodically organize into perfect geometric lattices
 * 2 - Resonance Cascade: cursor vibrates nearby crystals causing chain reactions
 * 3 - Temporal Echo: crystals leave time-delayed copies creating kaleidoscopic trails
 * 4 - Shatter & Reform: crystals periodically shatter into fragments then reassemble
 * 5 - Harmonic Choir: crystals pulse at different frequencies creating visual beats
 */

const TAU = Math.PI * 2;

function drawCrystal(ctx, x, y, size, rotation, facets, hue, sat, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i <= facets; i++) {
        const angle = (i / facets) * TAU;
        const r = size * (i % 2 === 0 ? 1 : 0.6);
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue}, ${sat}%, 70%, ${alpha * 0.3})`;
    ctx.fill();
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, 85%, ${alpha * 0.6})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Inner facet lines
    ctx.strokeStyle = `hsla(${hue + 30}, ${sat}%, 90%, ${alpha * 0.2})`;
    ctx.lineWidth = 0.4;
    for (let i = 0; i < facets; i += 2) {
        const angle = (i / facets) * TAU;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * size * 0.8, Math.sin(angle) * size * 0.8);
        ctx.stroke();
    }
    ctx.restore();
}

export class TimeCrystal {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 280;
        this.saturation = 70;
        this.intensity = 1;

        this._mouseX = 0;
        this._mouseY = 0;
        this._prevMouseX = 0;
        this._prevMouseY = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._rng = Math.random;

        this.crystals = [];
        this.crystalCount = 12;

        // Lattice snap
        this.latticePhase = 0; // 0 = floating, 1 = snapping, 2 = locked, 3 = releasing
        this.latticeTimer = 0;
        this.latticePositions = [];
        this.latticeType = 0; // 0=hex, 1=cubic, 2=spiral

        // Temporal echo
        this.echoHistory = []; // Array of snapshot arrays
        this.echoMaxFrames = 40;

        // Shatter
        this.fragments = [];
        this.fragmentPool = [];
        this.isShattered = false;
        this.shatterTimer = 0;

        // Harmonic choir
        this.choirPhases = [];
    }

    configure(rng, palette) {
        this._rng = rng;
        this.mode = Math.floor(rng() * 6);
        this.hue = palette.length > 0 ? palette[Math.floor(rng() * palette.length)].h : 280;
        this.saturation = 50 + Math.floor(rng() * 40);
        this.intensity = 0.6 + rng() * 0.8;
        this.tick = 0;

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.crystalCount = 8 + Math.floor(rng() * 10);
        this.crystals = [];

        for (let i = 0; i < this.crystalCount; i++) {
            this.crystals.push({
                x: rng() * w, y: rng() * h,
                vx: (rng() - 0.5) * 0.8, vy: (rng() - 0.5) * 0.8,
                rotation: rng() * TAU,
                rotSpeed: (rng() - 0.5) * 0.02,
                size: 6 + rng() * 14,
                facets: [4, 5, 6, 8][Math.floor(rng() * 4)],
                hueOffset: rng() * 40 - 20,
                resonance: 0,
                frequency: 0.5 + rng() * 2, // For harmonic choir
                phase: rng() * TAU,
                // Refraction beam
                beamAngle: rng() * TAU,
                beamLength: 30 + rng() * 70,
                // Lattice target
                targetX: 0, targetY: 0
            });
        }

        if (this.mode === 1) {
            this.latticeType = Math.floor(rng() * 3);
            this._computeLattice(w, h);
        }

        if (this.mode === 3) {
            this.echoHistory = [];
        }

        if (this.mode === 4) {
            this.fragments = [];
            this.isShattered = false;
            this.shatterTimer = 200 + Math.floor(rng() * 200);
        }

        if (this.mode === 5) {
            this.choirPhases = this.crystals.map(c => c.phase);
        }
    }

    _computeLattice(w, h) {
        const cx = w / 2, cy = h / 2;
        if (this.latticeType === 0) {
            // Hexagonal lattice
            const spacing = 60;
            let idx = 0;
            for (let row = -3; row <= 3 && idx < this.crystals.length; row++) {
                for (let col = -3; col <= 3 && idx < this.crystals.length; col++) {
                    const offsetX = row % 2 === 0 ? 0 : spacing / 2;
                    this.crystals[idx].targetX = cx + col * spacing + offsetX;
                    this.crystals[idx].targetY = cy + row * spacing * 0.866;
                    idx++;
                }
            }
        } else if (this.latticeType === 1) {
            // Cubic grid
            const spacing = 50;
            const side = Math.ceil(Math.sqrt(this.crystals.length));
            for (let i = 0; i < this.crystals.length; i++) {
                const col = i % side, row = Math.floor(i / side);
                this.crystals[i].targetX = cx + (col - side / 2) * spacing;
                this.crystals[i].targetY = cy + (row - side / 2) * spacing;
            }
        } else {
            // Spiral
            for (let i = 0; i < this.crystals.length; i++) {
                const angle = i * 0.7;
                const r = 20 + i * 15;
                this.crystals[i].targetX = cx + Math.cos(angle) * r;
                this.crystals[i].targetY = cy + Math.sin(angle) * r;
            }
        }
    }

    update(mx, my, isClicking) {
        this._prevMouseX = this._mouseX;
        this._prevMouseY = this._mouseY;
        this._mouseX = mx;
        this._mouseY = my;
        const dx = mx - this._prevMouseX;
        const dy = my - this._prevMouseY;
        this._mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this._isClicking = isClicking;
        this.tick++;

        const w = window.innerWidth, h = window.innerHeight;

        for (const c of this.crystals) {
            // Mouse proximity resonance
            const cdx = mx - c.x, cdy = my - c.y;
            const dist = Math.sqrt(cdx * cdx + cdy * cdy);
            if (dist < 180 && dist > 0) {
                c.resonance = Math.min(1, c.resonance + 0.03);
                // Gentle attraction
                c.vx += (cdx / dist) * 0.05 * c.resonance;
                c.vy += (cdy / dist) * 0.05 * c.resonance;
                // Speed up rotation near cursor
                c.rotation += c.rotSpeed * (1 + c.resonance * 3);

                // Click: supercharge resonance and push crystals outward
                if (isClicking) {
                    c.resonance = Math.min(1, c.resonance + 0.15);
                    c.vx -= (cdx / dist) * 1.5;
                    c.vy -= (cdy / dist) * 1.5;
                    c.rotSpeed *= 1.01; // Spin faster
                }
            } else {
                c.resonance *= 0.95;
                c.rotation += c.rotSpeed;
            }

            // Gradually slow excessive rotation
            c.rotSpeed *= 0.9999;

            // Refraction beam follows cursor angle
            c.beamAngle = Math.atan2(my - c.y, mx - c.x) + Math.PI;
        }

        if (this.mode === 0 || this.mode === 2 || this.mode === 5) {
            this._updateFreeFloat(w, h);
        } else if (this.mode === 1) {
            this._updateLatticeSnap(w, h);
        } else if (this.mode === 3) {
            this._updateTemporalEcho(w, h);
        } else if (this.mode === 4) {
            this._updateShatter(w, h);
        }

        if (this.mode === 2) this._updateResonanceCascade();
    }

    _updateFreeFloat(w, h) {
        for (const c of this.crystals) {
            c.x += c.vx; c.y += c.vy;
            c.vx *= 0.995; c.vy *= 0.995;
            if (c.x < 0 || c.x > w) c.vx *= -1;
            if (c.y < 0 || c.y > h) c.vy *= -1;
            c.x = Math.max(0, Math.min(w, c.x));
            c.y = Math.max(0, Math.min(h, c.y));
        }
    }

    _updateLatticeSnap(w, h) {
        this.latticeTimer++;
        const period = 300;
        const phase = this.latticeTimer % period;

        // Click during locked phase forces immediate release with burst
        if (this._isClicking && phase >= 150 && phase < 250) {
            this.latticeTimer = Math.floor(this.latticeTimer / period) * period + 250;
            for (const c of this.crystals) {
                const dx = c.x - this._mouseX, dy = c.y - this._mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                c.vx += (dx / dist) * 3;
                c.vy += (dy / dist) * 3;
                c.resonance = 1;
            }
            return;
        }

        if (phase < 100) {
            // Floating
            this._updateFreeFloat(w, h);
        } else if (phase < 150) {
            // Snapping to lattice
            const t = (phase - 100) / 50;
            for (const c of this.crystals) {
                c.x += (c.targetX - c.x) * 0.08 * t;
                c.y += (c.targetY - c.y) * 0.08 * t;
                c.vx *= 0.9; c.vy *= 0.9;
            }
        } else if (phase < 250) {
            // Locked in lattice - gentle wobble
            for (const c of this.crystals) {
                c.x = c.targetX + Math.sin(this.tick * 0.03 + c.phase) * 2;
                c.y = c.targetY + Math.cos(this.tick * 0.025 + c.phase) * 2;
            }
        } else {
            // Releasing - use sin-based pseudo-random instead of Math.random()
            const t = (phase - 250) / 50;
            for (let i = 0; i < this.crystals.length; i++) {
                const c = this.crystals[i];
                const pseudoRandX = Math.sin(i * 7.13 + this.tick * 0.1) * 0.5;
                const pseudoRandY = Math.cos(i * 11.37 + this.tick * 0.1) * 0.5;
                c.vx += pseudoRandX * t * 0.3;
                c.vy += pseudoRandY * t * 0.3;
                c.x += c.vx; c.y += c.vy;
            }
        }
    }

    _updateTemporalEcho(w, h) {
        this._updateFreeFloat(w, h);
        // Click: reverse time - play echoes backward briefly
        if (this._isClicking && this.echoHistory.length > 2) {
            // Pop last echo and apply positions (rewinding)
            const old = this.echoHistory.pop();
            if (old) {
                for (let i = 0; i < Math.min(old.length, this.crystals.length); i++) {
                    this.crystals[i].x += (old[i].x - this.crystals[i].x) * 0.15;
                    this.crystals[i].y += (old[i].y - this.crystals[i].y) * 0.15;
                }
            }
        }
        // Save snapshot every 4 frames
        if (this.tick % 4 === 0) {
            const snapshot = this.crystals.map(c => ({
                x: c.x, y: c.y, rotation: c.rotation,
                size: c.size, facets: c.facets, hueOffset: c.hueOffset, phase: c.phase
            }));
            this.echoHistory.push(snapshot);
            if (this.echoHistory.length > this.echoMaxFrames) {
                this.echoHistory.shift();
            }
        }
    }

    _updateShatter(w, h) {
        this.shatterTimer--;

        // Click forces immediate shatter from cursor position
        if (this._isClicking && !this.isShattered) {
            this.shatterTimer = 0;
        }

        if (this.shatterTimer <= 0 && !this.isShattered) {
            this.isShattered = true;
            this.shatterTimer = 120;
            this.fragments = [];
            for (let ci = 0; ci < this.crystals.length; ci++) {
                const c = this.crystals[ci];
                const fragCount = 3 + (ci * 7 % 4); // Deterministic count per crystal
                for (let i = 0; i < fragCount; i++) {
                    const frag = this.fragmentPool.length > 0 ? this.fragmentPool.pop() : {};
                    frag.x = c.x; frag.y = c.y;
                    // Use pseudo-random based on crystal + fragment index
                    const seed = ci * 13.7 + i * 3.1 + this.tick * 0.01;
                    const angle = (Math.sin(seed) * 0.5 + 0.5) * TAU;
                    const speed = 1 + (Math.sin(seed * 2.3) * 0.5 + 0.5) * 4;
                    frag.vx = Math.cos(angle) * speed;
                    frag.vy = Math.sin(angle) * speed;
                    frag.size = c.size * (0.2 + (Math.sin(seed * 3.7) * 0.5 + 0.5) * 0.4);
                    frag.rotation = (Math.sin(seed * 5.1) * 0.5 + 0.5) * TAU;
                    frag.rotSpeed = Math.sin(seed * 7.3) * 0.1;
                    frag.hueOffset = c.hueOffset + Math.sin(seed * 11.1) * 20;
                    frag.life = 80 + Math.floor(Math.abs(Math.sin(seed * 13.7)) * 40);
                    frag.maxLife = frag.life;
                    frag.parentIdx = ci;
                    this.fragments.push(frag);
                }
            }
        }

        if (this.isShattered) {
            // Click during shatter: attract fragments toward cursor
            const attracting = this._isClicking;

            for (let i = this.fragments.length - 1; i >= 0; i--) {
                const f = this.fragments[i];
                f.x += f.vx; f.y += f.vy;
                f.vx *= 0.97; f.vy *= 0.97;
                f.rotation += f.rotSpeed;
                f.life--;

                // Click attraction
                if (attracting) {
                    const dx = this._mouseX - f.x, dy = this._mouseY - f.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    f.vx += (dx / dist) * 0.3;
                    f.vy += (dy / dist) * 0.3;
                }

                // Converge back to parent in last 30 frames
                if (f.life < 30 && f.parentIdx >= 0) {
                    const parent = this.crystals[f.parentIdx];
                    f.vx += (parent.x - f.x) * 0.03;
                    f.vy += (parent.y - f.y) * 0.03;
                }
                if (f.life <= 0) {
                    this.fragmentPool.push(f);
                    this.fragments[i] = this.fragments[this.fragments.length - 1];
                    this.fragments.pop();
                }
            }
            if (this.fragments.length === 0) {
                this.isShattered = false;
                this.shatterTimer = 200 + Math.abs(Math.floor(Math.sin(this.tick) * 200));
            }
        } else {
            this._updateFreeFloat(w, h);
        }
    }

    _updateResonanceCascade() {
        // Cascade: resonance spreads between nearby crystals
        for (let i = 0; i < this.crystals.length; i++) {
            if (this.crystals[i].resonance < 0.3) continue;
            for (let j = 0; j < this.crystals.length; j++) {
                if (i === j) continue;
                const dx = this.crystals[i].x - this.crystals[j].x;
                const dy = this.crystals[i].y - this.crystals[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    this.crystals[j].resonance = Math.min(1,
                        this.crystals[j].resonance + this.crystals[i].resonance * 0.01 * (1 - dist / 120));
                }
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw temporal echoes first (behind current crystals)
        if (this.mode === 3 && this.echoHistory.length > 0) {
            for (let e = 0; e < this.echoHistory.length; e += 3) {
                const snapshot = this.echoHistory[e];
                const echoAlpha = (e / this.echoHistory.length) * 0.08;
                for (const s of snapshot) {
                    drawCrystal(ctx, s.x, s.y, s.size * 0.8, s.rotation,
                        s.facets, (this.hue + s.hueOffset + 360) % 360,
                        this.saturation, echoAlpha);
                }
            }
        }

        // Draw shatter fragments
        if (this.mode === 4 && this.isShattered) {
            for (const f of this.fragments) {
                const alpha = (f.life / f.maxLife) * 0.4 * this.intensity;
                const hue = (this.hue + f.hueOffset + 360) % 360;
                ctx.fillStyle = `hsla(${hue}, ${this.saturation}%, 80%, ${alpha})`;
                ctx.save();
                ctx.translate(f.x, f.y);
                ctx.rotate(f.rotation);
                ctx.beginPath();
                ctx.moveTo(-f.size, 0);
                ctx.lineTo(0, -f.size * 0.6);
                ctx.lineTo(f.size, 0);
                ctx.lineTo(0, f.size * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // Draw main crystals
        if (!(this.mode === 4 && this.isShattered)) {
            for (const c of this.crystals) {
                const hue = (this.hue + c.hueOffset + 360) % 360;
                const alpha = (0.2 + c.resonance * 0.5) * this.intensity;

                // Resonance glow
                if (c.resonance > 0.1) {
                    const glowR = c.size * (2 + c.resonance * 3);
                    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, glowR);
                    g.addColorStop(0, `hsla(${hue}, ${this.saturation}%, 80%, ${c.resonance * 0.15})`);
                    g.addColorStop(1, 'transparent');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, glowR, 0, TAU);
                    ctx.fill();
                }

                // Prismatic refraction beams
                if (this.mode === 0 || c.resonance > 0.2) {
                    const beamAlpha = (this.mode === 0 ? 0.06 : c.resonance * 0.1) * this.intensity;
                    for (let i = 0; i < 3; i++) {
                        const bHue = hue + i * 40;
                        const spreadAngle = c.beamAngle + (i - 1) * 0.15;
                        const bLen = c.beamLength * (0.5 + c.resonance);
                        ctx.strokeStyle = `hsla(${bHue}, 90%, 70%, ${beamAlpha})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(c.x, c.y);
                        ctx.lineTo(
                            c.x + Math.cos(spreadAngle) * bLen,
                            c.y + Math.sin(spreadAngle) * bLen
                        );
                        ctx.stroke();
                    }
                }

                // Harmonic choir pulse
                if (this.mode === 5) {
                    const pulse = Math.sin(this.tick * 0.03 * c.frequency + c.phase);
                    const pulseSize = c.size * (1 + pulse * 0.3);
                    const pulseAlpha = alpha * (0.7 + pulse * 0.3);
                    drawCrystal(ctx, c.x, c.y, pulseSize, c.rotation,
                        c.facets, hue, this.saturation, pulseAlpha);

                    // Beat interference rings between nearby crystals
                    if (pulse > 0.8) {
                        ctx.strokeStyle = `hsla(${hue}, ${this.saturation}%, 80%, 0.06)`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.arc(c.x, c.y, c.size * 3, 0, TAU);
                        ctx.stroke();
                    }
                } else {
                    drawCrystal(ctx, c.x, c.y, c.size, c.rotation,
                        c.facets, hue, this.saturation, alpha);
                }
            }
        }

        ctx.restore();
    }
}
