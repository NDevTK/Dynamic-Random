/**
 * @file cursor_effects.js
 * @description Advanced canvas-based cursor effects with 12 seed-randomized visual styles.
 * Each style creates a dramatically different visual experience at the cursor position.
 */

import { mouse, isLeftMouseDown, isRightMouseDown } from './state.js';
import { withAlpha } from './color_palettes.js';

const TAU = Math.PI * 2;

// ═══════════════════════════════════════════════
//  STYLE: Orbital System
// ═══════════════════════════════════════════════
function initOrbital(sys) {
    const ringCount = 3 + Math.floor(sys.rng() * 3);
    sys.state.rings = [];
    for (let i = 0; i < ringCount; i++) {
        const count = 3 + Math.floor(sys.rng() * 6);
        const particles = [];
        for (let j = 0; j < count; j++) {
            particles.push({ angle: (TAU / count) * j, size: 1.5 + sys.rng() * 2.5, phase: sys.rng() * TAU });
        }
        sys.state.rings.push({
            radius: 20 + i * 20 + sys.rng() * 12,
            speed: (0.015 + sys.rng() * 0.035) * (i % 2 === 0 ? 1 : -1),
            particles, color: sys.palette.primary[i % sys.palette.primary.length],
            eccentricity: 0.1 + sys.rng() * 0.4
        });
    }
}

function drawOrbital(sys) {
    const { ctx, palette } = sys;
    const mx = mouse.x, my = mouse.y;
    const boost = 1 + Math.min(sys.mouseSpeed * 0.015, 3);

    for (const ring of sys.state.rings) {
        const r = ring.radius + Math.sin(sys.tick * 0.025) * 4;
        ctx.strokeStyle = withAlpha(ring.color, 0.08);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(mx, my, r, r * (1 - ring.eccentricity), sys.tick * 0.003, 0, TAU);
        ctx.stroke();

        for (const p of ring.particles) {
            p.angle += ring.speed * boost;
            const tilt = sys.tick * 0.003;
            const x = mx + Math.cos(p.angle) * r;
            const y = my + Math.sin(p.angle) * r * (1 - ring.eccentricity);
            const rx = (x - mx) * Math.cos(tilt) - (y - my) * Math.sin(tilt) + mx;
            const ry = (x - mx) * Math.sin(tilt) + (y - my) * Math.cos(tilt) + my;
            const pulse = 1 + 0.35 * Math.sin(sys.tick * 0.06 + p.phase);
            const sz = p.size * pulse;

            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, sz * 4);
            g.addColorStop(0, ring.color);
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(rx, ry, sz * 4, 0, TAU); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(rx, ry, sz * 0.4, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
    }
    // Center core
    const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 8);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.6));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(mx, my, 8, 0, TAU); ctx.fill();
}

// ═══════════════════════════════════════════════
//  STYLE: Magnetic Tendrils
// ═══════════════════════════════════════════════
function initTendrils(sys) {
    const count = 5 + Math.floor(sys.rng() * 5);
    sys.state.tendrils = [];
    for (let i = 0; i < count; i++) {
        const segments = 12 + Math.floor(sys.rng() * 10);
        const pts = [];
        for (let j = 0; j < segments; j++) pts.push({ x: 0, y: 0, vx: 0, vy: 0 });
        sys.state.tendrils.push({
            points: pts,
            baseAngle: (TAU / count) * i,
            length: 30 + sys.rng() * 50,
            stiffness: 0.1 + sys.rng() * 0.15,
            damping: 0.85 + sys.rng() * 0.1,
            color: sys.palette.primary[i % sys.palette.primary.length],
            width: 1 + sys.rng() * 2.5,
            waveFreq: 0.05 + sys.rng() * 0.1,
            waveAmp: 3 + sys.rng() * 8
        });
    }
}

function drawTendrils(sys) {
    const { ctx } = sys;
    const mx = mouse.x, my = mouse.y;
    const velX = mouse.x - sys.prevMouse.x;
    const velY = mouse.y - sys.prevMouse.y;

    for (const t of sys.state.tendrils) {
        const angleOffset = Math.sin(sys.tick * 0.02) * 0.3;
        const angle = t.baseAngle + angleOffset + Math.atan2(velY, velX) * 0.3;

        t.points[0].x = mx;
        t.points[0].y = my;

        for (let i = 1; i < t.points.length; i++) {
            const prev = t.points[i - 1];
            const p = t.points[i];
            const segLen = t.length / t.points.length;
            const targetAngle = angle + Math.sin(sys.tick * t.waveFreq + i * 0.5) * 0.4;
            const targetX = prev.x + Math.cos(targetAngle) * segLen;
            const targetY = prev.y + Math.sin(targetAngle) * segLen;

            p.vx += (targetX - p.x) * t.stiffness;
            p.vy += (targetY - p.y) * t.stiffness;
            p.vx *= t.damping;
            p.vy *= t.damping;
            p.x += p.vx;
            p.y += p.vy;
        }

        ctx.beginPath();
        ctx.moveTo(t.points[0].x, t.points[0].y);
        for (let i = 1; i < t.points.length - 1; i++) {
            const xc = (t.points[i].x + t.points[i + 1].x) / 2;
            const yc = (t.points[i].y + t.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(t.points[i].x, t.points[i].y, xc, yc);
        }

        const frac = t.points.length;
        for (let w = t.width; w > 0.2; w -= 0.6) {
            ctx.lineWidth = w;
            ctx.strokeStyle = withAlpha(t.color, (w / t.width) * 0.5);
            ctx.stroke();
        }

        // Tip glow
        const tip = t.points[t.points.length - 1];
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 6);
        g.addColorStop(0, t.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(tip.x, tip.y, 6, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ═══════════════════════════════════════════════
//  STYLE: Sacred Geometry
// ═══════════════════════════════════════════════
function initGeometric(sys) {
    sys.state.sides = 3 + Math.floor(sys.rng() * 6); // 3-8 sided
    sys.state.layers = 2 + Math.floor(sys.rng() * 3);
    sys.state.innerPattern = Math.floor(sys.rng() * 4); // 0=star, 1=flower, 2=web, 3=metatron
    sys.state.rotSpeeds = [];
    for (let i = 0; i < sys.state.layers; i++) {
        sys.state.rotSpeeds.push((0.003 + sys.rng() * 0.01) * (i % 2 === 0 ? 1 : -1));
    }
}

function drawGeometric(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const breathe = 1 + 0.08 * Math.sin(sys.tick * 0.03);
    const clicking = isLeftMouseDown || isRightMouseDown;
    const expand = clicking ? 1.4 : 1.0;

    ctx.save();
    ctx.translate(mx, my);
    ctx.globalCompositeOperation = 'lighter';

    for (let layer = 0; layer < state.layers; layer++) {
        const rot = sys.tick * state.rotSpeeds[layer];
        const r = (30 + layer * 25) * breathe * expand;
        const color = palette.primary[layer % palette.primary.length];
        const alpha = 0.4 - layer * 0.08;

        ctx.save();
        ctx.rotate(rot);

        // Outer polygon
        ctx.strokeStyle = withAlpha(color, alpha);
        ctx.lineWidth = 1.5 - layer * 0.3;
        ctx.beginPath();
        for (let i = 0; i <= state.sides; i++) {
            const a = (TAU / state.sides) * i;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner connections
        if (state.innerPattern === 0) {
            // Star pattern: connect every other vertex
            ctx.beginPath();
            const skip = Math.max(2, Math.floor(state.sides / 2));
            for (let i = 0; i < state.sides; i++) {
                const a1 = (TAU / state.sides) * i;
                const a2 = (TAU / state.sides) * ((i + skip) % state.sides);
                ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
                ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
            }
            ctx.strokeStyle = withAlpha(color, alpha * 0.5);
            ctx.stroke();
        } else if (state.innerPattern === 1) {
            // Flower of life arcs
            for (let i = 0; i < state.sides; i++) {
                const a = (TAU / state.sides) * i;
                const cx = Math.cos(a) * r * 0.5;
                const cy = Math.sin(a) * r * 0.5;
                ctx.strokeStyle = withAlpha(color, alpha * 0.3);
                ctx.beginPath();
                ctx.arc(cx, cy, r * 0.5, 0, TAU);
                ctx.stroke();
            }
        } else if (state.innerPattern === 2) {
            // Web: connect all vertices to center
            ctx.beginPath();
            for (let i = 0; i < state.sides; i++) {
                const a = (TAU / state.sides) * i;
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.strokeStyle = withAlpha(color, alpha * 0.3);
            ctx.stroke();
        } else {
            // Metatron style: connect all vertices to all others
            ctx.beginPath();
            for (let i = 0; i < state.sides; i++) {
                for (let j = i + 1; j < state.sides; j++) {
                    const a1 = (TAU / state.sides) * i;
                    const a2 = (TAU / state.sides) * j;
                    ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
                    ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
                }
            }
            ctx.strokeStyle = withAlpha(color, alpha * 0.15);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Central glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.5 * breathe));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Lightning Arc
// ═══════════════════════════════════════════════
function initLightning(sys) {
    sys.state.bolts = [];
    sys.state.boltCount = 3 + Math.floor(sys.rng() * 4);
    sys.state.branchChance = 0.15 + sys.rng() * 0.2;
    sys.state.regenRate = 3 + Math.floor(sys.rng() * 4);
}

function generateBolt(sys, x1, y1, x2, y2, depth = 0) {
    if (depth > 3) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const points = [{ x: x1, y: y1 }];
    const segments = 4 + Math.floor(sys.rng() * 4);
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    const jitter = 15 + sys.rng() * 25;

    for (let i = 1; i < segments; i++) {
        const px = x1 + dx * i + (sys.rng() - 0.5) * jitter;
        const py = y1 + dy * i + (sys.rng() - 0.5) * jitter;
        points.push({ x: px, y: py });
    }
    points.push({ x: x2, y: y2 });
    return points;
}

function drawLightning(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const intensity = Math.min(1, sys.mouseSpeed * 0.03) + (isLeftMouseDown ? 0.8 : 0);

    if (sys.tick % state.regenRate === 0 || state.bolts.length === 0) {
        state.bolts = [];
        const count = state.boltCount + (isLeftMouseDown ? 3 : 0);
        for (let i = 0; i < count; i++) {
            const angle = sys.rng() * TAU;
            const len = 40 + sys.rng() * 80 + intensity * 60;
            const ex = mx + Math.cos(angle) * len;
            const ey = my + Math.sin(angle) * len;
            const points = generateBolt(sys, mx, my, ex, ey);

            // Branch
            if (sys.rng() < state.branchChance && points.length > 2) {
                const bi = 1 + Math.floor(sys.rng() * (points.length - 2));
                const bp = points[bi];
                const ba = angle + (sys.rng() - 0.5) * 1.2;
                const bl = len * 0.4;
                const branch = generateBolt(sys, bp.x, bp.y, bp.x + Math.cos(ba) * bl, bp.y + Math.sin(ba) * bl, 1);
                state.bolts.push({ points: branch, alpha: 0.3 + sys.rng() * 0.3, width: 1 });
            }
            state.bolts.push({ points, alpha: 0.5 + sys.rng() * 0.5, width: 1.5 + sys.rng() * 1.5 });
        }
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const bolt of state.bolts) {
        if (bolt.points.length < 2) continue;
        // Outer glow
        ctx.strokeStyle = withAlpha(palette.glow[0], bolt.alpha * 0.3);
        ctx.lineWidth = bolt.width * 4;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        ctx.stroke();

        // Core
        ctx.strokeStyle = withAlpha(palette.primary[0], bolt.alpha);
        ctx.lineWidth = bolt.width;
        ctx.stroke();

        // White hot center
        ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.alpha * 0.8})`;
        ctx.lineWidth = bolt.width * 0.3;
        ctx.stroke();
    }

    // Central spark
    const sparkR = 5 + intensity * 8 + Math.sin(sys.tick * 0.3) * 3;
    const sg = ctx.createRadialGradient(mx, my, 0, mx, my, sparkR);
    sg.addColorStop(0, `rgba(255, 255, 255, ${0.6 + intensity * 0.4})`);
    sg.addColorStop(0.4, withAlpha(palette.glow[0], 0.5));
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(mx, my, sparkR, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Ethereal Smoke
// ═══════════════════════════════════════════════
function initSmoke(sys) {
    sys.state.smokeParticles = [];
    sys.state.maxParticles = 80 + Math.floor(sys.rng() * 60);
    sys.state.emitRate = 2 + Math.floor(sys.rng() * 3);
    sys.state.buoyancy = -0.2 - sys.rng() * 0.4;
    sys.state.turbulence = 0.3 + sys.rng() * 0.5;
    sys.state.pool = [];
}

function drawSmoke(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const speed = sys.mouseSpeed;

    const emitCount = Math.min(state.emitRate + Math.floor(speed * 0.3), 6);
    for (let i = 0; i < emitCount && state.smokeParticles.length < state.maxParticles; i++) {
        const p = state.pool.length > 0 ? state.pool.pop() : {};
        p.x = mx + (sys.rng() - 0.5) * 8;
        p.y = my + (sys.rng() - 0.5) * 8;
        p.vx = (sys.rng() - 0.5) * 1.5 + (mouse.x - sys.prevMouse.x) * 0.2;
        p.vy = (sys.rng() - 0.5) * 1.5 + (mouse.y - sys.prevMouse.y) * 0.2;
        p.life = 1.0;
        p.decay = 0.008 + sys.rng() * 0.012;
        p.size = 8 + sys.rng() * 20;
        p.rotation = sys.rng() * TAU;
        p.rotSpeed = (sys.rng() - 0.5) * 0.05;
        p.color = palette.primary[Math.floor(sys.rng() * palette.primary.length)];
        state.smokeParticles.push(p);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.smokeParticles.length - 1; i >= 0; i--) {
        const p = state.smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += state.buoyancy * 0.1;
        p.vx += (sys.rng() - 0.5) * state.turbulence;
        p.vy += (sys.rng() - 0.5) * state.turbulence;
        p.vx *= 0.98; p.vy *= 0.98;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;
        p.size += 0.3;

        if (p.life <= 0) {
            state.pool.push(p);
            state.smokeParticles[i] = state.smokeParticles[state.smokeParticles.length - 1];
            state.smokeParticles.pop();
            continue;
        }
        const r = p.size * p.life;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, withAlpha(p.color, p.life * 0.15));
        g.addColorStop(0.6, withAlpha(p.color, p.life * 0.05));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Ripple Field
// ═══════════════════════════════════════════════
function initRipple(sys) {
    sys.state.ripples = [];
    sys.state.maxRipples = 15 + Math.floor(sys.rng() * 10);
    sys.state.emitInterval = 4 + Math.floor(sys.rng() * 6);
    sys.state.rippleSpeed = 1.5 + sys.rng() * 2.5;
    sys.state.style = Math.floor(sys.rng() * 3); // 0=circles, 1=polygons, 2=mixed
}

function drawRipple(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;

    if (sys.tick % state.emitInterval === 0 || isLeftMouseDown) {
        if (state.ripples.length < state.maxRipples) {
            state.ripples.push({
                x: mx, y: my,
                radius: 3,
                maxRadius: 60 + sys.rng() * 100,
                speed: state.rippleSpeed * (0.8 + sys.rng() * 0.4),
                alpha: 0.8,
                color: palette.primary[Math.floor(sys.rng() * palette.primary.length)],
                sides: 5 + Math.floor(sys.rng() * 5),
                rotation: sys.rng() * TAU
            });
        }
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i];
        r.radius += r.speed;
        r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
        r.rotation += 0.01;

        if (r.alpha <= 0) {
            state.ripples[i] = state.ripples[state.ripples.length - 1];
            state.ripples.pop();
            continue;
        }

        ctx.strokeStyle = withAlpha(r.color, r.alpha * 0.5);
        ctx.lineWidth = 2 * r.alpha;

        if (state.style === 1 || (state.style === 2 && i % 2 === 0)) {
            ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rotation);
            ctx.beginPath();
            for (let s = 0; s <= r.sides; s++) {
                const a = (TAU / r.sides) * s;
                const px = Math.cos(a) * r.radius;
                const py = Math.sin(a) * r.radius;
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, TAU);
            ctx.stroke();
        }
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Micro Galaxy
// ═══════════════════════════════════════════════
function initGalaxy(sys) {
    const armCount = 2 + Math.floor(sys.rng() * 4);
    sys.state.arms = armCount;
    sys.state.starCount = 60 + Math.floor(sys.rng() * 80);
    sys.state.twist = 1.5 + sys.rng() * 2.5;
    sys.state.spread = 0.15 + sys.rng() * 0.3;
    sys.state.stars = [];
    for (let i = 0; i < sys.state.starCount; i++) {
        const arm = Math.floor(sys.rng() * armCount);
        const dist = sys.rng();
        const offset = (sys.rng() - 0.5) * sys.state.spread * (1 + dist);
        sys.state.stars.push({
            arm, dist, offset,
            size: 0.5 + sys.rng() * 2,
            brightness: 0.3 + sys.rng() * 0.7,
            twinkleSpeed: 0.02 + sys.rng() * 0.08,
            twinklePhase: sys.rng() * TAU
        });
    }
}

function drawGalaxy(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const rot = sys.tick * 0.005;
    const maxR = 55 + Math.sin(sys.tick * 0.02) * 5;

    ctx.save(); ctx.translate(mx, my);

    // Core glow
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.5));
    cg.addColorStop(0.5, withAlpha(palette.primary[0], 0.15));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();

    // Stars
    for (const star of state.stars) {
        const armAngle = (TAU / state.arms) * star.arm;
        const spiralAngle = armAngle + star.dist * state.twist + rot;
        const r = star.dist * maxR;
        const x = Math.cos(spiralAngle + star.offset) * r;
        const y = Math.sin(spiralAngle + star.offset) * r * 0.6; // flatten
        const twinkle = 0.5 + 0.5 * Math.sin(sys.tick * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.brightness * twinkle;
        const color = palette.primary[star.arm % palette.primary.length];

        ctx.fillStyle = withAlpha(color, alpha);
        ctx.beginPath(); ctx.arc(x, y, star.size * twinkle, 0, TAU); ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Clockwork
// ═══════════════════════════════════════════════
function initClockwork(sys) {
    const gearCount = 3 + Math.floor(sys.rng() * 3);
    sys.state.gears = [];
    for (let i = 0; i < gearCount; i++) {
        const teeth = 6 + Math.floor(sys.rng() * 12);
        sys.state.gears.push({
            radius: 15 + i * 18 + sys.rng() * 8,
            teeth,
            toothDepth: 3 + sys.rng() * 5,
            speed: (0.005 + sys.rng() * 0.015) * (i % 2 === 0 ? 1 : -1),
            angle: sys.rng() * TAU,
            color: sys.palette.primary[i % sys.palette.primary.length],
            innerRadius: 5 + sys.rng() * 8,
            spokes: 3 + Math.floor(sys.rng() * 4)
        });
    }
}

function drawClockwork(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const speedMod = 1 + sys.mouseSpeed * 0.01;

    ctx.save(); ctx.translate(mx, my);
    ctx.globalCompositeOperation = 'lighter';

    for (const gear of state.gears) {
        gear.angle += gear.speed * speedMod;
        ctx.save(); ctx.rotate(gear.angle);

        // Gear outline with teeth
        ctx.strokeStyle = withAlpha(gear.color, 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < gear.teeth; i++) {
            const a1 = (TAU / gear.teeth) * i;
            const a2 = a1 + TAU / gear.teeth * 0.3;
            const a3 = a1 + TAU / gear.teeth * 0.5;
            const a4 = a1 + TAU / gear.teeth * 0.8;
            const ro = gear.radius + gear.toothDepth;
            const ri = gear.radius;
            ctx.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
            ctx.lineTo(Math.cos(a2) * ro, Math.sin(a2) * ro);
            ctx.lineTo(Math.cos(a3) * ro, Math.sin(a3) * ro);
            ctx.lineTo(Math.cos(a4) * ri, Math.sin(a4) * ri);
        }
        ctx.closePath(); ctx.stroke();

        // Inner hub
        ctx.strokeStyle = withAlpha(gear.color, 0.3);
        ctx.beginPath(); ctx.arc(0, 0, gear.innerRadius, 0, TAU); ctx.stroke();

        // Spokes
        for (let s = 0; s < gear.spokes; s++) {
            const sa = (TAU / gear.spokes) * s;
            ctx.beginPath();
            ctx.moveTo(Math.cos(sa) * gear.innerRadius, Math.sin(sa) * gear.innerRadius);
            ctx.lineTo(Math.cos(sa) * gear.radius * 0.85, Math.sin(sa) * gear.radius * 0.85);
            ctx.stroke();
        }
        ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: DNA Helix
// ═══════════════════════════════════════════════
function initDNA(sys) {
    sys.state.helixLength = 14 + Math.floor(sys.rng() * 8);
    sys.state.radius = 15 + sys.rng() * 10;
    sys.state.pitch = 0.4 + sys.rng() * 0.3;
    sys.state.rotSpeed = 0.03 + sys.rng() * 0.02;
    sys.state.basePairColors = [
        [sys.palette.primary[0], sys.palette.primary[1 % sys.palette.primary.length]],
        [sys.palette.accent[0], sys.palette.primary[0]]
    ];
}

function drawDNA(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const rot = sys.tick * state.rotSpeed;
    const moveAngle = sys.mouseAngle;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(moveAngle);
    ctx.globalCompositeOperation = 'lighter';

    const segDist = 8;
    for (let i = 0; i < state.helixLength; i++) {
        const t = i / state.helixLength;
        const x = (i - state.helixLength / 2) * segDist;
        const phase = rot + i * state.pitch;
        const y1 = Math.sin(phase) * state.radius;
        const y2 = Math.sin(phase + Math.PI) * state.radius;
        const z1 = Math.cos(phase);
        const z2 = Math.cos(phase + Math.PI);
        const alpha1 = 0.3 + z1 * 0.35;
        const alpha2 = 0.3 + z2 * 0.35;
        const size1 = 2 + z1 * 1.5;
        const size2 = 2 + z2 * 1.5;

        // Base pair connection
        ctx.strokeStyle = withAlpha(palette.primary[i % palette.primary.length], Math.max(alpha1, alpha2) * 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();

        // Strand 1
        ctx.fillStyle = withAlpha(palette.primary[0], alpha1);
        ctx.beginPath(); ctx.arc(x, y1, Math.max(0.5, size1), 0, TAU); ctx.fill();

        // Strand 2
        ctx.fillStyle = withAlpha(palette.primary[1 % palette.primary.length], alpha2);
        ctx.beginPath(); ctx.arc(x, y2, Math.max(0.5, size2), 0, TAU); ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Light Prism
// ═══════════════════════════════════════════════
function initPrism(sys) {
    sys.state.prismSize = 18 + sys.rng() * 12;
    sys.state.rayCount = 5 + Math.floor(sys.rng() * 4);
    sys.state.spread = 0.4 + sys.rng() * 0.6;
    sys.state.beamLength = 60 + sys.rng() * 50;
    sys.state.rotPhase = sys.rng() * TAU;
}

function drawPrism(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const rot = sys.tick * 0.005 + state.rotPhase;
    const size = state.prismSize;
    const breathing = 1 + 0.05 * Math.sin(sys.tick * 0.04);

    ctx.save(); ctx.translate(mx, my); ctx.rotate(rot);
    ctx.globalCompositeOperation = 'lighter';

    // Incoming white beam
    const inAngle = Math.PI;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(inAngle) * state.beamLength, Math.sin(inAngle) * state.beamLength);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Prism triangle
    ctx.strokeStyle = withAlpha(palette.primary[0], 0.5);
    ctx.fillStyle = withAlpha(palette.primary[0], 0.08);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
        const a = (TAU / 3) * i - Math.PI / 2;
        const px = Math.cos(a) * size * breathing;
        const py = Math.sin(a) * size * breathing;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Rainbow refracted beams
    const rainbowHues = [0, 30, 60, 120, 200, 260, 300];
    const totalSpread = state.spread;
    const startAngle = -totalSpread / 2;

    for (let i = 0; i < state.rayCount; i++) {
        const t = i / (state.rayCount - 1);
        const angle = startAngle + t * totalSpread;
        const hue = rainbowHues[i % rainbowHues.length];
        const len = state.beamLength * (0.7 + 0.3 * Math.sin(sys.tick * 0.05 + i));

        const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
        grad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.6)`);
        grad.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Firefly Swarm
// ═══════════════════════════════════════════════
function initFireflies(sys) {
    sys.state.flies = [];
    const count = 15 + Math.floor(sys.rng() * 20);
    for (let i = 0; i < count; i++) {
        sys.state.flies.push({
            angle: sys.rng() * TAU,
            dist: 10 + sys.rng() * 60,
            speed: 0.005 + sys.rng() * 0.02,
            orbitSpeed: 0.01 + sys.rng() * 0.03,
            size: 1 + sys.rng() * 2.5,
            phase: sys.rng() * TAU,
            pulseSpeed: 0.03 + sys.rng() * 0.07,
            wobble: sys.rng() * 20,
            color: sys.palette.primary[Math.floor(sys.rng() * sys.palette.primary.length)],
            x: 0, y: 0
        });
    }
}

function drawFireflies(sys) {
    const { ctx, state } = sys;
    const mx = mouse.x, my = mouse.y;

    ctx.globalCompositeOperation = 'lighter';
    for (const f of state.flies) {
        f.angle += f.orbitSpeed;
        const wobbleX = Math.sin(sys.tick * f.speed * 3 + f.phase) * f.wobble;
        const wobbleY = Math.cos(sys.tick * f.speed * 2 + f.phase) * f.wobble;
        const targetX = mx + Math.cos(f.angle) * f.dist + wobbleX;
        const targetY = my + Math.sin(f.angle) * f.dist + wobbleY;

        f.x += (targetX - f.x) * 0.08;
        f.y += (targetY - f.y) * 0.08;

        const pulse = 0.3 + 0.7 * Math.pow(Math.sin(sys.tick * f.pulseSpeed + f.phase) * 0.5 + 0.5, 3);
        const r = f.size * pulse;

        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 6);
        g.addColorStop(0, withAlpha(f.color, pulse * 0.8));
        g.addColorStop(0.3, withAlpha(f.color, pulse * 0.3));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 6, 0, TAU); ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.9})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.4, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Runic Circle
// ═══════════════════════════════════════════════
function initRunic(sys) {
    sys.state.ringCount = 2 + Math.floor(sys.rng() * 2);
    sys.state.symbols = Math.floor(sys.rng() * 3); // 0=lines, 1=dots, 2=crosses
    sys.state.symbolCount = 6 + Math.floor(sys.rng() * 10);
    sys.state.innerSpeed = 0.008 + sys.rng() * 0.012;
    sys.state.outerSpeed = -(0.004 + sys.rng() * 0.008);
    sys.state.pulsePhase = sys.rng() * TAU;
}

function drawRunic(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const clicking = isLeftMouseDown || isRightMouseDown;
    const pulse = 1 + 0.1 * Math.sin(sys.tick * 0.04 + state.pulsePhase);
    const expand = clicking ? 1.3 : 1.0;

    ctx.save(); ctx.translate(mx, my);
    ctx.globalCompositeOperation = 'lighter';

    for (let ring = 0; ring < state.ringCount; ring++) {
        const r = (30 + ring * 28) * pulse * expand;
        const rot = sys.tick * (ring === 0 ? state.innerSpeed : state.outerSpeed);

        // Ring circle
        ctx.strokeStyle = withAlpha(palette.primary[ring % palette.primary.length], 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();

        // Symbols on ring
        ctx.save(); ctx.rotate(rot);
        const symColor = withAlpha(palette.primary[(ring + 1) % palette.primary.length], 0.6);
        ctx.strokeStyle = symColor;
        ctx.fillStyle = symColor;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < state.symbolCount; i++) {
            const a = (TAU / state.symbolCount) * i;
            const sx = Math.cos(a) * r;
            const sy = Math.sin(a) * r;

            ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + rot * 2);

            if (state.symbols === 0) {
                // Tick marks
                ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
                if (i % 3 === 0) { ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke(); }
            } else if (state.symbols === 1) {
                // Dots
                ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
                if (i % 2 === 0) {
                    ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.stroke();
                }
            } else {
                // Mini runes
                ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();

        // Connector lines to center
        if (ring === 0 && clicking) {
            ctx.strokeStyle = withAlpha(palette.glow[0], 0.2);
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 6; i++) {
                const a = (TAU / 6) * i + rot;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.stroke();
            }
        }
    }

    // Center rune glow
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 12 * pulse);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.4));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, 12 * pulse, 0, TAU); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Constellation Weaver
// ═══════════════════════════════════════════════
function initConstellation(sys) {
    const count = 8 + Math.floor(sys.rng() * 12);
    sys.state.nodes = [];
    for (let i = 0; i < count; i++) {
        sys.state.nodes.push({
            angle: sys.rng() * TAU,
            dist: 15 + sys.rng() * 55,
            driftSpeed: 0.003 + sys.rng() * 0.008,
            size: 1 + sys.rng() * 2,
            twinkle: sys.rng() * TAU,
            twinkleSpeed: 0.02 + sys.rng() * 0.06,
            connections: []
        });
    }
    // Build constellation connections
    for (let i = 0; i < count; i++) {
        const conns = 1 + Math.floor(sys.rng() * 2);
        for (let c = 0; c < conns; c++) {
            const target = Math.floor(sys.rng() * count);
            if (target !== i && !sys.state.nodes[i].connections.includes(target)) {
                sys.state.nodes[i].connections.push(target);
            }
        }
    }
}

function drawConstellation(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;

    ctx.save(); ctx.translate(mx, my);
    ctx.globalCompositeOperation = 'lighter';

    const positions = state.nodes.map(n => {
        n.angle += n.driftSpeed;
        return {
            x: Math.cos(n.angle) * n.dist,
            y: Math.sin(n.angle) * n.dist
        };
    });

    // Lines
    ctx.lineWidth = 0.8;
    for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i];
        const p1 = positions[i];
        for (const ci of n.connections) {
            const p2 = positions[ci];
            const alpha = 0.15 + 0.1 * Math.sin(sys.tick * 0.03 + i);
            ctx.strokeStyle = withAlpha(palette.primary[0], alpha);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    // Stars
    for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i];
        const p = positions[i];
        const twinkle = 0.4 + 0.6 * Math.pow(Math.sin(sys.tick * n.twinkleSpeed + n.twinkle) * 0.5 + 0.5, 2);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, n.size * 5);
        g.addColorStop(0, withAlpha(palette.glow[0], twinkle * 0.6));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, n.size * 5, 0, TAU); ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, n.size * 0.8, 0, TAU); ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Waveform Oscilloscope
// ═══════════════════════════════════════════════
function initWaveform(sys) {
    sys.state.waves = [];
    const count = 2 + Math.floor(sys.rng() * 3);
    for (let i = 0; i < count; i++) {
        sys.state.waves.push({
            freq: 0.02 + sys.rng() * 0.05,
            amp: 10 + sys.rng() * 25,
            phase: sys.rng() * TAU,
            phaseSpeed: 0.02 + sys.rng() * 0.04,
            color: sys.palette.primary[i % sys.palette.primary.length],
            width: 1 + sys.rng() * 2
        });
    }
    sys.state.radius = 35 + sys.rng() * 20;
}

function drawWaveform(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const r = state.radius;

    ctx.save(); ctx.translate(mx, my);
    ctx.globalCompositeOperation = 'lighter';

    for (const wave of state.waves) {
        wave.phase += wave.phaseSpeed;
        ctx.strokeStyle = withAlpha(wave.color, 0.5);
        ctx.lineWidth = wave.width;
        ctx.beginPath();
        for (let a = 0; a < TAU; a += 0.05) {
            const waveR = r + Math.sin(a * (wave.freq * 100) + wave.phase + sys.tick * 0.02) * wave.amp;
            const x = Math.cos(a) * waveR;
            const y = Math.sin(a) * waveR;
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();

        // Glow version
        ctx.strokeStyle = withAlpha(wave.color, 0.15);
        ctx.lineWidth = wave.width * 4;
        ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// ═══════════════════════════════════════════════
//  STYLE: Gravitational Lensing
// ═══════════════════════════════════════════════
function initLensing(sys) {
    sys.state.distortRadius = 50 + sys.rng() * 40;
    sys.state.starField = [];
    const count = 200 + Math.floor(sys.rng() * 200);
    for (let i = 0; i < count; i++) {
        sys.state.starField.push({
            x: sys.rng() * sys.width,
            y: sys.rng() * sys.height,
            size: 0.5 + sys.rng() * 2,
            brightness: 0.3 + sys.rng() * 0.7,
            hue: sys.rng() * 60 + 180
        });
    }
    sys.state.einsteinRings = 1 + Math.floor(sys.rng() * 3);
    sys.state.lensPower = 80 + sys.rng() * 120;
}

function drawLensing(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const clicking = isLeftMouseDown || isRightMouseDown;
    const power = state.lensPower * (clicking ? 2 : 1);
    const radius = state.distortRadius * (clicking ? 1.5 : 1);

    // Draw background stars with gravitational lensing distortion
    ctx.globalCompositeOperation = 'lighter';
    for (const star of state.starField) {
        const dx = star.x - mx;
        const dy = star.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let drawX = star.x;
        let drawY = star.y;

        if (dist < radius * 3 && dist > 5) {
            // Gravitational lensing formula: deflect away from center
            const deflection = power / (dist * dist) * radius;
            drawX = mx + (dx / dist) * (dist + deflection);
            drawY = my + (dy / dist) * (dist + deflection);

            // Amplification: stars near the Einstein ring appear brighter
            const einsteinDist = Math.abs(dist - radius);
            const amplification = einsteinDist < 20 ? 2 + (20 - einsteinDist) * 0.2 : 1;

            ctx.fillStyle = withAlpha(palette.primary[0], star.brightness * amplification);
            ctx.beginPath();
            ctx.arc(drawX, drawY, star.size * amplification, 0, TAU);
            ctx.fill();

            // Ghost/mirrored image on opposite side
            if (dist < radius * 1.5) {
                const mirrorX = mx - (dx / dist) * (radius * 2 - dist) * 0.4;
                const mirrorY = my - (dy / dist) * (radius * 2 - dist) * 0.4;
                ctx.fillStyle = withAlpha(palette.accent[0], star.brightness * 0.3);
                ctx.beginPath();
                ctx.arc(mirrorX, mirrorY, star.size * 0.7, 0, TAU);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * 0.4})`;
            ctx.beginPath();
            ctx.arc(drawX, drawY, star.size, 0, TAU);
            ctx.fill();
        }
    }

    // Einstein rings
    for (let r = 0; r < state.einsteinRings; r++) {
        const ringR = radius * (0.8 + r * 0.4);
        const wobble = Math.sin(sys.tick * 0.03 + r) * 3;
        const grad = ctx.createRadialGradient(mx, my, ringR - 3, mx, my, ringR + 3);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, withAlpha(palette.glow[0], 0.15 + 0.05 * Math.sin(sys.tick * 0.05)));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, ringR + wobble, 0, TAU);
        ctx.fill();
    }

    // Space distortion visual near center
    const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 20);
    cg.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    cg.addColorStop(0.7, withAlpha(palette.glow[0], 0.2));
    cg.addColorStop(1, 'transparent');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(mx, my, 20, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Time Crystal
// ═══════════════════════════════════════════════
function initTimeCrystal(sys) {
    sys.state.echoes = [];
    sys.state.maxEchoes = 8 + Math.floor(sys.rng() * 8);
    sys.state.echoInterval = 4 + Math.floor(sys.rng() * 6);
    sys.state.facets = 4 + Math.floor(sys.rng() * 5);
    sys.state.rotSpeed = 0.01 + sys.rng() * 0.02;
    sys.state.pulseFreq = 0.03 + sys.rng() * 0.04;
    sys.state.innerGeometry = Math.floor(sys.rng() * 3); // 0=nested, 1=fractal, 2=web
}

function drawTimeCrystal(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;

    // Record echo positions
    if (sys.tick % state.echoInterval === 0) {
        state.echoes.push({ x: mx, y: my, tick: sys.tick, alpha: 1.0 });
        if (state.echoes.length > state.maxEchoes) state.echoes.shift();
    }

    ctx.globalCompositeOperation = 'lighter';

    // Draw temporal echoes (past positions with fading crystal shapes)
    for (let e = 0; e < state.echoes.length; e++) {
        const echo = state.echoes[e];
        const age = (sys.tick - echo.tick) / (state.echoInterval * state.maxEchoes);
        const alpha = (1 - age) * 0.4;
        if (alpha <= 0) continue;

        const rot = echo.tick * state.rotSpeed;
        const size = 15 + age * 20; // Echoes grow as they age
        const timeFracture = Math.sin(echo.tick * state.pulseFreq) * 5;

        ctx.save();
        ctx.translate(echo.x, echo.y);
        ctx.rotate(rot);

        // Crystal facets
        ctx.strokeStyle = withAlpha(palette.primary[e % palette.primary.length], alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= state.facets; i++) {
            const a = (TAU / state.facets) * i;
            const r = size + timeFracture * Math.sin(a * 2);
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner patterns
        if (state.innerGeometry === 0) {
            // Nested crystals
            ctx.strokeStyle = withAlpha(palette.accent[0], alpha * 0.5);
            ctx.beginPath();
            for (let i = 0; i <= state.facets; i++) {
                const a = (TAU / state.facets) * i + TAU / state.facets / 2;
                const r = size * 0.5;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (state.innerGeometry === 1) {
            // Fractal lines from vertices to center
            for (let i = 0; i < state.facets; i++) {
                const a = (TAU / state.facets) * i;
                const r = size + timeFracture * Math.sin(a * 2);
                ctx.strokeStyle = withAlpha(palette.glow[0], alpha * 0.3);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // Current crystal (bright, pulsing)
    const pulse = 1 + 0.15 * Math.sin(sys.tick * state.pulseFreq);
    const rot = sys.tick * state.rotSpeed;
    const size = 20 * pulse;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(rot);

    // Glowing core crystal
    ctx.strokeStyle = withAlpha(palette.glow[0], 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= state.facets; i++) {
        const a = (TAU / state.facets) * i;
        const r = size;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Glow
    ctx.strokeStyle = withAlpha(palette.glow[0], 0.2);
    ctx.lineWidth = 6;
    ctx.stroke();

    // Temporal connectors to echoes
    ctx.restore();
    for (let e = 0; e < state.echoes.length; e++) {
        const echo = state.echoes[e];
        const age = (sys.tick - echo.tick) / (state.echoInterval * state.maxEchoes);
        const alpha = (1 - age) * 0.15;
        if (alpha <= 0) continue;

        ctx.strokeStyle = withAlpha(palette.primary[0], alpha);
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(echo.x, echo.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Core glow
    const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 12);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.6));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(mx, my, 12, 0, TAU); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Fractal Zoom (Julia Set)
// ═══════════════════════════════════════════════
function initFractalZoom(sys) {
    sys.state.offscreen = document.createElement('canvas');
    sys.state.offscreen.width = 80;
    sys.state.offscreen.height = 80;
    sys.state.offCtx = sys.state.offscreen.getContext('2d');
    sys.state.imageData = sys.state.offCtx.createImageData(80, 80);
    sys.state.cReal = -0.7 + sys.rng() * 0.5;
    sys.state.cImag = 0.2 + sys.rng() * 0.3 * (sys.rng() > 0.5 ? 1 : -1);
    sys.state.maxIter = 30 + Math.floor(sys.rng() * 20);
    sys.state.zoom = 2 + sys.rng() * 1.5;
    sys.state.hueOffset = sys.rng() * 360;
    sys.state.renderSize = 60 + Math.floor(sys.rng() * 40);
}

function drawFractalZoom(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const size = state.offscreen.width;
    const data = state.imageData.data;
    const maxIter = state.maxIter;

    // Slowly evolve the Julia set parameters
    const cR = state.cReal + Math.sin(sys.tick * 0.003) * 0.1;
    const cI = state.cImag + Math.cos(sys.tick * 0.004) * 0.1;
    const zoom = state.zoom + Math.sin(sys.tick * 0.005) * 0.3;

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            let zr = (px - size / 2) / (size / 2) * zoom;
            let zi = (py - size / 2) / (size / 2) * zoom;

            let iter = 0;
            while (iter < maxIter && zr * zr + zi * zi < 4) {
                const tmp = zr * zr - zi * zi + cR;
                zi = 2 * zr * zi + cI;
                zr = tmp;
                iter++;
            }

            const pi = (py * size + px) * 4;
            if (iter === maxIter) {
                data[pi] = data[pi + 1] = data[pi + 2] = 0;
            } else {
                const t = iter / maxIter;
                const hue = (state.hueOffset + t * 360 + sys.tick * 0.5) % 360;
                const sat = 80 + t * 20;
                const light = 10 + t * 50;
                const c = (1 - Math.abs(2 * light / 100 - 1)) * (sat / 100);
                const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
                const m = light / 100 - c / 2;
                let r, g, b;
                if (hue < 60) { r = c; g = x; b = 0; }
                else if (hue < 120) { r = x; g = c; b = 0; }
                else if (hue < 180) { r = 0; g = c; b = x; }
                else if (hue < 240) { r = 0; g = x; b = c; }
                else if (hue < 300) { r = x; g = 0; b = c; }
                else { r = c; g = 0; b = x; }
                data[pi] = (r + m) * 255;
                data[pi + 1] = (g + m) * 255;
                data[pi + 2] = (b + m) * 255;
            }
            data[pi + 3] = 255;
        }
    }

    state.offCtx.putImageData(state.imageData, 0, 0);

    // Draw as circular portal at cursor
    const renderR = state.renderSize / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Clip to circle
    ctx.beginPath();
    ctx.arc(mx, my, renderR, 0, TAU);
    ctx.clip();
    ctx.drawImage(state.offscreen, mx - renderR, my - renderR, renderR * 2, renderR * 2);
    ctx.restore();

    // Ring glow around the fractal portal
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(mx, my, renderR - 5, mx, my, renderR + 8);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.5, withAlpha(palette.glow[0], 0.4));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, renderR + 8, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  STYLE: Particle Vortex
// ═══════════════════════════════════════════════
function initVortex(sys) {
    sys.state.particles = [];
    const count = 60 + Math.floor(sys.rng() * 80);
    for (let i = 0; i < count; i++) {
        sys.state.particles.push({
            angle: sys.rng() * TAU,
            dist: 10 + sys.rng() * 80,
            speed: 0.02 + sys.rng() * 0.04,
            size: 0.5 + sys.rng() * 2,
            hue: sys.rng() * 60,
            trail: [],
            trailMax: 5 + Math.floor(sys.rng() * 10)
        });
    }
    sys.state.armCount = 2 + Math.floor(sys.rng() * 3);
    sys.state.swirlTight = 0.02 + sys.rng() * 0.04;
    sys.state.rotDir = sys.rng() > 0.5 ? 1 : -1;
}

function drawVortex(sys) {
    const { ctx, palette, state } = sys;
    const mx = mouse.x, my = mouse.y;
    const boost = isLeftMouseDown ? 3 : 1;
    const suck = isRightMouseDown;

    ctx.globalCompositeOperation = 'lighter';

    for (const p of state.particles) {
        // Spiral motion
        p.angle += p.speed * state.rotDir * boost;
        if (suck) {
            p.dist = Math.max(5, p.dist - 0.5);
        } else {
            // Breathe in and out
            const targetDist = 10 + (p.dist > 50 ? -0.1 : 0.05) + Math.sin(sys.tick * 0.01 + p.angle) * 0.3;
            p.dist += targetDist > p.dist ? 0.2 : -0.1;
        }

        const spiralAngle = p.angle + p.dist * state.swirlTight;
        const x = mx + Math.cos(spiralAngle) * p.dist;
        const y = my + Math.sin(spiralAngle) * p.dist;

        // Store trail
        p.trail.push({ x, y });
        if (p.trail.length > p.trailMax) p.trail.shift();

        // Draw trail
        if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let i = 1; i < p.trail.length; i++) {
                ctx.lineTo(p.trail[i].x, p.trail[i].y);
            }
            const hue = (sys.palette.strategy === 'volcanic' ? 20 : (sys.state.particles.indexOf(p) * 3 + sys.tick * 0.5)) % 360;
            ctx.strokeStyle = withAlpha(palette.primary[0], 0.2 * (p.trail.length / p.trailMax));
            ctx.lineWidth = p.size;
            ctx.stroke();
        }

        // Particle head
        const glow = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3);
        glow.addColorStop(0, withAlpha(palette.glow[0], 0.6));
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y, p.size * 3, 0, TAU); ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, p.size * 0.5, 0, TAU); ctx.fill();
    }

    // Center vortex eye
    const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 15);
    cg.addColorStop(0, withAlpha(palette.glow[0], 0.5));
    cg.addColorStop(0.5, withAlpha(palette.primary[0], 0.15));
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(mx, my, 15, 0, TAU); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
}

// ═══════════════════════════════════════════════
//  CURSOR EFFECTS SYSTEM
// ═══════════════════════════════════════════════
const CURSOR_STYLES = {
    orbital:       { init: initOrbital, draw: drawOrbital },
    tendrils:      { init: initTendrils, draw: drawTendrils },
    geometric:     { init: initGeometric, draw: drawGeometric },
    lightning:     { init: initLightning, draw: drawLightning },
    smoke:         { init: initSmoke, draw: drawSmoke },
    ripple:        { init: initRipple, draw: drawRipple },
    galaxy:        { init: initGalaxy, draw: drawGalaxy },
    clockwork:     { init: initClockwork, draw: drawClockwork },
    dna:           { init: initDNA, draw: drawDNA },
    prism:         { init: initPrism, draw: drawPrism },
    fireflies:     { init: initFireflies, draw: drawFireflies },
    runic:         { init: initRunic, draw: drawRunic },
    constellation: { init: initConstellation, draw: drawConstellation },
    waveform:      { init: initWaveform, draw: drawWaveform },
    lensing:       { init: initLensing, draw: drawLensing },
    timeCrystal:   { init: initTimeCrystal, draw: drawTimeCrystal },
    fractalZoom:   { init: initFractalZoom, draw: drawFractalZoom },
    vortex:        { init: initVortex, draw: drawVortex }
};

class CursorEffectsSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.tick = 0;
        this.style = null;
        this.styleName = '';
        this.rng = Math.random;
        this.state = {};
        this.mouseSpeed = 0;
        this.mouseAngle = 0;
        this.prevMouse = { x: 0, y: 0 };
        this.palette = null;
        this.isActive = false;
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'cursor-effects-canvas';
        this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99;';
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
        const keys = Object.keys(CURSOR_STYLES);
        this.styleName = keys[Math.floor(rng() * keys.length)];
        this.style = CURSOR_STYLES[this.styleName];
        this.state = {};
        this.tick = 0;
        this.style.init(this);
        this.isActive = true;
    }

    animate() {
        this.tick++;
        const dx = mouse.x - this.prevMouse.x;
        const dy = mouse.y - this.prevMouse.y;
        this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
        this.mouseAngle = Math.atan2(dy, dx);
        this.prevMouse = { x: mouse.x, y: mouse.y };

        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.isActive && this.style) {
            this.style.draw(this);
        }
        requestAnimationFrame(this.loop);
    }
}

export const cursorEffects = new CursorEffectsSystem();
