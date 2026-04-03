/**
 * @file gravity_symphony_effects.js
 * @description Musical gravity system where geometric "notes" orbit attractor points,
 * creating visual harmonics. Each note shape represents a musical interval and orbits
 * at a ratio-locked radius. Cursor creates temporary attractors, clicking spawns note
 * bursts. The visual result looks like a living orrery/music box mechanism.
 *
 * Modes:
 * 0 - Orrery: Circular orbits with planet-like notes, gravitational trails
 * 1 - Music Box: Notes on rotating arms like a mechanical music box cylinder
 * 2 - Harmonic Rings: Concentric rings of notes pulsing at harmonic frequencies
 * 3 - Pendulum Clock: Notes swing on invisible pendulums of different lengths
 * 4 - Wind Chime: Notes drift and collide, creating burst effects on impact
 * 5 - Orbital Weave: Notes weave Lissajous figures, leaving glowing thread trails
 */

const TAU = Math.PI * 2;

// Musical ratios for visual harmonics
const HARMONIC_RATIOS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

export class GravitySymphony {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 0;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._isClicking = false;
        this._wasClicking = false;

        // Notes (orbiting shapes)
        this._notes = [];
        this._maxNotes = 60;

        // Attractors
        this._attractors = [];
        this._maxAttractors = 5;

        // Trail segments for weave mode
        this._trails = [];
        this._maxTrails = 500;

        // Burst particles on collision
        this._bursts = [];
        this._burstPool = [];

        // Pendulum config
        this._pendulumOriginY = 0;

        // Lissajous params
        this._lissA = 3;
        this._lissB = 2;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 200;
        this.intensity = 0.5 + rng() * 0.5;
        this._notes = [];
        this._attractors = [];
        this._trails = [];
        this._bursts = [];

        const W = window.innerWidth, H = window.innerHeight;

        // Place initial attractors
        const attrCount = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < attrCount; i++) {
            this._attractors.push({
                x: W * (0.2 + rng() * 0.6),
                y: H * (0.2 + rng() * 0.6),
                mass: 500 + rng() * 1500,
                permanent: true,
                life: Infinity,
                hue: (this.hue + i * 40) % 360,
            });
        }

        // Spawn initial notes
        const noteCount = 15 + Math.floor(rng() * 25);
        for (let i = 0; i < noteCount; i++) {
            this._spawnNote(rng, W, H);
        }

        // Mode-specific setup
        if (this.mode === 3) {
            this._pendulumOriginY = H * 0.1;
            // Convert notes to pendulums
            for (const n of this._notes) {
                n.pendulumLength = 100 + rng() * (H * 0.5);
                n.pendulumAngle = (rng() - 0.5) * 1.2;
                n.pendulumVel = 0;
                n.anchorX = W * (0.1 + rng() * 0.8);
            }
        }

        if (this.mode === 5) {
            this._lissA = 1 + Math.floor(rng() * 5);
            this._lissB = 1 + Math.floor(rng() * 5);
            if (this._lissA === this._lissB) this._lissB++;
        }
    }

    _spawnNote(rng, W, H) {
        if (this._notes.length >= this._maxNotes) return;
        const shapes = ['circle', 'triangle', 'diamond', 'star', 'square'];
        const harmonic = HARMONIC_RATIOS[Math.floor(rng() * HARMONIC_RATIOS.length)];

        this._notes.push({
            x: rng() * W,
            y: rng() * H,
            vx: (rng() - 0.5) * 2,
            vy: (rng() - 0.5) * 2,
            size: 4 + rng() * 8,
            shape: shapes[Math.floor(rng() * shapes.length)],
            hue: (this.hue + rng() * 120) % 360,
            harmonic,
            orbitSpeed: (0.01 + rng() * 0.03) / harmonic,
            phase: rng() * TAU,
            glowIntensity: 0.3 + rng() * 0.7,
            pendulumLength: 0,
            pendulumAngle: 0,
            pendulumVel: 0,
            anchorX: 0,
        });
    }

    update(mx, my, isClicking, system) {
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._wasClicking = this._isClicking;
        this._isClicking = isClicking;
        this.tick++;

        const W = system.width, H = system.height;

        // Click: spawn burst of notes + temporary attractor
        if (this._isClicking && !this._wasClicking) {
            // Temporary attractor at click
            if (this._attractors.length < this._maxAttractors + 3) {
                this._attractors.push({
                    x: mx, y: my,
                    mass: 800 + Math.random() * 600,
                    permanent: false,
                    life: 120,
                    hue: (this.hue + this.tick) % 360,
                });
            }
            // Spawn note burst
            const burstCount = 3 + Math.floor(Math.random() * 4);
            const tempRng = () => _prand(this.tick * 31 + this._notes.length * 7);
            for (let i = 0; i < burstCount; i++) {
                if (this._notes.length >= this._maxNotes) break;
                const angle = (i / burstCount) * TAU;
                const speed = 3 + Math.random() * 4;
                this._notes.push({
                    x: mx,
                    y: my,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 3 + Math.random() * 6,
                    shape: ['circle', 'triangle', 'diamond', 'star', 'square'][Math.floor(Math.random() * 5)],
                    hue: (this.hue + i * 30 + this.tick) % 360,
                    harmonic: HARMONIC_RATIOS[Math.floor(Math.random() * HARMONIC_RATIOS.length)],
                    orbitSpeed: 0.01 + Math.random() * 0.03,
                    phase: Math.random() * TAU,
                    glowIntensity: 0.5 + Math.random() * 0.5,
                    pendulumLength: 100 + Math.random() * 200,
                    pendulumAngle: (Math.random() - 0.5) * 0.8,
                    pendulumVel: 0,
                    anchorX: mx,
                });
            }
        }

        // Update temporary attractors
        for (let i = this._attractors.length - 1; i >= 0; i--) {
            const a = this._attractors[i];
            if (!a.permanent) {
                a.life--;
                if (a.life <= 0) {
                    this._attractors[i] = this._attractors[this._attractors.length - 1];
                    this._attractors.pop();
                }
            }
        }

        // Mouse acts as weak attractor
        const mouseAttract = { x: mx, y: my, mass: 300 };

        if (this.mode === 3) {
            // Pendulum mode
            this._updatePendulums(W, H);
        } else if (this.mode === 5) {
            // Lissajous weave
            this._updateLissajous(W, H);
        } else {
            // Standard gravity modes
            this._updateGravity(mouseAttract, W, H);
        }

        // Update bursts
        for (let i = this._bursts.length - 1; i >= 0; i--) {
            const b = this._bursts[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            b.vx *= 0.95;
            b.vy *= 0.95;
            if (b.life <= 0) {
                this._burstPool.push(b);
                this._bursts[i] = this._bursts[this._bursts.length - 1];
                this._bursts.pop();
            }
        }
    }

    _updateGravity(mouseAttract, W, H) {
        for (const n of this._notes) {
            let fx = 0, fy = 0;

            // Gravity from all attractors
            for (const a of this._attractors) {
                const dx = a.x - n.x;
                const dy = a.y - n.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);
                if (dist < 5) continue;
                const force = a.mass / (distSq + 100);
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
            }

            // Mouse attractor (weaker)
            const mdx = mouseAttract.x - n.x;
            const mdy = mouseAttract.y - n.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist > 5 && mdist < 400) {
                const mforce = mouseAttract.mass / (mdist * mdist + 200);
                fx += (mdx / mdist) * mforce;
                fy += (mdy / mdist) * mforce;
            }

            n.vx += fx * 0.1;
            n.vy += fy * 0.1;

            // Mode-specific behaviors
            if (this.mode === 1) {
                // Music box: enforce more circular motion
                const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
                if (speed > 0.1) {
                    const perpX = -n.vy / speed;
                    const perpY = n.vx / speed;
                    n.vx = n.vx * 0.9 + perpX * speed * 0.1;
                    n.vy = n.vy * 0.9 + perpY * speed * 0.1;
                }
            } else if (this.mode === 2) {
                // Harmonic rings: radial oscillation around nearest attractor
                if (this._attractors.length > 0) {
                    const a = this._attractors[0];
                    const dx = n.x - a.x;
                    const dy = n.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const targetR = 50 * n.harmonic;
                    const pullStrength = (dist - targetR) * 0.001;
                    if (dist > 1) {
                        n.vx -= (dx / dist) * pullStrength;
                        n.vy -= (dy / dist) * pullStrength;
                    }
                }
            } else if (this.mode === 4) {
                // Wind chime: slight downward drift + collision detection
                n.vy += 0.01;
            }

            n.vx *= 0.99;
            n.vy *= 0.99;
            n.x += n.vx;
            n.y += n.vy;
            n.phase += n.orbitSpeed;

            // Bounce off edges
            if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx) * 0.8; }
            if (n.x > W) { n.x = W; n.vx = -Math.abs(n.vx) * 0.8; }
            if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy) * 0.8; }
            if (n.y > H) { n.y = H; n.vy = -Math.abs(n.vy) * 0.8; }

            // Trail for weave-like modes (orrery)
            if (this.mode === 0 && this.tick % 3 === 0) {
                if (this._trails.length < this._maxTrails) {
                    this._trails.push({ x: n.x, y: n.y, hue: n.hue, life: 40 });
                }
            }
        }

        // Wind chime collisions
        if (this.mode === 4) {
            for (let i = 0; i < this._notes.length; i++) {
                for (let j = i + 1; j < this._notes.length; j++) {
                    const a = this._notes[i];
                    const b = this._notes[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = a.size + b.size;
                    if (dist < minDist && dist > 0) {
                        // Simple elastic collision
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const dvx = a.vx - b.vx;
                        const dvy = a.vy - b.vy;
                        const dvn = dvx * nx + dvy * ny;
                        if (dvn > 0) {
                            a.vx -= nx * dvn;
                            a.vy -= ny * dvn;
                            b.vx += nx * dvn;
                            b.vy += ny * dvn;
                            // Spawn burst
                            this._spawnBurst((a.x + b.x) / 2, (a.y + b.y) / 2, (a.hue + b.hue) / 2);
                        }
                    }
                }
            }
        }

        // Decay trails
        for (let i = this._trails.length - 1; i >= 0; i--) {
            this._trails[i].life--;
            if (this._trails[i].life <= 0) {
                this._trails[i] = this._trails[this._trails.length - 1];
                this._trails.pop();
            }
        }
    }

    _updatePendulums(W, H) {
        for (const n of this._notes) {
            // Simple pendulum physics
            const gravity = 0.0005;
            const accel = -gravity * Math.sin(n.pendulumAngle) * n.pendulumLength;
            n.pendulumVel += accel;
            n.pendulumVel *= 0.999; // Small damping
            n.pendulumAngle += n.pendulumVel;

            n.x = n.anchorX + Math.sin(n.pendulumAngle) * n.pendulumLength;
            n.y = this._pendulumOriginY + Math.cos(n.pendulumAngle) * n.pendulumLength;
            n.phase += n.orbitSpeed;
        }
    }

    _updateLissajous(W, H) {
        const cx = W / 2;
        const cy = H / 2;
        const rx = W * 0.35;
        const ry = H * 0.35;

        for (let i = 0; i < this._notes.length; i++) {
            const n = this._notes[i];
            const phaseOffset = (i / this._notes.length) * TAU;
            const t = this.tick * n.orbitSpeed + phaseOffset;

            const prevX = n.x;
            const prevY = n.y;
            n.x = cx + Math.sin(this._lissA * t + n.phase) * rx;
            n.y = cy + Math.sin(this._lissB * t) * ry;

            // Store trail
            if (this.tick % 2 === 0 && this._trails.length < this._maxTrails) {
                this._trails.push({ x: prevX, y: prevY, hue: n.hue, life: 60 });
            }
        }

        // Decay trails
        for (let i = this._trails.length - 1; i >= 0; i--) {
            this._trails[i].life--;
            if (this._trails[i].life <= 0) {
                this._trails[i] = this._trails[this._trails.length - 1];
                this._trails.pop();
            }
        }
    }

    _spawnBurst(x, y, hue) {
        const count = 4;
        for (let i = 0; i < count; i++) {
            if (this._bursts.length > 100) break;
            const angle = (i / count) * TAU + Math.random() * 0.5;
            const speed = 1 + Math.random() * 3;
            const b = this._burstPool.length > 0 ? this._burstPool.pop() : {};
            b.x = x; b.y = y;
            b.vx = Math.cos(angle) * speed;
            b.vy = Math.sin(angle) * speed;
            b.hue = hue;
            b.life = 20 + Math.floor(Math.random() * 15);
            b.size = 1 + Math.random() * 2;
            this._bursts.push(b);
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalAlpha = this.intensity * 0.6;

        // Draw trails first (behind notes)
        if (this._trails.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const t of this._trails) {
                const alpha = (t.life / 60) * 0.15;
                ctx.fillStyle = `hsla(${t.hue}, 70%, 60%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 2, 0, TAU);
                ctx.fill();
            }
        }

        // Draw attractor glow
        ctx.globalCompositeOperation = 'lighter';
        for (const a of this._attractors) {
            const alpha = a.permanent ? 0.08 : (a.life / 120) * 0.1;
            const r = Math.sqrt(a.mass) * 0.5;
            const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r);
            g.addColorStop(0, `hsla(${a.hue}, 60%, 70%, ${alpha})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(a.x, a.y, r, 0, TAU);
            ctx.fill();
        }

        // Draw connection lines between close notes (harmonic threads)
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this._notes.length; i++) {
            for (let j = i + 1; j < this._notes.length; j++) {
                const a = this._notes[i];
                const b = this._notes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    const alpha = (1 - dist / 100) * 0.1;
                    ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 60%, 60%, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        // Draw notes
        ctx.globalCompositeOperation = 'lighter';
        for (const n of this._notes) {
            const pulse = 1 + 0.3 * Math.sin(n.phase * n.harmonic);
            const s = n.size * pulse;
            const glowR = s * 3;

            // Glow
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
            g.addColorStop(0, `hsla(${n.hue}, 80%, 65%, ${n.glowIntensity * 0.2})`);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(n.x, n.y, glowR, 0, TAU);
            ctx.fill();

            // Shape
            ctx.fillStyle = `hsla(${n.hue}, 80%, 70%, ${n.glowIntensity * 0.6})`;
            this._drawShape(ctx, n.x, n.y, s, n.shape, n.phase);
        }

        // Draw pendulum strings
        if (this.mode === 3) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = `hsla(${this.hue}, 30%, 50%, 0.1)`;
            ctx.lineWidth = 0.5;
            for (const n of this._notes) {
                ctx.beginPath();
                ctx.moveTo(n.anchorX, this._pendulumOriginY);
                ctx.lineTo(n.x, n.y);
                ctx.stroke();
            }
        }

        // Draw bursts
        if (this._bursts.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const b of this._bursts) {
                const alpha = (b.life / 35) * 0.5;
                ctx.fillStyle = `hsla(${b.hue}, 90%, 70%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawShape(ctx, x, y, size, shape, phase) {
        ctx.beginPath();
        if (shape === 'circle') {
            ctx.arc(x, y, size, 0, TAU);
        } else if (shape === 'triangle') {
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * TAU - Math.PI / 2 + phase * 0.5;
                const px = x + Math.cos(a) * size;
                const py = y + Math.sin(a) * size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else if (shape === 'diamond') {
            const r = phase * 0.3;
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size * 0.7, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size * 0.7, y);
            ctx.closePath();
        } else if (shape === 'star') {
            for (let i = 0; i < 5; i++) {
                const outerA = (i / 5) * TAU - Math.PI / 2 + phase * 0.3;
                const innerA = outerA + Math.PI / 5;
                ctx.lineTo(x + Math.cos(outerA) * size, y + Math.sin(outerA) * size);
                ctx.lineTo(x + Math.cos(innerA) * size * 0.4, y + Math.sin(innerA) * size * 0.4);
            }
            ctx.closePath();
        } else {
            // Square
            const half = size * 0.7;
            ctx.rect(x - half, y - half, half * 2, half * 2);
        }
        ctx.fill();
    }
}
