/**
 * @file ambient_fx.js
 * @description Full-screen ambient overlay effects with 6 seed-randomized visual modes.
 * Renders on a separate canvas layer between the background and particle systems.
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { withAlpha } from './color_palettes.js';

const TAU = Math.PI * 2;

// ═══════════════════════════════════════════════
//  EFFECT: Bokeh
// ═══════════════════════════════════════════════
function initBokeh(sys) {
    sys.state.circles = [];
    const count = 12 + Math.floor(sys.rng() * 18);
    for (let i = 0; i < count; i++) {
        sys.state.circles.push({
            x: sys.rng() * sys.width,
            y: sys.rng() * sys.height,
            vx: (sys.rng() - 0.5) * 0.3,
            vy: (sys.rng() - 0.5) * 0.3 - 0.1,
            radius: 15 + sys.rng() * 60,
            alpha: 0.02 + sys.rng() * 0.06,
            color: sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)],
            pulsePhase: sys.rng() * TAU,
            pulseSpeed: 0.005 + sys.rng() * 0.015
        });
    }
}

function drawBokeh(sys) {
    const { ctx, state } = sys;
    ctx.globalCompositeOperation = 'lighter';
    const mx = mouse.x, my = mouse.y;

    for (const c of state.circles) {
        c.x += c.vx;
        c.y += c.vy;
        // Wrap around
        if (c.x < -c.radius) c.x = sys.width + c.radius;
        if (c.x > sys.width + c.radius) c.x = -c.radius;
        if (c.y < -c.radius) c.y = sys.height + c.radius;
        if (c.y > sys.height + c.radius) c.y = -c.radius;

        const pulse = 1 + 0.2 * Math.sin(sys.tick * c.pulseSpeed + c.pulsePhase);
        const r = c.radius * pulse;

        // Mouse proximity brightening (squared distance for fast reject)
        const dx = c.x - mx;
        const dy = c.y - my;
        const distSq = dx * dx + dy * dy;
        const proximity = distSq < 90000 ? Math.max(0, 1 - Math.sqrt(distSq) / 300) : 0;
        const a = c.alpha + proximity * 0.04;

        // Use a simple filled circle with alpha instead of per-frame gradient for most circles
        // Only use gradient for large/close circles where the effect is visible
        if (r > 30 || proximity > 0.3) {
            const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
            g.addColorStop(0, withAlpha(c.color, a * 0.8));
            g.addColorStop(0.6, withAlpha(c.color, a * 0.3));
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = withAlpha(c.color, a * 0.4);
        }
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.fill();

        // Bokeh ring highlight
        ctx.strokeStyle = withAlpha(c.color, a * 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.85, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  EFFECT: Aurora Shimmer
// ═══════════════════════════════════════════════
function initAuroraShimmer(sys) {
    sys.state.bands = [];
    const count = 3 + Math.floor(sys.rng() * 3);
    for (let i = 0; i < count; i++) {
        sys.state.bands.push({
            y: sys.height * (0.2 + sys.rng() * 0.5),
            amplitude: 20 + sys.rng() * 50,
            frequency: 0.002 + sys.rng() * 0.004,
            speed: 0.005 + sys.rng() * 0.01,
            thickness: 30 + sys.rng() * 60,
            color: sys.palette.primary[i % sys.palette.primary.length],
            phase: sys.rng() * TAU
        });
    }
}

function drawAuroraShimmer(sys) {
    const { ctx, state } = sys;
    ctx.globalCompositeOperation = 'lighter';

    for (const band of state.bands) {
        // Pre-compute wave points at a coarser step for performance
        const step = 16;
        const points = [];
        for (let x = -20; x <= sys.width + 20; x += step) {
            const wave = Math.sin(x * band.frequency + sys.tick * band.speed + band.phase) * band.amplitude;
            const wave2 = Math.sin(x * band.frequency * 1.7 + sys.tick * band.speed * 0.7) * band.amplitude * 0.3;
            let y = band.y + wave + wave2;

            // Mouse influence (inlined)
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000) {
                const dist = Math.sqrt(distSq);
                y += (1 - dist / 200) * 40 * Math.sign(dy || 1);
            }
            points.push(y);
        }

        // Draw band as a single filled path instead of per-segment gradients
        const halfThick = band.thickness / 2;
        ctx.fillStyle = withAlpha(band.color, 0.05);
        ctx.beginPath();
        // Top edge
        let px = -20;
        ctx.moveTo(px, points[0] - halfThick);
        for (let i = 1; i < points.length; i++) {
            px = -20 + i * step;
            ctx.lineTo(px, points[i] - halfThick);
        }
        // Bottom edge (reverse)
        for (let i = points.length - 1; i >= 0; i--) {
            px = -20 + i * step;
            ctx.lineTo(px, points[i] + halfThick);
        }
        ctx.closePath();
        ctx.fill();

        // Bright center line
        ctx.strokeStyle = withAlpha(band.color, 0.07);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-20, points[0]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(-20 + i * step, points[i]);
        }
        ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  EFFECT: Grid Pulse
// ═══════════════════════════════════════════════
function initGridPulse(sys) {
    sys.state.spacing = 30 + Math.floor(sys.rng() * 40);
    sys.state.dotSize = 1 + sys.rng() * 2;
    sys.state.waveSpeed = 0.003 + sys.rng() * 0.005;
    sys.state.mouseRadius = 100 + sys.rng() * 150;
    sys.state.gridStyle = Math.floor(sys.rng() * 3); // 0=dots, 1=crosses, 2=lines
}

function drawGridPulse(sys) {
    const { ctx, palette, state } = sys;
    const sp = state.spacing;
    const mx = mouse.x, my = mouse.y;
    const mouseRadiusSq = state.mouseRadius * state.mouseRadius;

    ctx.globalCompositeOperation = 'lighter';

    // Batch draws by alpha level to reduce state changes
    // Use a single beginPath per batch for dots/crosses
    const baseColor = palette.primary[0];

    if (state.gridStyle === 0) {
        // Dots - batch into a single path per alpha range
        ctx.fillStyle = withAlpha(baseColor, 0.06);
        ctx.beginPath();
        for (let x = 0; x < sys.width; x += sp) {
            for (let y = 0; y < sys.height; y += sp) {
                const dx = x - mx, dy = y - my;
                const distSq = dx * dx + dy * dy;
                const proximity = distSq < mouseRadiusSq ? 1 - Math.sqrt(distSq) / state.mouseRadius : 0;
                if (proximity < 0.05) continue; // Skip dim dots for performance
                const size = state.dotSize * (1 + proximity * 2);
                ctx.moveTo(x + size, y);
                ctx.arc(x, y, size, 0, TAU);
            }
        }
        ctx.fill();

        // Background dim dots (single pass)
        ctx.fillStyle = withAlpha(baseColor, 0.03);
        ctx.beginPath();
        for (let x = 0; x < sys.width; x += sp) {
            for (let y = 0; y < sys.height; y += sp) {
                const dx = x - mx, dy = y - my;
                const distSq = dx * dx + dy * dy;
                if (distSq < mouseRadiusSq) continue;
                ctx.moveTo(x + state.dotSize, y);
                ctx.arc(x, y, state.dotSize, 0, TAU);
            }
        }
        ctx.fill();
    } else if (state.gridStyle === 1) {
        // Crosses - batch
        ctx.strokeStyle = withAlpha(baseColor, 0.08);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let x = 0; x < sys.width; x += sp) {
            for (let y = 0; y < sys.height; y += sp) {
                const dx = x - mx, dy = y - my;
                const distSq = dx * dx + dy * dy;
                const proximity = distSq < mouseRadiusSq ? 1 - Math.sqrt(distSq) / state.mouseRadius : 0;
                const size = state.dotSize * (1 + proximity * 2);
                ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
                ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
            }
        }
        ctx.stroke();
    } else {
        // Connected lines - batch
        ctx.strokeStyle = withAlpha(baseColor, 0.03);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x < sys.width; x += sp) {
            for (let y = 0; y < sys.height; y += sp) {
                if (x + sp <= sys.width) {
                    ctx.moveTo(x, y); ctx.lineTo(x + sp, y);
                }
                if (y + sp <= sys.height) {
                    ctx.moveTo(x, y); ctx.lineTo(x, y + sp);
                }
            }
        }
        ctx.stroke();
        // Dots at intersections near mouse
        ctx.fillStyle = withAlpha(baseColor, 0.1);
        ctx.beginPath();
        for (let x = 0; x < sys.width; x += sp) {
            for (let y = 0; y < sys.height; y += sp) {
                const dx = x - mx, dy = y - my;
                if (dx * dx + dy * dy < mouseRadiusSq) {
                    ctx.moveTo(x + state.dotSize, y);
                    ctx.arc(x, y, state.dotSize, 0, TAU);
                }
            }
        }
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  EFFECT: Plasma Field
// ═══════════════════════════════════════════════
function initPlasma(sys) {
    sys.state.scale = 0.005 + sys.rng() * 0.01;
    sys.state.speed = 0.01 + sys.rng() * 0.02;
    sys.state.cellSize = 6 + Math.floor(sys.rng() * 6);
    sys.state.hueRange = 60 + sys.rng() * 200;
    sys.state.hueBase = Math.floor(sys.rng() * 360);
}

function drawPlasma(sys) {
    const { ctx, state } = sys;
    const { scale, speed, hueRange, hueBase } = state;
    // Use larger cells at runtime for performance (minimum 10px)
    const cellSize = Math.max(10, state.cellSize);
    const t = sys.tick * speed;

    // Pre-compute row-independent sin values for x
    const colCount = Math.ceil(sys.width / cellSize);
    const rowCount = Math.ceil(sys.height / cellSize);
    const sinX = new Float32Array(colCount);
    const sinXY_base = new Float32Array(colCount);
    for (let cx = 0; cx < colCount; cx++) {
        const x = cx * cellSize;
        sinX[cx] = Math.sin(x * scale + t);
        sinXY_base[cx] = x * scale * 0.5;
    }

    for (let cy = 0; cy < rowCount; cy++) {
        const y = cy * cellSize;
        const v2 = Math.sin(y * scale + t * 0.7);
        const yPart = y * scale * 0.5 + t * 1.3;

        for (let cx = 0; cx < colCount; cx++) {
            const x = cx * cellSize;
            const v1 = sinX[cx];
            const v3 = Math.sin(sinXY_base[cx] + yPart);
            const v4 = Math.sin(Math.sqrt(x * x + y * y) * scale * 0.3 + t * 0.5);
            const v = (v1 + v2 + v3 + v4) * 0.25;

            const hue = (hueBase + v * hueRange + 360) % 360;
            ctx.fillStyle = `hsla(${hue | 0}, 80%, 50%, 0.03)`;
            ctx.fillRect(x, y, cellSize, cellSize);
        }
    }
}

// ═══════════════════════════════════════════════
//  EFFECT: Floating Particles
// ═══════════════════════════════════════════════
function initFloatingParticles(sys) {
    sys.state.motes = [];
    const count = 30 + Math.floor(sys.rng() * 40);
    for (let i = 0; i < count; i++) {
        sys.state.motes.push({
            x: sys.rng() * sys.width,
            y: sys.rng() * sys.height,
            vx: (sys.rng() - 0.5) * 0.5,
            vy: (sys.rng() - 0.5) * 0.5,
            size: 1 + sys.rng() * 3,
            alpha: 0.05 + sys.rng() * 0.15,
            pulsePhase: sys.rng() * TAU,
            pulseSpeed: 0.01 + sys.rng() * 0.03,
            color: sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)]
        });
    }
    sys.state.connectionDist = 80 + sys.rng() * 60;
}

function drawFloatingParticles(sys) {
    const { ctx, state } = sys;

    ctx.globalCompositeOperation = 'lighter';
    // Connections - use squared distance to avoid sqrt in inner loop
    const connDistSq = state.connectionDist * state.connectionDist;
    const connDist = state.connectionDist;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < state.motes.length; i++) {
        const m1 = state.motes[i];
        for (let j = i + 1; j < state.motes.length; j++) {
            const m2 = state.motes[j];
            const dx = m1.x - m2.x;
            // Early reject on single axis
            if (dx > connDist || dx < -connDist) continue;
            const dy = m1.y - m2.y;
            if (dy > connDist || dy < -connDist) continue;
            const distSq = dx * dx + dy * dy;
            if (distSq < connDistSq) {
                const dist = Math.sqrt(distSq);
                const alpha = (1 - dist / connDist) * 0.08;
                ctx.strokeStyle = withAlpha(m1.color, alpha);
                ctx.beginPath();
                ctx.moveTo(m1.x, m1.y);
                ctx.lineTo(m2.x, m2.y);
                ctx.stroke();
            }
        }
    }

    // Particles
    for (const m of state.motes) {
        // Mouse repulsion (use squared distance for early reject)
        const dx = m.x - mouse.x;
        const dy = m.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 22500 && distSq > 0) {
            const dist = Math.sqrt(distSq);
            m.vx += (dx / dist) * 0.1;
            m.vy += (dy / dist) * 0.1;
        }

        m.x += m.vx;
        m.y += m.vy;
        m.vx *= 0.99;
        m.vy *= 0.99;

        // Wrap
        if (m.x < 0) m.x = sys.width;
        if (m.x > sys.width) m.x = 0;
        if (m.y < 0) m.y = sys.height;
        if (m.y > sys.height) m.y = 0;

        const pulse = 0.7 + 0.3 * Math.sin(sys.tick * m.pulseSpeed + m.pulsePhase);
        const r = m.size * pulse;

        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 4);
        g.addColorStop(0, withAlpha(m.color, m.alpha * pulse));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(m.x, m.y, r * 4, 0, TAU); ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha * pulse})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, r * 0.5, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  EFFECT: Geometric Mesh (Delaunay-like)
// ═══════════════════════════════════════════════
function initMesh(sys) {
    sys.state.points = [];
    const count = 20 + Math.floor(sys.rng() * 20);
    for (let i = 0; i < count; i++) {
        sys.state.points.push({
            x: sys.rng() * sys.width,
            y: sys.rng() * sys.height,
            ox: 0, oy: 0,
            vx: (sys.rng() - 0.5) * 0.3,
            vy: (sys.rng() - 0.5) * 0.3,
            color: sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)]
        });
        sys.state.points[i].ox = sys.state.points[i].x;
        sys.state.points[i].oy = sys.state.points[i].y;
    }
    sys.state.triangleColor = sys.palette.primary[0];
    sys.state.edgeDist = 100 + sys.rng() * 100;
}

function drawMesh(sys) {
    const { ctx, state } = sys;

    // Update point positions
    for (const p of state.points) {
        p.x += p.vx;
        p.y += p.vy;
        // Bounce off edges
        if (p.x < 0 || p.x > sys.width) p.vx *= -1;
        if (p.y < 0 || p.y > sys.height) p.vy *= -1;
        p.x = Math.max(0, Math.min(sys.width, p.x));
        p.y = Math.max(0, Math.min(sys.height, p.y));

        // Mouse repel
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
            p.x += (dx / dist) * 2;
            p.y += (dy / dist) * 2;
        }
    }

    // Draw edges - use squared distance and early axis rejection
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 0.5;
    const edgeDist = state.edgeDist;
    const edgeDistSq = edgeDist * edgeDist;
    for (let i = 0; i < state.points.length; i++) {
        const p1 = state.points[i];
        for (let j = i + 1; j < state.points.length; j++) {
            const p2 = state.points[j];
            const dx = p1.x - p2.x;
            if (dx > edgeDist || dx < -edgeDist) continue;
            const dy = p1.y - p2.y;
            if (dy > edgeDist || dy < -edgeDist) continue;
            const distSq = dx * dx + dy * dy;
            if (distSq < edgeDistSq) {
                const dist = Math.sqrt(distSq);
                const alpha = (1 - dist / edgeDist) * 0.12;
                ctx.strokeStyle = withAlpha(state.triangleColor, alpha);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }

    // Draw nodes
    for (const p of state.points) {
        ctx.fillStyle = withAlpha(p.color, 0.3);
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  AMBIENT FX SYSTEM
// ═══════════════════════════════════════════════
const AMBIENT_EFFECTS = {
    bokeh:      { init: initBokeh, draw: drawBokeh },
    aurora:     { init: initAuroraShimmer, draw: drawAuroraShimmer },
    gridPulse:  { init: initGridPulse, draw: drawGridPulse },
    plasma:     { init: initPlasma, draw: drawPlasma },
    floating:   { init: initFloatingParticles, draw: drawFloatingParticles },
    mesh:       { init: initMesh, draw: drawMesh }
};

class AmbientFXSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.tick = 0;
        this.effect = null;
        this.effectName = '';
        this.rng = Math.random;
        this.state = {};
        this.palette = null;
        this.isActive = false;
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'ambient-fx-canvas';
        this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        this._resizeHandler = () => this.resize();
        window.addEventListener('resize', this._resizeHandler);
        this._rafId = 0;
        this.loop = this.animate.bind(this);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        // Reinitialize effect if active (positions may depend on dimensions)
        if (this.isActive && this.effect) {
            this.state = {};
            this.effect.init(this);
        }
    }

    configure(rng, palette) {
        this.rng = rng;
        this.palette = palette;
        const keys = Object.keys(AMBIENT_EFFECTS);
        this.effectName = keys[Math.floor(rng() * keys.length)];
        this.effect = AMBIENT_EFFECTS[this.effectName];
        this.state = {};
        this.tick = 0;
        this.effect.init(this);
        this.isActive = true;

        // Start the animation loop only when configured (avoid idle loop)
        if (!this._rafId) {
            this._rafId = requestAnimationFrame(this.loop);
        }
    }

    animate() {
        if (!this.isActive || !this.effect) {
            // Stop the loop when inactive to save CPU
            this._rafId = 0;
            return;
        }
        this.tick++;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.effect.draw(this);
        this._rafId = requestAnimationFrame(this.loop);
    }
}

export const ambientFX = new AmbientFXSystem();
