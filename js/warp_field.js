/**
 * @file warp_field.js
 * @description Cursor-proximity spatial distortion effects with 4 seed-randomized modes.
 * Creates visual warping/distortion near the cursor using canvas compositing.
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { withAlpha } from './color_palettes.js';

const TAU = Math.PI * 2;

// ═══════════════════════════════════════════════
//  WARP: Gravitational Lens
// ═══════════════════════════════════════════════
function initLens(sys) {
    sys.state.lensRadius = 50 + sys.rng() * 40;
    sys.state.distortion = 0.3 + sys.rng() * 0.4;
    sys.state.ringCount = 2 + Math.floor(sys.rng() * 3);
}

function drawLens(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const r = state.lensRadius;
    const clicking = isLeftMouseDown || isRightMouseDown;
    const expand = clicking ? 1.5 : 1.0;
    const pulse = 1 + 0.05 * Math.sin(sys.tick * 0.04);

    const effectR = r * expand * pulse;

    // Gravitational lens visual: concentric distortion rings
    ctx.globalCompositeOperation = 'lighter';
    for (let ring = 0; ring < state.ringCount; ring++) {
        const ringR = effectR * (0.5 + ring * 0.3);
        const alpha = 0.06 - ring * 0.015;
        const g = ctx.createRadialGradient(mx, my, ringR * 0.8, mx, my, ringR);
        g.addColorStop(0, 'transparent');
        g.addColorStop(0.5, withAlpha(palette.glow[0], alpha));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mx, my, ringR, 0, TAU); ctx.fill();
    }

    // Einstein ring
    ctx.strokeStyle = withAlpha(palette.primary[0], 0.15 * pulse);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, my, effectR * 0.7, 0, TAU); ctx.stroke();

    // Lensing refraction lines (radial streaks)
    ctx.lineWidth = 0.5;
    for (let a = 0; a < TAU; a += TAU / 16) {
        const inner = effectR * 0.4;
        const outer = effectR;
        ctx.strokeStyle = withAlpha(palette.glow[0], 0.06);
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(a + sys.tick * 0.003) * inner, my + Math.sin(a + sys.tick * 0.003) * inner);
        ctx.lineTo(mx + Math.cos(a) * outer, my + Math.sin(a) * outer);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  WARP: Chromatic Aberration
// ═══════════════════════════════════════════════
function initChromatic(sys) {
    sys.state.spread = 3 + sys.rng() * 6;
    sys.state.radius = 60 + sys.rng() * 80;
    sys.state.rotSpeed = 0.01 + sys.rng() * 0.02;
}

function drawChromatic(sys) {
    const { ctx, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const r = state.radius;
    const spread = state.spread * (1 + (isLeftMouseDown ? 2 : 0));
    const angle = sys.tick * state.rotSpeed;

    // Red channel offset
    const rx = mx + Math.cos(angle) * spread;
    const ry = my + Math.sin(angle) * spread;
    // Blue channel offset
    const bx = mx + Math.cos(angle + TAU / 3) * spread;
    const by = my + Math.sin(angle + TAU / 3) * spread;
    // Green channel offset
    const gx = mx + Math.cos(angle + TAU * 2 / 3) * spread;
    const gy = my + Math.sin(angle + TAU * 2 / 3) * spread;

    ctx.globalCompositeOperation = 'lighter';

    // Draw RGB split circles
    const channels = [
        { x: rx, y: ry, color: 'rgba(255, 0, 0, 0.05)' },
        { x: gx, y: gy, color: 'rgba(0, 255, 0, 0.05)' },
        { x: bx, y: by, color: 'rgba(0, 0, 255, 0.05)' }
    ];

    for (const ch of channels) {
        const g = ctx.createRadialGradient(ch.x, ch.y, 0, ch.x, ch.y, r);
        g.addColorStop(0, ch.color);
        g.addColorStop(0.7, ch.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ch.x, ch.y, r, 0, TAU); ctx.fill();
    }

    // Distortion ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(mx, my, r * 0.8, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  WARP: Ripple Distortion
// ═══════════════════════════════════════════════
function initRippleDistort(sys) {
    sys.state.ripples = [];
    sys.state.maxRipples = 8 + Math.floor(sys.rng() * 6);
    sys.state.autoEmit = 10 + Math.floor(sys.rng() * 15);
    sys.state.waveCount = 2 + Math.floor(sys.rng() * 3);
}

function drawRippleDistort(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;

    // Auto-emit ripples from cursor
    if (sys.tick % state.autoEmit === 0 && state.ripples.length < state.maxRipples) {
        state.ripples.push({
            x: mx, y: my,
            radius: 0,
            maxRadius: 80 + sys.rng() * 120,
            speed: 1.5 + sys.rng() * 2
        });
    }

    // Click burst
    if (isLeftMouseDown && sys.tick % 5 === 0 && state.ripples.length < state.maxRipples) {
        state.ripples.push({
            x: mx, y: my,
            radius: 0,
            maxRadius: 120 + sys.rng() * 80,
            speed: 3 + sys.rng() * 2
        });
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i];
        r.radius += r.speed;
        const progress = r.radius / r.maxRadius;
        if (progress >= 1) {
            state.ripples[i] = state.ripples[state.ripples.length - 1];
            state.ripples.pop();
            continue;
        }

        const alpha = (1 - progress) * 0.2;

        // Multiple wave rings
        for (let w = 0; w < state.waveCount; w++) {
            const waveR = r.radius - w * 8;
            if (waveR <= 0) continue;
            const wAlpha = alpha * (1 - w / state.waveCount);

            ctx.strokeStyle = withAlpha(palette.primary[w % palette.primary.length], wAlpha);
            ctx.lineWidth = 2 * (1 - progress);
            ctx.beginPath();
            ctx.arc(r.x, r.y, waveR, 0, TAU);
            ctx.stroke();
        }
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  WARP: Vortex Spiral
// ═══════════════════════════════════════════════
function initVortex(sys) {
    sys.state.armCount = 2 + Math.floor(sys.rng() * 3);
    sys.state.maxRadius = 60 + sys.rng() * 60;
    sys.state.rotSpeed = 0.02 + sys.rng() * 0.03;
    sys.state.twist = 2 + sys.rng() * 3;
    sys.state.particles = [];
    sys.state.maxParticles = 30 + Math.floor(sys.rng() * 20);
    sys.state.pool = [];
}

function drawVortex(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const rot = sys.tick * state.rotSpeed;
    const clicking = isLeftMouseDown || isRightMouseDown;
    const intensity = clicking ? 2 : 1;

    ctx.save(); ctx.translate(mx, my);
    ctx.globalCompositeOperation = 'lighter';

    // Spiral arms
    for (let arm = 0; arm < state.armCount; arm++) {
        const armOffset = (TAU / state.armCount) * arm;
        ctx.strokeStyle = withAlpha(palette.primary[arm % palette.primary.length], 0.12 * intensity);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let t = 0; t < 1; t += 0.01) {
            const angle = armOffset + rot + t * state.twist;
            const r = t * state.maxRadius * intensity;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Swirling particles
    if (sys.tick % 3 === 0 && state.particles.length < state.maxParticles) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.angle = sys.rng() * TAU;
        p.dist = state.maxRadius * intensity * (0.5 + sys.rng() * 0.5);
        p.life = 1.0;
        p.decay = 0.015 + sys.rng() * 0.02;
        p.size = 1 + sys.rng() * 2;
        state.particles.push(p);
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.angle += state.rotSpeed * 2;
        p.dist -= 0.5 * intensity;
        p.life -= p.decay;

        if (p.life <= 0 || p.dist <= 0) {
            state.pool.push(p);
            state.particles[i] = state.particles[state.particles.length - 1];
            state.particles.pop();
            continue;
        }

        const x = Math.cos(p.angle) * p.dist;
        const y = Math.sin(p.angle) * p.dist;
        ctx.fillStyle = withAlpha(palette.glow[0], p.life * 0.5);
        ctx.beginPath(); ctx.arc(x, y, p.size, 0, TAU); ctx.fill();
    }

    // Center void
    const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * intensity);
    vg.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    vg.addColorStop(0.5, withAlpha(palette.primary[0], 0.1));
    vg.addColorStop(1, 'transparent');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.arc(0, 0, 15 * intensity, 0, TAU); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  WARP FIELD SYSTEM
// ═══════════════════════════════════════════════
const WARP_MODES = {
    lens:      { init: initLens, draw: drawLens },
    chromatic: { init: initChromatic, draw: drawChromatic },
    ripple:    { init: initRippleDistort, draw: drawRippleDistort },
    vortex:    { init: initVortex, draw: drawVortex }
};

class WarpFieldSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.tick = 0;
        this.mode = null;
        this.modeName = '';
        this.rng = Math.random;
        this.state = {};
        this.palette = null;
        this.isActive = false;
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'warp-field-canvas';
        this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:97;';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    configure(rng, palette) {
        this.rng = rng;
        this.palette = palette;
        const keys = Object.keys(WARP_MODES);
        this.modeName = keys[Math.floor(rng() * keys.length)];
        this.mode = WARP_MODES[this.modeName];
        this.state = {};
        this.tick = 0;
        this.mode.init(this);
        this.isActive = true;
    }

    animate() {
        this.tick++;
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.isActive && this.mode) {
            this.mode.draw(this);
        }
        requestAnimationFrame(this.loop);
    }
}

export const warpField = new WarpFieldSystem();
