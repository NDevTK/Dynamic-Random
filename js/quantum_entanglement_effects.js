/**
 * @file quantum_entanglement_effects.js
 * @description Paired quantum particles that mirror each other's movements across
 * the screen, connected by shimmering entanglement beams. When one particle is
 * disturbed (cursor proximity), its entangled partner reacts instantly with
 * complementary motion. Clicking "measures" particles, collapsing their states.
 *
 * Modes:
 * 0 - Spin Pair: Pairs orbit in opposite directions, connected by phase-locked beams
 * 1 - Mirror Dimension: Left half mirrors to right, particles reflect across center
 * 2 - Quantum Tunnel: Particles teleport between portals with probability clouds
 * 3 - Superposition Ghost: Each particle exists as multiple translucent copies
 * 4 - Wave Function: Particles are probability clouds that collapse on observation
 * 5 - Entangled Web: Many-body entanglement creates a web of correlated nodes
 */

const TAU = Math.PI * 2;

export class QuantumEntanglement {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 260;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.pairs = [];
        this.maxPairs = 20;

        // Portals for tunnel mode
        this._portals = [];

        // Collapse events
        this._collapses = [];
        this._collapsePool = [];

        // Entanglement beams
        this._beamPhase = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 260;
        this.intensity = 0.5 + rng() * 0.6;
        this.pairs = [];
        this._collapses = [];
        this._beamPhase = rng() * TAU;

        const W = window.innerWidth, H = window.innerHeight;
        const pairCount = this.mode === 5
            ? 12 + Math.floor(rng() * 8)
            : 6 + Math.floor(rng() * 8);
        this.maxPairs = pairCount;

        for (let i = 0; i < pairCount; i++) {
            const cx = rng() * W, cy = rng() * H;
            const angle = rng() * TAU;
            const dist = 80 + rng() * 200;
            const orbitR = 20 + rng() * 40;

            this.pairs.push({
                // Particle A
                ax: cx + Math.cos(angle) * dist / 2,
                ay: cy + Math.sin(angle) * dist / 2,
                avx: 0, avy: 0,
                // Particle B (entangled partner)
                bx: cx - Math.cos(angle) * dist / 2,
                by: cy - Math.sin(angle) * dist / 2,
                bvx: 0, bvy: 0,
                // Shared state
                phase: rng() * TAU,
                orbitSpeed: 0.01 + rng() * 0.03,
                orbitR,
                hueOffset: (rng() - 0.5) * 40,
                spin: rng() > 0.5 ? 1 : -1, // opposite spins
                size: 3 + rng() * 4,
                coherence: 1, // drops on measurement
                superpositionCount: this.mode === 3 ? 3 + Math.floor(rng() * 3) : 1,
                waveFnRadius: this.mode === 4 ? 30 + rng() * 50 : 0,
                collapsed: false,
            });
        }

        if (this.mode === 2) {
            this._portals = [];
            const portalCount = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < portalCount; i++) {
                this._portals.push({
                    x: rng() * W,
                    y: rng() * H,
                    radius: 30 + rng() * 30,
                    hue: (this.hue + rng() * 60) % 360,
                    phase: rng() * TAU,
                    partner: (i + 1) % portalCount
                });
            }
        }
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);
        this._beamPhase += 0.03;

        // Click: "measure" nearby pairs
        if (isClicking && !this._wasClicking) {
            for (const pair of this.pairs) {
                const dax = mx - pair.ax, day = my - pair.ay;
                const dbx = mx - pair.bx, dby = my - pair.by;
                const distA = Math.sqrt(dax * dax + day * day);
                const distB = Math.sqrt(dbx * dbx + dby * dby);

                if (distA < 100 || distB < 100) {
                    pair.coherence = 0.1;
                    pair.collapsed = true;
                    // Collapse event
                    const cx = distA < distB ? pair.ax : pair.bx;
                    const cy = distA < distB ? pair.ay : pair.by;
                    const collapse = this._collapsePool.length > 0 ? this._collapsePool.pop() : {};
                    collapse.x = cx; collapse.y = cy;
                    collapse.radius = 0;
                    collapse.maxRadius = 80;
                    collapse.life = 1;
                    this._collapses.push(collapse);
                }
            }
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        const W = window.innerWidth, H = window.innerHeight;

        for (const pair of this.pairs) {
            pair.phase += pair.orbitSpeed;
            pair.coherence = Math.min(1, pair.coherence + 0.001); // Slowly re-cohere
            if (pair.coherence > 0.9) pair.collapsed = false;

            // Cursor interaction - disturb particle A, B reacts inversely
            const dax = mx - pair.ax, day = my - pair.ay;
            const distA = Math.sqrt(dax * dax + day * day);

            if (distA < 150 && distA > 0) {
                const force = (1 - distA / 150) * 0.3;
                // A gets pushed
                pair.avx += (dax / distA) * force;
                pair.avy += (day / distA) * force;
                // B reacts in complementary way (entanglement!)
                pair.bvx -= (dax / distA) * force * pair.coherence;
                pair.bvy -= (day / distA) * force * pair.coherence;
            }

            const dbx = mx - pair.bx, dby = my - pair.by;
            const distB = Math.sqrt(dbx * dbx + dby * dby);
            if (distB < 150 && distB > 0) {
                const force = (1 - distB / 150) * 0.3;
                pair.bvx += (dbx / distB) * force;
                pair.bvy += (dby / distB) * force;
                pair.avx -= (dbx / distB) * force * pair.coherence;
                pair.avy -= (dby / distB) * force * pair.coherence;
            }

            // Mode-specific behavior
            if (this.mode === 0) {
                // Orbital motion
                const cx = (pair.ax + pair.bx) / 2;
                const cy = (pair.ay + pair.by) / 2;
                pair.avx += (cx + Math.cos(pair.phase) * pair.orbitR - pair.ax) * 0.01;
                pair.avy += (cy + Math.sin(pair.phase) * pair.orbitR - pair.ay) * 0.01;
                pair.bvx += (cx + Math.cos(pair.phase + Math.PI) * pair.orbitR - pair.bx) * 0.01;
                pair.bvy += (cy + Math.sin(pair.phase + Math.PI) * pair.orbitR - pair.by) * 0.01;
            } else if (this.mode === 1) {
                // Mirror across vertical center line
                const cx = W / 2;
                const cy = H / 2;
                pair.bx = cx + (cx - pair.ax);
                pair.by = cy + (cy - pair.ay);
                pair.bvx = -pair.avx;
                pair.bvy = -pair.avy;
            }

            // Apply velocity
            pair.ax += pair.avx;
            pair.ay += pair.avy;
            pair.bx += pair.bvx;
            pair.by += pair.bvy;

            // Damping
            pair.avx *= 0.97;
            pair.avy *= 0.97;
            pair.bvx *= 0.97;
            pair.bvy *= 0.97;

            // Boundary bounce
            if (pair.ax < 0 || pair.ax > W) pair.avx *= -0.8;
            if (pair.ay < 0 || pair.ay > H) pair.avy *= -0.8;
            if (pair.bx < 0 || pair.bx > W) pair.bvx *= -0.8;
            if (pair.by < 0 || pair.by > H) pair.bvy *= -0.8;
            pair.ax = Math.max(0, Math.min(W, pair.ax));
            pair.ay = Math.max(0, Math.min(H, pair.ay));
            pair.bx = Math.max(0, Math.min(W, pair.bx));
            pair.by = Math.max(0, Math.min(H, pair.by));
        }

        // Quantum tunnel: teleport between portals
        if (this.mode === 2) {
            for (const portal of this._portals) {
                portal.phase += 0.02;
            }
        }

        // Update collapses
        for (let i = this._collapses.length - 1; i >= 0; i--) {
            const c = this._collapses[i];
            c.radius += 3;
            c.life = Math.max(0, 1 - c.radius / c.maxRadius);
            if (c.life <= 0) {
                this._collapsePool.push(c);
                this._collapses[i] = this._collapses[this._collapses.length - 1];
                this._collapses.pop();
            }
        }
    }

    draw(ctx, system) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Draw entanglement beams between pairs
        for (const pair of this.pairs) {
            const hue = (this.hue + pair.hueOffset + 360) % 360;
            const beamAlpha = pair.coherence * 0.1 * this.intensity;

            if (beamAlpha > 0.01) {
                // Shimmering beam
                const segments = 20;
                ctx.strokeStyle = `hsla(${hue}, 70%, 65%, ${beamAlpha})`;
                ctx.lineWidth = 0.5 + pair.coherence;
                ctx.beginPath();
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const x = pair.ax + (pair.bx - pair.ax) * t;
                    const y = pair.ay + (pair.by - pair.ay) * t;
                    // Wave interference pattern along beam
                    const wave = Math.sin(t * Math.PI * 8 + this._beamPhase) * 5 * pair.coherence;
                    const perpAngle = Math.atan2(pair.by - pair.ay, pair.bx - pair.ax) + Math.PI / 2;
                    const px = x + Math.cos(perpAngle) * wave;
                    const py = y + Math.sin(perpAngle) * wave;
                    if (s === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();

                // Second beam offset (interference)
                ctx.strokeStyle = `hsla(${(hue + 30) % 360}, 70%, 65%, ${beamAlpha * 0.5})`;
                ctx.lineWidth = 0.3;
                ctx.beginPath();
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const x = pair.ax + (pair.bx - pair.ax) * t;
                    const y = pair.ay + (pair.by - pair.ay) * t;
                    const wave = Math.sin(t * Math.PI * 8 + this._beamPhase + Math.PI) * 5 * pair.coherence;
                    const perpAngle = Math.atan2(pair.by - pair.ay, pair.bx - pair.ax) + Math.PI / 2;
                    if (s === 0) ctx.moveTo(x + Math.cos(perpAngle) * wave, y + Math.sin(perpAngle) * wave);
                    else ctx.lineTo(x + Math.cos(perpAngle) * wave, y + Math.sin(perpAngle) * wave);
                }
                ctx.stroke();
            }

            // Draw particles
            this._drawParticle(ctx, pair.ax, pair.ay, pair, hue, 'A');
            this._drawParticle(ctx, pair.bx, pair.by, pair, (hue + 180) % 360, 'B');
        }

        // Portals for tunnel mode
        if (this.mode === 2) {
            for (const portal of this._portals) {
                const alpha = 0.08 * this.intensity;
                const r = portal.radius + Math.sin(portal.phase) * 5;

                // Swirling rings
                for (let ring = 0; ring < 3; ring++) {
                    const ringR = r * (1 - ring * 0.2);
                    const ringHue = (portal.hue + ring * 30 + this.tick) % 360;
                    ctx.strokeStyle = `hsla(${ringHue}, 80%, 65%, ${alpha * (1 - ring * 0.3)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(portal.x, portal.y, ringR, 0, TAU);
                    ctx.stroke();
                }
            }
        }

        // Collapse events
        for (const c of this._collapses) {
            const alpha = c.life * 0.3 * this.intensity;
            // Contracting ring (measurement collapse)
            ctx.strokeStyle = `hsla(${this.hue}, 60%, 80%, ${alpha})`;
            ctx.lineWidth = 2 * c.life;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius, 0, TAU);
            ctx.stroke();

            // Probability cloud dissipating
            if (c.life > 0.3) {
                const cloudAlpha = (c.life - 0.3) * 0.2 * this.intensity;
                ctx.fillStyle = `hsla(${this.hue + 30}, 50%, 70%, ${cloudAlpha})`;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.maxRadius - c.radius, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawParticle(ctx, x, y, pair, hue, label) {
        const baseAlpha = 0.3 * this.intensity;
        const size = pair.size;

        // Superposition ghosts (mode 3)
        if (this.mode === 3 && !pair.collapsed) {
            for (let g = 1; g < pair.superpositionCount; g++) {
                const ghostAngle = (g / pair.superpositionCount) * TAU + pair.phase;
                const ghostR = 15 + g * 10;
                const gx = x + Math.cos(ghostAngle) * ghostR;
                const gy = y + Math.sin(ghostAngle) * ghostR;
                const ghostAlpha = baseAlpha * 0.15 * pair.coherence;
                ctx.fillStyle = `hsla(${hue}, 60%, 65%, ${ghostAlpha})`;
                ctx.beginPath();
                ctx.arc(gx, gy, size * 0.7, 0, TAU);
                ctx.fill();
            }
        }

        // Wave function cloud (mode 4)
        if (this.mode === 4 && !pair.collapsed) {
            const wfAlpha = baseAlpha * 0.05 * pair.coherence;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, pair.waveFnRadius);
            grad.addColorStop(0, `hsla(${hue}, 50%, 60%, ${wfAlpha * 3})`);
            grad.addColorStop(0.5, `hsla(${hue}, 60%, 55%, ${wfAlpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, pair.waveFnRadius, 0, TAU);
            ctx.fill();
        }

        // Outer glow
        ctx.fillStyle = `hsla(${hue}, 60%, 60%, ${baseAlpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, TAU);
        ctx.fill();

        // Main particle
        ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${baseAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();

        // Spin indicator
        const spinAngle = pair.phase * pair.spin;
        const spinR = size * 1.5;
        ctx.strokeStyle = `hsla(${hue}, 80%, 80%, ${baseAlpha * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, spinR, spinAngle, spinAngle + Math.PI * 1.2);
        ctx.stroke();

        // Bright core
        ctx.fillStyle = `hsla(${hue}, 40%, 90%, ${baseAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.35, 0, TAU);
        ctx.fill();
    }
}
