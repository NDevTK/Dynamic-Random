/**
 * @file cursor_trails.js
 * @description Persistent cursor trail system with 8 seed-randomized visual modes.
 * Trails are drawn on a separate canvas that fades slowly, creating persistent paths.
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { withAlpha } from './color_palettes.js';

const TAU = Math.PI * 2;

// ═══════════════════════════════════════════════
//  TRAIL: Rainbow Ribbon
// ═══════════════════════════════════════════════
function initRibbon(sys) {
    sys.state.points = [];
    sys.state.maxPoints = 50 + Math.floor(sys.rng() * 30);
    sys.state.widthBase = 3 + sys.rng() * 8;
    sys.state.hueSpeed = 1 + sys.rng() * 3;
}

function drawRibbon(sys) {
    const { ctx, state } = sys;
    if (sys.mouseSpeed > 0.5) {
        state.points.push({ x: mouse.x, y: mouse.y, hue: (sys.tick * state.hueSpeed) % 360 });
        if (state.points.length > state.maxPoints) state.points.shift();
    }
    if (state.points.length < 3) return;

    for (let w = state.widthBase; w > 0; w -= 1.5) {
        ctx.lineWidth = w;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(state.points[0].x, state.points[0].y);
        for (let i = 1; i < state.points.length - 1; i++) {
            const xc = (state.points[i].x + state.points[i + 1].x) / 2;
            const yc = (state.points[i].y + state.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(state.points[i].x, state.points[i].y, xc, yc);
        }
        const alpha = w === state.widthBase ? 0.15 : (w < 2 ? 0.8 : 0.4);
        const last = state.points[state.points.length - 1];
        const grad = ctx.createLinearGradient(state.points[0].x, state.points[0].y, last.x, last.y);
        for (let i = 0; i < state.points.length; i += Math.max(1, Math.floor(state.points.length / 6))) {
            const t = i / state.points.length;
            grad.addColorStop(t, `hsla(${state.points[i].hue}, 90%, ${60 + (w / state.widthBase) * 20}%, ${alpha * (0.3 + t * 0.7)})`);
        }
        ctx.strokeStyle = grad;
        ctx.stroke();
    }
}

// ═══════════════════════════════════════════════
//  TRAIL: Fire
// ═══════════════════════════════════════════════
function initFire(sys) {
    sys.state.embers = [];
    sys.state.pool = [];
    sys.state.maxEmbers = 120 + Math.floor(sys.rng() * 80);
    sys.state.hueBase = sys.rng() > 0.7 ? 260 : (sys.rng() > 0.5 ? 120 : 15);
}

function drawFire(sys) {
    const { ctx, state } = sys;
    const emitCount = Math.min(Math.ceil(sys.mouseSpeed * 0.5), 8);
    for (let i = 0; i < emitCount && state.embers.length < state.maxEmbers; i++) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.x = mouse.x + (sys.rng() - 0.5) * 6;
        p.y = mouse.y + (sys.rng() - 0.5) * 6;
        p.vx = (sys.rng() - 0.5) * 2 + (mouse.x - sys.prevMouse.x) * 0.3;
        p.vy = -1 - sys.rng() * 3;
        p.life = 1.0;
        p.decay = 0.015 + sys.rng() * 0.025;
        p.size = 3 + sys.rng() * 5;
        p.hue = state.hueBase + sys.rng() * 40;
        state.embers.push(p);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.embers.length - 1; i >= 0; i--) {
        const p = state.embers[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy -= 0.05; // buoyancy
        p.vx += (sys.rng() - 0.5) * 0.5;
        p.life -= p.decay;
        p.size *= 0.995;

        if (p.life <= 0) {
            state.pool.push(p);
            state.embers[i] = state.embers[state.embers.length - 1];
            state.embers.pop();
            continue;
        }
        const lightness = 50 + (1 - p.life) * 30;
        ctx.fillStyle = `hsla(${p.hue - p.life * 20}, 100%, ${lightness}%, ${p.life * 0.7})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  TRAIL: Ice Crystals
// ═══════════════════════════════════════════════
function initIce(sys) {
    sys.state.crystals = [];
    sys.state.pool = [];
    sys.state.maxCrystals = 40 + Math.floor(sys.rng() * 30);
    sys.state.branchChance = 0.3 + sys.rng() * 0.3;
}

function drawIce(sys) {
    const { ctx, palette, state } = sys;
    if (sys.mouseSpeed > 2 && sys.tick % 3 === 0 && state.crystals.length < state.maxCrystals) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.x = mouse.x;
        p.y = mouse.y;
        p.angle = sys.rng() * TAU;
        p.length = 5 + sys.rng() * 15;
        p.branches = Math.floor(sys.rng() * 3);
        p.life = 1.0;
        p.decay = 0.005 + sys.rng() * 0.008;
        state.crystals.push(p);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.crystals.length - 1; i >= 0; i--) {
        const c = state.crystals[i];
        c.life -= c.decay;
        if (c.life <= 0) {
            state.pool.push(c);
            state.crystals[i] = state.crystals[state.crystals.length - 1];
            state.crystals.pop();
            continue;
        }

        ctx.strokeStyle = `hsla(200, 70%, 80%, ${c.life * 0.6})`;
        ctx.lineWidth = 1;
        // Main branch
        const ex = c.x + Math.cos(c.angle) * c.length;
        const ey = c.y + Math.sin(c.angle) * c.length;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex, ey); ctx.stroke();

        // Sub-branches (6-fold symmetry)
        for (let b = 0; b < c.branches; b++) {
            const t = 0.3 + (b / c.branches) * 0.5;
            const bx = c.x + Math.cos(c.angle) * c.length * t;
            const by = c.y + Math.sin(c.angle) * c.length * t;
            const bLen = c.length * 0.4;
            for (const dir of [-1, 1]) {
                const ba = c.angle + dir * Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(ba) * bLen, by + Math.sin(ba) * bLen);
                ctx.stroke();
            }
        }

        // Sparkle at tip
        ctx.fillStyle = `hsla(195, 80%, 90%, ${c.life * 0.8})`;
        ctx.beginPath(); ctx.arc(ex, ey, 1.5 * c.life, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  TRAIL: Ink Drip
// ═══════════════════════════════════════════════
function initInk(sys) {
    sys.state.drops = [];
    sys.state.pool = [];
    sys.state.maxDrops = 60 + Math.floor(sys.rng() * 40);
    sys.state.inkColor = sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)];
    sys.state.gravity = 0.03 + sys.rng() * 0.05;
}

function drawInk(sys) {
    const { ctx, state } = sys;
    const speed = sys.mouseSpeed;
    const emitCount = Math.min(Math.ceil(speed * 0.2), 4);

    for (let i = 0; i < emitCount && state.drops.length < state.maxDrops; i++) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.x = mouse.x + (sys.rng() - 0.5) * 10;
        p.y = mouse.y + (sys.rng() - 0.5) * 10;
        p.vx = (sys.rng() - 0.5) * 2;
        p.vy = sys.rng() * 2;
        p.size = 2 + sys.rng() * 6 + speed * 0.1;
        p.life = 1.0;
        p.decay = 0.003 + sys.rng() * 0.005;
        p.splattered = false;
        state.drops.push(p);
    }

    for (let i = state.drops.length - 1; i >= 0; i--) {
        const p = state.drops[i];
        if (!p.splattered) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += state.gravity;
            p.vx *= 0.99;
            if (sys.rng() < 0.02) p.splattered = true;
        }
        p.life -= p.decay;

        if (p.life <= 0) {
            state.pool.push(p);
            state.drops[i] = state.drops[state.drops.length - 1];
            state.drops.pop();
            continue;
        }

        ctx.fillStyle = withAlpha(state.inkColor, p.life * 0.5);
        ctx.beginPath();
        if (p.splattered) {
            // Splat shape: slightly irregular circle
            for (let a = 0; a < TAU; a += 0.3) {
                const r = p.size * (0.7 + 0.3 * Math.sin(a * 3 + p.x));
                const sx = p.x + Math.cos(a) * r;
                const sy = p.y + Math.sin(a) * r;
                a === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
            }
            ctx.closePath();
        } else {
            ctx.arc(p.x, p.y, p.size * 0.6, 0, TAU);
        }
        ctx.fill();
    }
}

// ═══════════════════════════════════════════════
//  TRAIL: Star Dust
// ═══════════════════════════════════════════════
function initStardust(sys) {
    sys.state.stars = [];
    sys.state.pool = [];
    sys.state.maxStars = 100 + Math.floor(sys.rng() * 60);
}

function drawStardust(sys) {
    const { ctx, palette, state } = sys;
    const emitCount = Math.min(Math.ceil(sys.mouseSpeed * 0.4), 5);

    for (let i = 0; i < emitCount && state.stars.length < state.maxStars; i++) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.x = mouse.x + (sys.rng() - 0.5) * 12;
        p.y = mouse.y + (sys.rng() - 0.5) * 12;
        p.vx = (sys.rng() - 0.5) * 1.5;
        p.vy = (sys.rng() - 0.5) * 1.5 + 0.3;
        p.life = 1.0;
        p.decay = 0.006 + sys.rng() * 0.01;
        p.size = 1 + sys.rng() * 3;
        p.twinkleSpeed = 0.05 + sys.rng() * 0.15;
        p.twinklePhase = sys.rng() * TAU;
        p.color = palette.primary[Math.floor(sys.rng() * palette.primary.length)];
        p.hasSpikes = sys.rng() > 0.5;
        state.stars.push(p);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.stars.length - 1; i >= 0; i--) {
        const p = state.stars[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.life -= p.decay;

        if (p.life <= 0) {
            state.pool.push(p);
            state.stars[i] = state.stars[state.stars.length - 1];
            state.stars.pop();
            continue;
        }

        const twinkle = 0.3 + 0.7 * Math.pow(Math.sin(sys.tick * p.twinkleSpeed + p.twinklePhase) * 0.5 + 0.5, 2);
        const alpha = p.life * twinkle;

        // Glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        g.addColorStop(0, withAlpha(p.color, alpha * 0.5));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, TAU); ctx.fill();

        if (p.hasSpikes) {
            // 4-point star spikes
            ctx.strokeStyle = withAlpha(p.color, alpha * 0.4);
            ctx.lineWidth = 0.5;
            const sLen = p.size * 3 * twinkle;
            ctx.beginPath();
            ctx.moveTo(p.x - sLen, p.y); ctx.lineTo(p.x + sLen, p.y);
            ctx.moveTo(p.x, p.y - sLen); ctx.lineTo(p.x, p.y + sLen);
            ctx.stroke();
        }

        // Core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5 * twinkle, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  TRAIL: Neon Tube
// ═══════════════════════════════════════════════
function initNeon(sys) {
    sys.state.points = [];
    sys.state.maxPoints = 40 + Math.floor(sys.rng() * 20);
    sys.state.tubeWidth = 4 + sys.rng() * 6;
    sys.state.flickerRate = 0.02 + sys.rng() * 0.04;
    sys.state.neonColor = sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)];
}

function drawNeon(sys) {
    const { ctx, state } = sys;
    if (sys.mouseSpeed > 0.5) {
        state.points.push({ x: mouse.x, y: mouse.y });
        if (state.points.length > state.maxPoints) state.points.shift();
    }
    if (state.points.length < 3) return;

    const flicker = 0.7 + 0.3 * Math.sin(sys.tick * state.flickerRate * 10);

    // Build smooth path
    function drawPath() {
        ctx.beginPath();
        ctx.moveTo(state.points[0].x, state.points[0].y);
        for (let i = 1; i < state.points.length - 1; i++) {
            const xc = (state.points[i].x + state.points[i + 1].x) / 2;
            const yc = (state.points[i].y + state.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(state.points[i].x, state.points[i].y, xc, yc);
        }
    }

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';

    // Outer glow (wide, soft)
    drawPath();
    ctx.strokeStyle = withAlpha(state.neonColor, 0.1 * flicker);
    ctx.lineWidth = state.tubeWidth * 6;
    ctx.stroke();

    // Middle glow
    drawPath();
    ctx.strokeStyle = withAlpha(state.neonColor, 0.25 * flicker);
    ctx.lineWidth = state.tubeWidth * 2.5;
    ctx.stroke();

    // Core
    drawPath();
    ctx.strokeStyle = withAlpha(state.neonColor, 0.7 * flicker);
    ctx.lineWidth = state.tubeWidth;
    ctx.stroke();

    // Hot center
    drawPath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * flicker})`;
    ctx.lineWidth = state.tubeWidth * 0.3;
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  TRAIL: Glitch
// ═══════════════════════════════════════════════
function initGlitch(sys) {
    sys.state.fragments = [];
    sys.state.pool = [];
    sys.state.maxFragments = 50 + Math.floor(sys.rng() * 30);
    sys.state.glitchColors = ['#ff0040', '#00ff88', '#4488ff', '#ff00ff', '#ffff00'];
}

function drawGlitch(sys) {
    const { ctx, state } = sys;
    if (sys.mouseSpeed > 1 && sys.tick % 2 === 0) {
        const count = Math.min(Math.ceil(sys.mouseSpeed * 0.3), 4);
        for (let i = 0; i < count && state.fragments.length < state.maxFragments; i++) {
            const p = state.pool.length > 0 ? state.pool.pop() : {};
            p.x = mouse.x + (sys.rng() - 0.5) * 40;
            p.y = mouse.y + (sys.rng() - 0.5) * 40;
            p.w = 3 + sys.rng() * 25;
            p.h = 1 + sys.rng() * 8;
            p.life = 1.0;
            p.decay = 0.02 + sys.rng() * 0.04;
            p.color = state.glitchColors[Math.floor(sys.rng() * state.glitchColors.length)];
            p.offsetX = (sys.rng() - 0.5) * 20;
            p.jitter = sys.rng() > 0.5;
            state.fragments.push(p);
        }
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.fragments.length - 1; i >= 0; i--) {
        const p = state.fragments[i];
        p.life -= p.decay;
        if (p.jitter && sys.tick % 3 === 0) p.x += (sys.rng() - 0.5) * 6;

        if (p.life <= 0) {
            state.pool.push(p);
            state.fragments[i] = state.fragments[state.fragments.length - 1];
            state.fragments.pop();
            continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.6;
        ctx.fillRect(p.x + p.offsetX, p.y, p.w, p.h);

        // Scanline artifacts
        if (sys.rng() > 0.7) {
            ctx.fillRect(p.x - 50, p.y, 100, 1);
        }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  TRAIL: Vapor / Smoke
// ═══════════════════════════════════════════════
function initVapor(sys) {
    sys.state.puffs = [];
    sys.state.pool = [];
    sys.state.maxPuffs = 50 + Math.floor(sys.rng() * 30);
    sys.state.vaporColor = sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)];
}

function drawVapor(sys) {
    const { ctx, state } = sys;
    if (sys.mouseSpeed > 0.5 && sys.tick % 2 === 0) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.x = mouse.x + (sys.rng() - 0.5) * 10;
        p.y = mouse.y + (sys.rng() - 0.5) * 10;
        p.vx = (sys.rng() - 0.5) * 0.8;
        p.vy = -0.3 - sys.rng() * 0.8;
        p.life = 1.0;
        p.decay = 0.004 + sys.rng() * 0.006;
        p.size = 10 + sys.rng() * 20;
        p.growRate = 0.3 + sys.rng() * 0.5;
        state.puffs.push(p);
    }

    for (let i = state.puffs.length - 1; i >= 0; i--) {
        const p = state.puffs[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (sys.rng() - 0.5) * 0.1;
        p.vy -= 0.01;
        p.vx *= 0.99;
        p.life -= p.decay;
        p.size += p.growRate;

        if (p.life <= 0) {
            state.pool.push(p);
            state.puffs[i] = state.puffs[state.puffs.length - 1];
            state.puffs.pop();
            continue;
        }

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, withAlpha(state.vaporColor, p.life * 0.08));
        g.addColorStop(0.5, withAlpha(state.vaporColor, p.life * 0.03));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
}

// ═══════════════════════════════════════════════
//  TRAIL: Magnetic Ink
// ═══════════════════════════════════════════════
function initMagneticInk(sys) {
    sys.state.blobs = [];
    sys.state.pool = [];
    sys.state.maxBlobs = 80 + Math.floor(sys.rng() * 40);
    sys.state.magnetStrength = 0.02 + sys.rng() * 0.04;
    sys.state.inkColor = sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)];
    sys.state.secondColor = sys.palette.primary[(Math.floor(sys.rng() * sys.palette.primary.length) + 1) % sys.palette.primary.length];
    sys.state.fieldAngle = sys.rng() * Math.PI * 2;
    sys.state.fieldDrift = 0.005 + sys.rng() * 0.01;
}

function drawMagneticInk(sys) {
    const { ctx, state } = sys;
    state.fieldAngle += state.fieldDrift;
    const fieldX = Math.cos(state.fieldAngle);
    const fieldY = Math.sin(state.fieldAngle);

    if (sys.mouseSpeed > 1 && sys.tick % 2 === 0) {
        const count = Math.min(3, Math.ceil(sys.mouseSpeed * 0.2));
        for (let i = 0; i < count && state.blobs.length < state.maxBlobs; i++) {
            const p = state.pool.length > 0 ? state.pool.pop() : {};
            p.x = mouse.x + (sys.rng() - 0.5) * 8;
            p.y = mouse.y + (sys.rng() - 0.5) * 8;
            p.vx = (sys.rng() - 0.5) * 1.5;
            p.vy = (sys.rng() - 0.5) * 1.5;
            p.size = 3 + sys.rng() * 8;
            p.life = 1.0;
            p.decay = 0.003 + sys.rng() * 0.005;
            p.polarity = sys.rng() > 0.5 ? 1 : -1;
            p.color = p.polarity > 0 ? state.inkColor : state.secondColor;
            state.blobs.push(p);
        }
    }

    for (let i = state.blobs.length - 1; i >= 0; i--) {
        const p = state.blobs[i];
        p.vx += fieldX * state.magnetStrength * p.polarity;
        p.vy += fieldY * state.magnetStrength * p.polarity;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.size *= 0.999;

        if (p.life <= 0) {
            state.pool.push(p);
            state.blobs[i] = state.blobs[state.blobs.length - 1];
            state.blobs.pop();
            continue;
        }

        ctx.globalCompositeOperation = 'lighter';
        const spikes = 5 + Math.floor(p.size);
        ctx.fillStyle = withAlpha(p.color, p.life * 0.4);
        ctx.beginPath();
        for (let s = 0; s < spikes; s++) {
            const a = (TAU / spikes) * s + p.polarity * sys.tick * 0.02;
            const spikeLen = p.size * (0.8 + 0.4 * Math.sin(a * 3 + sys.tick * 0.05));
            const midA = a + TAU / spikes / 2;
            const midR = p.size * 0.4;
            if (s === 0) {
                ctx.moveTo(p.x + Math.cos(a) * spikeLen, p.y + Math.sin(a) * spikeLen);
            } else {
                ctx.lineTo(p.x + Math.cos(a) * spikeLen, p.y + Math.sin(a) * spikeLen);
            }
            ctx.lineTo(p.x + Math.cos(midA) * midR, p.y + Math.sin(midA) * midR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ═══════════════════════════════════════════════
//  TRAIL: Pixel Dissolve
// ═══════════════════════════════════════════════
function initPixelDissolve(sys) {
    sys.state.pixels = [];
    sys.state.pool = [];
    sys.state.maxPixels = 200 + Math.floor(sys.rng() * 100);
    sys.state.pixelSize = 3 + Math.floor(sys.rng() * 5);
    sys.state.dissolveStyle = Math.floor(sys.rng() * 3);
    sys.state.hueShift = sys.rng() * 360;
}

function drawPixelDissolve(sys) {
    const { ctx, state } = sys;
    const emitCount = Math.min(Math.ceil(sys.mouseSpeed * 0.5), 6);

    for (let i = 0; i < emitCount && state.pixels.length < state.maxPixels; i++) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        const s = state.pixelSize;
        p.x = Math.floor(mouse.x / s) * s;
        p.y = Math.floor(mouse.y / s) * s;
        p.vx = (sys.rng() - 0.5) * 3;
        p.vy = (sys.rng() - 0.5) * 3;
        p.life = 1.0;
        p.decay = 0.008 + sys.rng() * 0.012;
        p.size = s;
        p.hue = (state.hueShift + sys.tick * 1.5 + sys.rng() * 40) % 360;
        p.glitch = sys.rng() > 0.7;
        state.pixels.push(p);
    }

    for (let i = state.pixels.length - 1; i >= 0; i--) {
        const p = state.pixels[i];
        p.life -= p.decay;

        switch (state.dissolveStyle) {
            case 0: p.vy += 0.08; p.x += p.vx; p.y += p.vy; break;
            case 1: p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; break;
            case 2: p.vy -= 0.02; p.x += p.vx + Math.sin(sys.tick * 0.05 + i) * 0.3; p.y += p.vy; break;
        }

        if (p.life <= 0) {
            state.pool.push(p);
            state.pixels[i] = state.pixels[state.pixels.length - 1];
            state.pixels.pop();
            continue;
        }

        const visSize = p.size * Math.min(1, p.life * 2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `hsla(${p.hue}, 80%, 55%, ${p.life * 0.7})`;
        ctx.fillRect(p.x, p.y, visSize, visSize);

        if (p.glitch && sys.tick % 4 === 0) {
            ctx.globalAlpha = p.life * 0.3;
            ctx.fillStyle = `hsla(${(p.hue + 120) % 360}, 100%, 60%, ${p.life * 0.3})`;
            ctx.fillRect(p.x + (sys.rng() - 0.5) * 10, p.y, visSize, visSize);
            ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ═══════════════════════════════════════════════
//  TRAIL: Calligraphy
// ═══════════════════════════════════════════════
function initCalligraphy(sys) {
    sys.state.points = [];
    sys.state.maxPoints = 60 + Math.floor(sys.rng() * 40);
    sys.state.nib = Math.floor(sys.rng() * 3);
    sys.state.nibAngle = sys.rng() * Math.PI;
    sys.state.maxWidth = 6 + sys.rng() * 10;
    sys.state.inkColor = sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)];
    sys.state.flourish = sys.rng() > 0.5;
    sys.state.mouseAngle = 0;
}

function drawCalligraphy(sys) {
    const { ctx, state } = sys;
    const dx = mouse.x - sys.prevMouse.x;
    const dy = mouse.y - sys.prevMouse.y;
    state.mouseAngle = Math.atan2(dy, dx);

    if (sys.mouseSpeed > 0.3) {
        state.points.push({
            x: mouse.x, y: mouse.y,
            speed: sys.mouseSpeed,
            angle: state.mouseAngle
        });
        if (state.points.length > state.maxPoints) state.points.shift();
    }
    if (state.points.length < 3) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < state.points.length; i++) {
        const prev = state.points[i - 1];
        const curr = state.points[i];
        const t = i / state.points.length;

        let width;
        switch (state.nib) {
            case 0: width = Math.abs(Math.sin(curr.angle - state.nibAngle)) * state.maxWidth + 1; break;
            case 1: width = state.maxWidth * (1 - Math.min(1, curr.speed / 15)); break;
            case 2: width = state.maxWidth * Math.sin(t * Math.PI) * (1 - Math.min(0.8, curr.speed / 20)); break;
            default: width = state.maxWidth;
        }

        const alpha = 0.3 + t * 0.5;
        ctx.strokeStyle = withAlpha(state.inkColor, alpha);
        ctx.lineWidth = Math.max(0.5, width);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();

        if (state.flourish && width > 3) {
            const offset = width * 0.6;
            const nx = Math.cos(curr.angle + Math.PI / 2) * offset;
            const ny = Math.sin(curr.angle + Math.PI / 2) * offset;
            ctx.strokeStyle = withAlpha(state.inkColor, alpha * 0.2);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(prev.x + nx, prev.y + ny);
            ctx.lineTo(curr.x + nx, curr.y + ny);
            ctx.stroke();
        }
    }
}

// ═══════════════════════════════════════════════
//  TRAIL SYSTEM
// ═══════════════════════════════════════════════
const TRAIL_MODES = {
    ribbon:       { init: initRibbon, draw: drawRibbon },
    fire:         { init: initFire, draw: drawFire },
    ice:          { init: initIce, draw: drawIce },
    ink:          { init: initInk, draw: drawInk },
    stardust:     { init: initStardust, draw: drawStardust },
    neon:         { init: initNeon, draw: drawNeon },
    glitch:       { init: initGlitch, draw: drawGlitch },
    vapor:        { init: initVapor, draw: drawVapor },
    magneticInk:  { init: initMagneticInk, draw: drawMagneticInk },
    pixelDissolve:{ init: initPixelDissolve, draw: drawPixelDissolve },
    calligraphy:  { init: initCalligraphy, draw: drawCalligraphy }
};

class CursorTrailSystem {
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
        this.mouseSpeed = 0;
        this.prevMouse = { x: 0, y: 0 };
        this.palette = null;
        this.isActive = false;
        this.fadeRate = 0.02;
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'cursor-trail-canvas';
        this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:98;';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    resize() {
        // Preserve existing content during resize
        const oldCanvas = this.canvas.width > 0 ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (oldCanvas) {
            this.ctx.putImageData(oldCanvas, 0, 0);
        }
    }

    configure(rng, palette) {
        this.rng = rng;
        this.palette = palette;
        const keys = Object.keys(TRAIL_MODES);
        this.modeName = keys[Math.floor(rng() * keys.length)];
        this.mode = TRAIL_MODES[this.modeName];
        this.state = {};
        this.tick = 0;
        this.fadeRate = 0.01 + rng() * 0.03;
        this.mode.init(this);
        this.isActive = true;

        // Clear canvas on new configuration
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    animate() {
        this.tick++;
        const dx = mouse.x - this.prevMouse.x;
        const dy = mouse.y - this.prevMouse.y;
        this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this.prevMouse = { x: mouse.x, y: mouse.y };

        // Fade existing trails
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeRate})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.isActive && this.mode) {
            this.mode.draw(this);
        }
        requestAnimationFrame(this.loop);
    }
}

export const cursorTrails = new CursorTrailSystem();
