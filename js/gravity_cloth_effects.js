/**
 * @file gravity_cloth_effects.js
 * @description Interactive verlet-integration cloth simulation that drapes across the screen.
 * The cloth responds to cursor gravity, wind, and clicks tear/ripple through it.
 * Each node is connected by constraints that can stretch and snap.
 *
 * Modes:
 * 0 - Silk Curtain: Elegant flowing fabric pinned at top, shimmers with light
 * 1 - Spider Web: Radial web pattern that vibrates when touched, prey particles stick
 * 2 - Chain Mail: Rigid interlocking rings that clank and spark on collision
 * 3 - Membrane: Organic stretchy membrane that bulges toward cursor, veins pulse
 * 4 - Laser Grid: Neon grid lines that glow brighter near cursor, glitch on click
 * 5 - Crystal Lattice: Rigid crystalline structure that fractures and reforms
 */

const TAU = Math.PI * 2;
const GRAVITY = 0.15;
const DAMPING = 0.98;

function _prand(seed) {
    return (((seed * 2654435761) ^ (seed * 2246822519)) >>> 0) / 4294967296;
}

class ClothNode {
    constructor(x, y, pinned) {
        this.x = x;
        this.y = y;
        this.ox = x;
        this.oy = y;
        this.pinned = pinned;
        this.torn = false;
        this.stress = 0;
    }
}

class ClothLink {
    constructor(a, b, restLength) {
        this.a = a;
        this.b = b;
        this.restLength = restLength;
        this.broken = false;
        this.stress = 0;
    }
}

export class GravityCloth {
    constructor() {
        this.mode = 0;
        this.tick = 0;
        this.hue = 200;
        this.intensity = 1;
        this._mx = 0;
        this._my = 0;
        this._pmx = 0;
        this._pmy = 0;
        this._mouseSpeed = 0;
        this._isClicking = false;
        this._wasClicking = false;

        this.nodes = [];
        this.links = [];
        this.cols = 0;
        this.rows = 0;
        this.spacing = 0;

        // Tear particles
        this._sparks = [];
        this._sparkPool = [];

        // Wind
        this._windX = 0;
        this._windY = 0;
        this._windPhase = 0;
    }

    configure(rng, palette) {
        this.mode = Math.floor(rng() * 6);
        this.tick = 0;
        this.hue = palette.length > 0 ? palette[0].h : 200;
        this.intensity = 0.5 + rng() * 0.5;
        this._sparks = [];
        this._windPhase = rng() * TAU;

        const W = window.innerWidth;
        const H = window.innerHeight;

        if (this.mode === 1) {
            this._buildWeb(rng, W, H);
        } else {
            this._buildGrid(rng, W, H);
        }
    }

    _buildGrid(rng, W, H) {
        this.nodes = [];
        this.links = [];

        const density = this.mode === 4 ? 0.7 : (this.mode === 2 ? 0.85 : 1);
        this.cols = Math.floor(W / (20 / density));
        this.rows = Math.floor(H / (20 / density));
        this.cols = Math.min(this.cols, 80);
        this.rows = Math.min(this.rows, 60);
        this.spacing = Math.min(W / this.cols, H / this.rows);

        const offsetX = (W - this.cols * this.spacing) / 2;
        const offsetY = this.mode === 0 ? 0 : (H - this.rows * this.spacing) / 2;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = offsetX + c * this.spacing;
                const y = offsetY + r * this.spacing;
                let pinned = false;

                if (this.mode === 0) {
                    // Silk curtain: pin top row
                    pinned = r === 0 && c % 3 === 0;
                } else if (this.mode === 3) {
                    // Membrane: pin edges
                    pinned = r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1;
                } else if (this.mode === 5) {
                    // Crystal lattice: pin corners and some edge points
                    pinned = (r === 0 || r === this.rows - 1) && c % 5 === 0;
                } else if (this.mode === 4) {
                    // Laser grid: pin all edges
                    pinned = r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1;
                }

                this.nodes.push(new ClothNode(x, y, pinned));
            }
        }

        // Create horizontal and vertical links
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const idx = r * this.cols + c;
                if (c < this.cols - 1) {
                    this.links.push(new ClothLink(this.nodes[idx], this.nodes[idx + 1], this.spacing));
                }
                if (r < this.rows - 1) {
                    this.links.push(new ClothLink(this.nodes[idx], this.nodes[idx + this.cols], this.spacing));
                }
                // Diagonal bracing for modes that need rigidity
                if (this.mode === 2 || this.mode === 5) {
                    if (c < this.cols - 1 && r < this.rows - 1) {
                        this.links.push(new ClothLink(this.nodes[idx], this.nodes[idx + this.cols + 1], this.spacing * 1.414));
                    }
                }
            }
        }
    }

    _buildWeb(rng, W, H) {
        this.nodes = [];
        this.links = [];

        const cx = W / 2;
        const cy = H / 2;
        const rings = 12 + Math.floor(rng() * 8);
        const spokes = 16 + Math.floor(rng() * 16);
        const maxR = Math.min(W, H) * 0.42;

        // Center node
        const center = new ClothNode(cx, cy, true);
        this.nodes.push(center);

        // Spoke nodes
        for (let ring = 1; ring <= rings; ring++) {
            const r = (ring / rings) * maxR;
            for (let spoke = 0; spoke < spokes; spoke++) {
                const angle = (spoke / spokes) * TAU + (ring % 2) * (Math.PI / spokes);
                const jitter = (rng() - 0.5) * 8;
                const x = cx + Math.cos(angle) * (r + jitter);
                const y = cy + Math.sin(angle) * (r + jitter);
                const pinned = ring === rings && spoke % 4 === 0;
                this.nodes.push(new ClothNode(x, y, pinned));
            }
        }

        // Radial links (spokes)
        for (let ring = 1; ring <= rings; ring++) {
            for (let spoke = 0; spoke < spokes; spoke++) {
                const curr = 1 + (ring - 1) * spokes + spoke;
                if (ring === 1) {
                    const dx = this.nodes[curr].x - center.x;
                    const dy = this.nodes[curr].y - center.y;
                    this.links.push(new ClothLink(center, this.nodes[curr], Math.sqrt(dx * dx + dy * dy)));
                } else {
                    const prev = 1 + (ring - 2) * spokes + spoke;
                    const dx = this.nodes[curr].x - this.nodes[prev].x;
                    const dy = this.nodes[curr].y - this.nodes[prev].y;
                    this.links.push(new ClothLink(this.nodes[prev], this.nodes[curr], Math.sqrt(dx * dx + dy * dy)));
                }
            }
        }

        // Ring links (spiral connections)
        for (let ring = 1; ring <= rings; ring++) {
            for (let spoke = 0; spoke < spokes; spoke++) {
                const curr = 1 + (ring - 1) * spokes + spoke;
                const next = 1 + (ring - 1) * spokes + ((spoke + 1) % spokes);
                const dx = this.nodes[curr].x - this.nodes[next].x;
                const dy = this.nodes[curr].y - this.nodes[next].y;
                this.links.push(new ClothLink(this.nodes[curr], this.nodes[next], Math.sqrt(dx * dx + dy * dy)));
            }
        }

        this.cols = spokes;
        this.rows = rings;
    }

    update(mx, my, isClicking) {
        this.tick++;
        this._pmx = this._mx;
        this._pmy = this._my;
        this._mx = mx;
        this._my = my;
        this._mouseSpeed = Math.sqrt((mx - this._pmx) ** 2 + (my - this._pmy) ** 2);

        // Wind
        this._windPhase += 0.01;
        this._windX = Math.sin(this._windPhase) * 0.3 + Math.sin(this._windPhase * 2.7) * 0.15;
        this._windY = Math.cos(this._windPhase * 0.7) * 0.1;

        // Click effects
        if (isClicking && !this._wasClicking) {
            this._handleClick(mx, my);
        }
        this._wasClicking = isClicking;
        this._isClicking = isClicking;

        // Verlet integration
        const tearThreshold = this.mode === 5 ? this.spacing * 3 : this.spacing * 2.5;

        for (const node of this.nodes) {
            if (node.pinned || node.torn) continue;

            const vx = (node.x - node.ox) * DAMPING;
            const vy = (node.y - node.oy) * DAMPING;

            node.ox = node.x;
            node.oy = node.y;

            // Gravity (mode-dependent)
            const grav = this.mode === 0 ? GRAVITY : (this.mode === 3 ? GRAVITY * 0.3 : GRAVITY * 0.5);
            node.x += vx + this._windX;
            node.y += vy + grav + this._windY;

            // Mouse interaction
            const dx = mx - node.x;
            const dy = my - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = this.mode === 3 ? 200 : 120;

            if (dist < radius && dist > 0) {
                const force = (1 - dist / radius) * (isClicking ? 8 : 3);
                if (this.mode === 3) {
                    // Membrane: push toward cursor
                    node.x += (dx / dist) * force;
                    node.y += (dy / dist) * force;
                } else {
                    // Others: push away or drag
                    const pushDir = isClicking ? -1 : 1;
                    node.x += (dx / dist) * force * pushDir * 0.3;
                    node.y += (dy / dist) * force * pushDir * 0.3;
                }
            }

            // Mouse velocity influence
            if (dist < 150) {
                const inf = (1 - dist / 150) * 0.15;
                node.x += (mx - this._pmx) * inf;
                node.y += (my - this._pmy) * inf;
            }
        }

        // Constraint solving (3 iterations for stability)
        for (let iter = 0; iter < 3; iter++) {
            for (const link of this.links) {
                if (link.broken) continue;
                const a = link.a;
                const b = link.b;
                if (a.torn && b.torn) continue;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) continue;

                const diff = (dist - link.restLength) / dist;
                link.stress = Math.abs(dist - link.restLength) / link.restLength;

                // Tear check
                if (dist > tearThreshold) {
                    link.broken = true;
                    this._spawnTearSparks(
                        (a.x + b.x) / 2,
                        (a.y + b.y) / 2,
                        4
                    );
                    continue;
                }

                const cx = dx * diff * 0.5;
                const cy = dy * diff * 0.5;

                if (!a.pinned && !a.torn) { a.x += cx; a.y += cy; }
                if (!b.pinned && !b.torn) { b.x -= cx; b.y -= cy; }
            }
        }

        // Update sparks
        for (let i = this._sparks.length - 1; i >= 0; i--) {
            const s = this._sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.1;
            s.vx *= 0.97;
            s.vy *= 0.97;
            s.life--;
            if (s.life <= 0) {
                this._sparkPool.push(s);
                this._sparks[i] = this._sparks[this._sparks.length - 1];
                this._sparks.pop();
            }
        }
    }

    _handleClick(mx, my) {
        const tearRadius = this.mode === 4 ? 80 : 60;

        for (const link of this.links) {
            if (link.broken) continue;
            const midX = (link.a.x + link.b.x) / 2;
            const midY = (link.a.y + link.b.y) / 2;
            const dx = mx - midX;
            const dy = my - midY;
            if (dx * dx + dy * dy < tearRadius * tearRadius) {
                link.broken = true;
                this._spawnTearSparks(midX, midY, 2);
            }
        }
    }

    _spawnTearSparks(x, y, count) {
        if (this._sparks.length > 100) return;
        for (let i = 0; i < count; i++) {
            const seed = this.tick * 31 + i * 97 + (x * 7 | 0);
            const spark = this._sparkPool.length > 0 ? this._sparkPool.pop() : {};
            const angle = _prand(seed) * TAU;
            const speed = 1 + _prand(seed + 1) * 4;
            spark.x = x;
            spark.y = y;
            spark.vx = Math.cos(angle) * speed;
            spark.vy = Math.sin(angle) * speed;
            spark.life = 15 + _prand(seed + 2) * 20;
            spark.maxLife = spark.life;
            spark.hue = (this.hue + _prand(seed + 3) * 60) % 360;
            this._sparks.push(spark);
        }
    }

    draw(ctx, system) {
        ctx.save();

        if (this.mode === 0) this._drawSilk(ctx);
        else if (this.mode === 1) this._drawWeb(ctx);
        else if (this.mode === 2) this._drawChainMail(ctx);
        else if (this.mode === 3) this._drawMembrane(ctx);
        else if (this.mode === 4) this._drawLaserGrid(ctx);
        else if (this.mode === 5) this._drawCrystalLattice(ctx);

        // Draw sparks
        if (this._sparks.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            for (const s of this._sparks) {
                const ratio = s.life / s.maxLife;
                ctx.fillStyle = `hsla(${s.hue}, 80%, 75%, ${ratio * 0.6 * this.intensity})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 1.5 + ratio * 2, 0, TAU);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawSilk(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        const lightX = this._mx;
        const lightY = this._my;

        for (const link of this.links) {
            if (link.broken) continue;
            const a = link.a;
            const b = link.b;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;

            // Light reflection based on angle to cursor
            const dx = lightX - midX;
            const dy = lightY - midY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const shimmer = Math.max(0, 1 - dist / 400) * 0.3;
            const stress = Math.min(1, link.stress * 3);
            const alpha = (0.08 + shimmer + stress * 0.15) * this.intensity;

            const h = (this.hue + stress * 30) % 360;
            ctx.strokeStyle = `hsla(${h}, 60%, ${60 + shimmer * 30}%, ${alpha})`;
            ctx.lineWidth = 0.5 + shimmer * 1.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }

    _drawWeb(ctx) {
        ctx.globalCompositeOperation = 'lighter';

        for (const link of this.links) {
            if (link.broken) continue;
            const a = link.a;
            const b = link.b;

            const stress = Math.min(1, link.stress * 5);
            const vibration = stress > 0.1 ? Math.sin(this.tick * 0.5 + stress * 10) * stress * 2 : 0;
            const alpha = (0.12 + stress * 0.2) * this.intensity;

            ctx.strokeStyle = `hsla(${this.hue}, 20%, ${70 + vibration * 10}%, ${alpha})`;
            ctx.lineWidth = 0.3 + stress * 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Dew drops on web
            if (_prand(a.x * 7 + a.y * 13 | 0) > 0.92) {
                const dewAlpha = 0.3 * this.intensity;
                ctx.fillStyle = `hsla(${this.hue + 40}, 60%, 85%, ${dewAlpha})`;
                ctx.beginPath();
                ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 1.5, 0, TAU);
                ctx.fill();
            }
        }
    }

    _drawChainMail(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        const spacing = this.spacing;

        // Draw links as small interlocking rings
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (node.torn) continue;

            const col = i % this.cols;
            const row = Math.floor(i / this.cols);
            if ((col + row) % 2 !== 0) continue;

            const distToMouse = Math.sqrt((this._mx - node.x) ** 2 + (this._my - node.y) ** 2);
            const glow = Math.max(0, 1 - distToMouse / 200) * 0.3;
            const alpha = (0.1 + glow) * this.intensity;

            ctx.strokeStyle = `hsla(${this.hue + 20}, 30%, ${55 + glow * 30}%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.ellipse(node.x, node.y, spacing * 0.4, spacing * 0.3, 0, 0, TAU);
            ctx.stroke();
        }
    }

    _drawMembrane(ctx) {
        ctx.globalCompositeOperation = 'lighter';

        // Draw as filled triangular mesh with transparency
        for (let r = 0; r < this.rows - 1; r++) {
            for (let c = 0; c < this.cols - 1; c++) {
                const i = r * this.cols + c;
                const n0 = this.nodes[i];
                const n1 = this.nodes[i + 1];
                const n2 = this.nodes[i + this.cols];
                const n3 = this.nodes[i + this.cols + 1];
                if (n0.torn || n1.torn || n2.torn || n3.torn) continue;

                // Calculate stretch for color
                const dx1 = n1.x - n0.x;
                const dy1 = n1.y - n0.y;
                const stretch = Math.sqrt(dx1 * dx1 + dy1 * dy1) / this.spacing;
                const stretchColor = Math.min(1, Math.abs(stretch - 1) * 3);

                const h = (this.hue + stretchColor * 40) % 360;
                const alpha = (0.04 + stretchColor * 0.08) * this.intensity;

                ctx.fillStyle = `hsla(${h}, 50%, 50%, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(n0.x, n0.y);
                ctx.lineTo(n1.x, n1.y);
                ctx.lineTo(n3.x, n3.y);
                ctx.lineTo(n2.x, n2.y);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Pulsing veins along links
        if (this.tick % 3 === 0) {
            const veinPhase = this.tick * 0.05;
            ctx.lineWidth = 0.6;
            for (let i = 0; i < this.links.length; i += 4) {
                const link = this.links[i];
                if (link.broken) continue;
                const pulse = (Math.sin(veinPhase + i * 0.1) + 1) / 2;
                if (pulse < 0.6) continue;
                const alpha = (pulse - 0.6) * 0.5 * this.intensity;
                ctx.strokeStyle = `hsla(${(this.hue + 160) % 360}, 80%, 50%, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(link.a.x, link.a.y);
                ctx.lineTo(link.b.x, link.b.y);
                ctx.stroke();
            }
        }
    }

    _drawLaserGrid(ctx) {
        ctx.globalCompositeOperation = 'lighter';

        for (const link of this.links) {
            if (link.broken) continue;
            const a = link.a;
            const b = link.b;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;

            const dx = this._mx - midX;
            const dy = this._my - midY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const glow = Math.max(0, 1 - dist / 250);
            const glitchOffset = (this._isClicking && dist < 150)
                ? Math.sin(this.tick * 3 + dist) * 3 : 0;

            const alpha = (0.06 + glow * 0.35) * this.intensity;
            const h = (this.hue + glow * 30) % 360;

            ctx.strokeStyle = `hsla(${h}, 90%, ${55 + glow * 35}%, ${alpha})`;
            ctx.lineWidth = 0.5 + glow * 2;
            ctx.beginPath();
            ctx.moveTo(a.x + glitchOffset, a.y);
            ctx.lineTo(b.x + glitchOffset, b.y);
            ctx.stroke();

            // Bright intersection nodes near cursor
            if (glow > 0.5) {
                ctx.fillStyle = `hsla(${h}, 100%, 85%, ${(glow - 0.5) * 0.4 * this.intensity})`;
                ctx.beginPath();
                ctx.arc(a.x, a.y, 2 + glow * 3, 0, TAU);
                ctx.fill();
            }
        }
    }

    _drawCrystalLattice(ctx) {
        ctx.globalCompositeOperation = 'lighter';

        for (const link of this.links) {
            if (link.broken) continue;
            const a = link.a;
            const b = link.b;

            const stress = Math.min(1, link.stress * 4);
            const crackGlow = stress > 0.5 ? (stress - 0.5) * 2 : 0;
            const alpha = (0.08 + crackGlow * 0.25) * this.intensity;

            const h = stress > 0.5
                ? (this.hue + 30 + crackGlow * 20) % 360
                : this.hue;
            const l = 55 + crackGlow * 30;

            ctx.strokeStyle = `hsla(${h}, 50%, ${l}%, ${alpha})`;
            ctx.lineWidth = 0.6 + crackGlow * 1.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        // Crystal nodes glow at intersections
        for (let i = 0; i < this.nodes.length; i += 3) {
            const n = this.nodes[i];
            if (n.torn) continue;
            const dx = this._mx - n.x;
            const dy = this._my - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const glow = Math.max(0, 1 - dist / 200);
            if (glow > 0.2) {
                const alpha = (glow - 0.2) * 0.2 * this.intensity;
                ctx.fillStyle = `hsla(${(this.hue + 60) % 360}, 70%, 80%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, 2 + glow * 4, 0, TAU);
                ctx.fill();
            }
        }
    }
}
