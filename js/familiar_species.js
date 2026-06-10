/**
 * @file familiar_species.js
 * @description Species library for the cursor familiar — a small creature that
 * lives at your cursor and behaves like a pet: it follows with its own
 * locomotion, dozes off when you go idle, and startles when you click.
 *
 * Each species defines:
 *  - init(f, rng):   build species-specific anatomy into f.aux
 *  - update(f):      advance locomotion/animation (f.x/f.y already steered)
 *  - draw(ctx, f):   render the creature
 *
 * All species read the shared familiar state:
 *  f.x, f.y           - body position (spring-follows the cursor)
 *  f.vx, f.vy         - body velocity
 *  f.heading          - smoothed travel direction (radians)
 *  f.speed            - smoothed travel speed (px/frame)
 *  f.excitement       - 0..1 smoothed cursor activity
 *  f.mode             - 'follow' | 'doze' | 'startle'
 *  f.startleT         - 1..0 during a startle, else 0
 *  f.dozeT            - 0..1 ease into doze
 *  f.size             - base scale (seeded)
 *  f.hue, f.hue2      - palette hues
 *  f.tick             - frame counter
 *  f.rand()           - deterministic runtime RNG
 *  f.emit(style, x, y, vx, vy, life, size)  - pooled trail particle
 */

const TAU = Math.PI * 2;

function lerpAngle(a, b, t) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return a + d * t;
}

/** Advance a rope of points so each link trails the previous at fixed spacing. */
function followChain(segs, headX, headY, spacing, stiffness) {
    segs[0].x = headX;
    segs[0].y = headY;
    for (let i = 1; i < segs.length; i++) {
        const prev = segs[i - 1];
        const s = segs[i];
        const dx = prev.x - s.x;
        const dy = prev.y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = (d - spacing) * stiffness;
        s.x += (dx / d) * pull;
        s.y += (dy / d) * pull;
    }
}

// ─────────────────────────────────────────────────────────────── wisp ──

const wisp = {
    name: 'wisp',
    label: 'wisp',
    init(f, rng) {
        f.aux = { flamePhase: rng() * TAU, emberClock: 0 };
    },
    update(f) {
        const a = f.aux;
        // Embers stream while moving, sputter while dozing
        a.emberClock++;
        const interval = f.mode === 'doze' ? 26 : Math.max(2, (7 - f.speed) | 0);
        if (a.emberClock >= interval) {
            a.emberClock = 0;
            const r = f.rand;
            f.emit('ember', f.x + (r() - 0.5) * 6, f.y + (r() - 0.5) * 6,
                (r() - 0.5) * 0.6 - f.vx * 0.15, -0.4 - r() * 0.8, 34 + r() * 22, 1 + r() * 2);
        }
        if (f.startleT > 0.92 && f.startleT < 0.98) {
            // One-shot flare burst at the start of a startle
            for (let i = 0; i < 12; i++) {
                const ang = (i / 12) * TAU;
                f.emit('ember', f.x, f.y, Math.cos(ang) * 2.4, Math.sin(ang) * 2.4, 26, 1.6);
            }
        }
    },
    draw(ctx, f) {
        const flick = 1 + Math.sin(f.tick * 0.31 + f.aux.flamePhase) * (0.1 + f.excitement * 0.15);
        const s = f.size * (1 - f.dozeT * 0.55) * flick * (1 + f.startleT * 0.8);
        const ang = f.speed > 0.4 ? f.heading + Math.PI : -Math.PI / 2; // tail away from motion, else up
        const tx = Math.cos(ang);
        const ty = Math.sin(ang);
        const tailLen = s * (2.2 + f.speed * 0.25);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Outer teardrop
        ctx.fillStyle = `hsla(${f.hue}, 90%, 60%, ${0.5 - f.dozeT * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(f.x + tx * tailLen, f.y + ty * tailLen);
        ctx.quadraticCurveTo(f.x - ty * s, f.y + tx * s, f.x - tx * s * 0.8, f.y - ty * s * 0.8);
        ctx.quadraticCurveTo(f.x + ty * s, f.y - tx * s, f.x + tx * tailLen, f.y + ty * tailLen);
        ctx.fill();
        // Hot core
        ctx.fillStyle = `hsla(${f.hue2}, 100%, 82%, ${0.8 - f.dozeT * 0.3})`;
        ctx.beginPath();
        ctx.arc(f.x - tx * s * 0.25, f.y - ty * s * 0.25, s * 0.42, 0, TAU);
        ctx.fill();
        ctx.restore();
    },
};

// ──────────────────────────────────────────────────────────── mothFlock ──

const mothFlock = {
    name: 'mothFlock',
    label: 'moth flock',
    init(f, rng) {
        const moths = [];
        const count = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < count; i++) {
            moths.push({
                phase: rng() * TAU,
                radius: 16 + rng() * 26,
                speed: (0.02 + rng() * 0.03) * (rng() < 0.5 ? 1 : -1),
                size: f.size * (0.45 + rng() * 0.4),
                hueOff: (rng() - 0.5) * 50,
                wingPhase: rng() * TAU,
                bob: rng() * TAU,
                x: 0, y: 0, scatter: 0,
            });
        }
        f.aux = { moths };
    },
    update(f) {
        for (const m of f.aux.moths) {
            m.phase += m.speed * (1 + f.excitement * 1.6) * (1 - f.dozeT * 0.85);
            if (f.startleT > 0.92 && f.startleT < 0.98) m.scatter = 1;
            m.scatter *= 0.94;
            const r = m.radius * (1 - f.dozeT * 0.6) * (1 + m.scatter * 2.4);
            const bobY = Math.sin(f.tick * 0.05 + m.bob) * 4 * (1 - f.dozeT);
            m.x = f.x + Math.cos(m.phase) * r;
            m.y = f.y + Math.sin(m.phase) * r * 0.62 + bobY;
            if (f.rand() < 0.02 * f.excitement) {
                f.emit('petal', m.x, m.y, (f.rand() - 0.5) * 0.4, 0.2 + f.rand() * 0.3, 40, 1.2);
            }
        }
    },
    draw(ctx, f) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const m of f.aux.moths) {
            const wingRate = 0.08 + (0.3 + f.excitement * 0.4) * (1 - f.dozeT * 0.92);
            const flap = Math.sin(f.tick * wingRate * TAU * 0.16 + m.wingPhase) * (1 - f.dozeT * 0.7);
            const hue = (f.hue + m.hueOff + 360) % 360;
            const s = m.size;
            const dir = m.phase + (m.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.rotate(dir);
            // Wings: two triangles folding around the body axis
            const spread = 0.55 + flap * 0.5;
            ctx.fillStyle = `hsla(${hue}, 75%, 70%, ${0.55 - f.dozeT * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-s * 2.1, -s * 2.6 * spread);
            ctx.lineTo(s * 0.4, -s * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-s * 2.1, s * 2.6 * spread);
            ctx.lineTo(s * 0.4, s * 0.5);
            ctx.closePath();
            ctx.fill();
            // Body + glow dot
            ctx.fillStyle = `hsla(${f.hue2}, 90%, 85%, 0.9)`;
            ctx.beginPath();
            ctx.ellipse(0, 0, s * 0.9, s * 0.34, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    },
};

// ────────────────────────────────────────────────────────────── serpent ──

const serpent = {
    name: 'serpent',
    label: 'serpent',
    init(f, rng) {
        const n = 14 + Math.floor(rng() * 9);
        const segs = [];
        for (let i = 0; i < n; i++) segs.push({ x: f.x - i * 6, y: f.y });
        f.aux = { segs, spacing: 5 + rng() * 3, coilDir: rng() < 0.5 ? 1 : -1, shiver: 0 };
    },
    update(f) {
        const a = f.aux;
        if (f.startleT > 0.92 && f.startleT < 0.98) a.shiver = 1;
        a.shiver *= 0.9;
        // Head seeks a point: the familiar body, or a slow coil orbit while dozing
        let hx = f.x;
        let hy = f.y;
        if (f.dozeT > 0.3) {
            const coilAng = f.tick * 0.012 * a.coilDir;
            const coilR = 16 + 10 * (1 - f.dozeT);
            hx = f.x + Math.cos(coilAng) * coilR;
            hy = f.y + Math.sin(coilAng) * coilR * 0.8;
        } else {
            // Slither: weave perpendicular to travel
            const weave = Math.sin(f.tick * (0.12 + f.excitement * 0.12)) * (4 + f.speed * 1.6);
            hx += Math.cos(f.heading + Math.PI / 2) * weave;
            hy += Math.sin(f.heading + Math.PI / 2) * weave;
        }
        followChain(a.segs, hx, hy, a.spacing, 0.55);
        if (a.shiver > 0.05) {
            for (let i = 2; i < a.segs.length; i += 2) {
                const side = i % 4 === 0 ? 1 : -1;
                a.segs[i].x += Math.cos(f.heading + Math.PI / 2) * side * a.shiver * 5;
                a.segs[i].y += Math.sin(f.heading + Math.PI / 2) * side * a.shiver * 5;
            }
        }
        if (f.speed > 2 && f.tick % 5 === 0) {
            const tail = a.segs[a.segs.length - 1];
            f.emit('spark', tail.x, tail.y, 0, 0, 24, 1);
        }
    },
    draw(ctx, f) {
        const segs = f.aux.segs;
        const n = segs.length;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Tapered body in 3 width bands (cheap taper without per-segment strokes)
        const bands = [
            { from: 0, to: n * 0.34 | 0, w: f.size * 0.85, l: 66 },
            { from: n * 0.34 | 0, to: n * 0.7 | 0, w: f.size * 0.55, l: 58 },
            { from: n * 0.7 | 0, to: n - 1, w: f.size * 0.26, l: 50 },
        ];
        for (const b of bands) {
            if (b.to <= b.from) continue;
            ctx.strokeStyle = `hsla(${f.hue}, 80%, ${b.l}%, ${0.65 - f.dozeT * 0.25})`;
            ctx.lineWidth = Math.max(0.8, b.w * (1 - f.dozeT * 0.25));
            ctx.beginPath();
            ctx.moveTo(segs[b.from].x, segs[b.from].y);
            for (let i = b.from + 1; i <= b.to; i++) ctx.lineTo(segs[i].x, segs[i].y);
            ctx.stroke();
        }
        // Head: skull dot + eyes
        const head = segs[0];
        const neck = segs[1];
        const hAng = Math.atan2(head.y - neck.y, head.x - neck.x);
        ctx.fillStyle = `hsla(${f.hue}, 85%, 72%, 0.9)`;
        ctx.beginPath();
        ctx.arc(head.x, head.y, f.size * 0.62, 0, TAU);
        ctx.fill();
        const blink = f.dozeT > 0.5 ? 0.3 : 1;
        ctx.fillStyle = `hsla(${f.hue2}, 100%, 88%, ${0.95 * blink})`;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(head.x + Math.cos(hAng + side * 0.8) * f.size * 0.4,
                head.y + Math.sin(hAng + side * 0.8) * f.size * 0.4, f.size * 0.14, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    },
};

// ─────────────────────────────────────────────────────────── satellites ──

const satellites = {
    name: 'satellites',
    label: 'satellite swarm',
    init(f, rng) {
        const shards = [];
        const count = 3 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
            shards.push({
                shell: i % 2,
                angle: rng() * TAU,
                angVel: (0.015 + rng() * 0.02) * (i % 2 === 0 ? 1 : -1),
                size: f.size * (0.3 + rng() * 0.35),
                sides: 3 + Math.floor(rng() * 3),
                spin: rng() * TAU,
                spinVel: (rng() - 0.5) * 0.1,
                flash: 0,
                x: 0, y: 0,
            });
        }
        f.aux = { shards, shellR: [20 + rng() * 8, 40 + rng() * 14] };
    },
    update(f) {
        const a = f.aux;
        const swap = f.startleT > 0.92 && f.startleT < 0.98;
        for (const sh of a.shards) {
            if (swap) {
                sh.shell = 1 - sh.shell;
                sh.flash = 1;
            }
            sh.flash *= 0.92;
            sh.angle += sh.angVel * (1 + f.excitement * 2);
            sh.spin += sh.spinVel;
            const targetR = f.dozeT > 0.3 ? 10 : a.shellR[sh.shell];
            if (sh.r === undefined) sh.r = targetR;
            sh.r += (targetR - sh.r) * 0.08;
            sh.x = f.x + Math.cos(sh.angle) * sh.r;
            sh.y = f.y + Math.sin(sh.angle) * sh.r;
        }
    },
    draw(ctx, f) {
        const a = f.aux;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Hub
        ctx.fillStyle = `hsla(${f.hue2}, 90%, 80%, ${0.7 - f.dozeT * 0.3})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 2.2, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 1;
        for (const sh of a.shards) {
            // Tether
            ctx.strokeStyle = `hsla(${f.hue}, 70%, 65%, ${0.1 + sh.flash * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(sh.x, sh.y);
            ctx.stroke();
            // Polygon shard
            ctx.strokeStyle = `hsla(${f.hue}, 85%, ${62 + sh.flash * 30}%, ${0.8 - f.dozeT * 0.35})`;
            ctx.beginPath();
            for (let i = 0; i <= sh.sides; i++) {
                const ang = sh.spin + (i / sh.sides) * TAU;
                const px = sh.x + Math.cos(ang) * sh.size;
                const py = sh.y + Math.sin(ang) * sh.size;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    },
};

// ──────────────────────────────────────────────────────────────── jelly ──

const jelly = {
    name: 'jelly',
    label: 'jelly',
    init(f, rng) {
        const verts = [];
        const n = 10;
        for (let i = 0; i < n; i++) verts.push({ off: 0, vel: 0 });
        const tendrils = [];
        const tCount = 4 + Math.floor(rng() * 3);
        for (let t = 0; t < tCount; t++) {
            const chain = [];
            for (let i = 0; i < 5; i++) chain.push({ x: f.x, y: f.y });
            tendrils.push({ chain, frac: t / tCount });
        }
        f.aux = { verts, tendrils, pulse: rng() * TAU, inked: false };
    },
    update(f) {
        const a = f.aux;
        const pop = f.startleT > 0.92 && f.startleT < 0.98;
        for (const v of a.verts) {
            if (pop) v.vel += 2.5;
            v.vel += -v.off * 0.18 - v.vel * 0.22; // spring to rest
            v.off += v.vel;
        }
        if (pop && !a.inked) {
            a.inked = true;
            for (let i = 0; i < 6; i++) {
                f.emit('ink', f.x, f.y, (f.rand() - 0.5) * 2, (f.rand() - 0.5) * 2, 50, 3 + f.rand() * 3);
            }
        }
        if (f.startleT === 0) a.inked = false;
        const r = f.size * 1.5;
        for (const t of a.tendrils) {
            const ang = t.frac * TAU + Math.PI / 2 - 0.6 + t.frac * 1.2; // hang below
            const ax = f.x + Math.cos(ang) * r * 0.5;
            const ay = f.y + Math.abs(Math.sin(ang)) * r * 0.5;
            followChain(t.chain, ax, ay, 4 + f.size * 0.3, 0.4);
            // Gravity sag on tendrils
            for (let i = 1; i < t.chain.length; i++) t.chain[i].y += 0.5;
        }
    },
    draw(ctx, f) {
        const a = f.aux;
        const breath = Math.sin(f.tick * (0.05 - f.dozeT * 0.025) + a.pulse) * 0.12;
        const r = f.size * 1.5 * (1 + breath) * (1 - f.dozeT * 0.2);
        const squashX = 1 + Math.min(0.4, Math.abs(f.vx) * 0.03);
        const squashY = 1 + Math.min(0.4, Math.abs(f.vy) * 0.03);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1.2;
        for (const t of a.tendrils) {
            ctx.strokeStyle = `hsla(${f.hue}, 70%, 70%, ${0.35 - f.dozeT * 0.15})`;
            ctx.beginPath();
            ctx.moveTo(t.chain[0].x, t.chain[0].y);
            for (let i = 1; i < t.chain.length; i++) ctx.lineTo(t.chain[i].x, t.chain[i].y);
            ctx.stroke();
        }
        ctx.translate(f.x, f.y);
        ctx.scale(squashX, Math.max(0.6, 2 - squashY));
        const n = a.verts.length;
        ctx.fillStyle = `hsla(${f.hue}, 75%, 62%, ${0.3 - f.dozeT * 0.1})`;
        ctx.strokeStyle = `hsla(${f.hue2}, 90%, 78%, ${0.7 - f.dozeT * 0.3})`;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const i0 = i % n;
            const i1 = (i + 1) % n;
            const a0 = (i0 / n) * TAU;
            const a1 = (i1 / n) * TAU;
            const r0 = r + a.verts[i0].off;
            const r1 = r + a.verts[i1].off;
            const x0 = Math.cos(a0) * r0;
            const y0 = Math.sin(a0) * r0;
            const x1 = Math.cos(a1) * r1;
            const y1 = Math.sin(a1) * r1;
            if (i === 0) ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
            else ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }
        ctx.fill();
        ctx.stroke();
        // Eyes (closed while dozing)
        if (f.dozeT < 0.5) {
            ctx.fillStyle = `hsla(${f.hue2}, 95%, 90%, 0.9)`;
            ctx.beginPath();
            ctx.arc(-r * 0.3, -r * 0.1, 1.6, 0, TAU);
            ctx.arc(r * 0.3, -r * 0.1, 1.6, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    },
};

// ─────────────────────────────────────────────────────────────── oculus ──

const oculus = {
    name: 'oculus',
    label: 'oculus',
    init(f, rng) {
        f.aux = {
            blinkAt: 200 + Math.floor(rng() * 240),
            blinkClock: 0,
            lid: 1, // 1 = open
            wanderAng: rng() * TAU,
        };
    },
    update(f) {
        const a = f.aux;
        a.blinkClock++;
        if (a.blinkClock >= a.blinkAt) {
            a.blinkClock = 0;
            a.blinkAt = 160 + Math.floor(f.rand() * 300);
        }
        // Lid: brief close at the start of each blink cycle; droop while dozing
        const blinkPhase = a.blinkClock < 16 ? Math.abs(8 - a.blinkClock) / 8 : 1;
        const target = Math.min(blinkPhase, 1 - f.dozeT * 0.62) + f.startleT * 0.6;
        a.lid += (Math.min(1, target) - a.lid) * 0.3;
        if (f.dozeT > 0.3) a.wanderAng += (f.rand() - 0.5) * 0.1;
        if (f.startleT > 0.92 && f.startleT < 0.98) {
            f.emit('ring', f.x, f.y, 0, 0, 30, f.size * 1.6);
        }
    },
    draw(ctx, f) {
        const a = f.aux;
        const r = f.size * 1.6;
        const lid = Math.max(0.06, a.lid);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(f.x, f.y);
        // Almond outline via two mirrored quadratic lids
        ctx.fillStyle = `hsla(${f.hue}, 35%, 16%, 0.85)`;
        ctx.strokeStyle = `hsla(${f.hue}, 80%, 65%, 0.8)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.quadraticCurveTo(0, -r * 1.15 * lid, r, 0);
        ctx.quadraticCurveTo(0, r * 1.15 * lid, -r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Iris + pupil track the cursor's motion; wander while dozing
        ctx.save();
        ctx.clip();
        let lookX;
        let lookY;
        if (f.dozeT > 0.3) {
            lookX = Math.cos(a.wanderAng) * r * 0.25;
            lookY = Math.sin(a.wanderAng) * r * 0.12;
        } else {
            const sp = Math.max(0.001, f.speed);
            lookX = (f.vx / (sp + 2)) * r * 0.4;
            lookY = (f.vy / (sp + 2)) * r * 0.25;
        }
        const irisR = r * 0.52 * (1 - f.startleT * 0.25);
        ctx.fillStyle = `hsla(${f.hue2}, 85%, 55%, 0.95)`;
        ctx.beginPath();
        ctx.arc(lookX, lookY, irisR, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(4, 4, 10, 0.95)';
        ctx.beginPath();
        ctx.arc(lookX, lookY, irisR * (0.42 + f.startleT * 0.3), 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(lookX - irisR * 0.3, lookY - irisR * 0.3, irisR * 0.14, 0, TAU);
        ctx.fill();
        ctx.restore();
        ctx.restore();
    },
};

export const FAMILIAR_SPECIES = [wisp, mothFlock, serpent, satellites, jelly, oculus];

/**
 * Blueprint-affinity weights: which species feel native to which universes.
 * Index order matches FAMILIAR_SPECIES.
 */
const SPECIES_AFFINITY = {
    wisp: ['StarForged', 'CelestialForge', 'MoltenHeart', 'VolcanicForge', 'StellarNursery', 'Classical'],
    mothFlock: ['Organic', 'FungalForest', 'SilkWeaver', 'Papercraft', 'Painterly', 'CoralReef'],
    serpent: ['BioMechanical', 'SentientSwarm', 'GooeyMess', 'LivingInk', 'AbyssalZone', 'ChronoVerse'],
    satellites: ['Digital', 'TechnoUtopia', 'NeonCyber', 'QuantumFoam', 'ArcaneCodex', 'Crystalline'],
    jelly: ['GlassySea', 'CoralReef', 'AbyssalZone', 'Aetherial', 'GooeyMess', 'GlacialDrift'],
    oculus: ['Eldritch', 'VoidTouched', 'AbyssalHorror', 'HauntedRealm', 'PhantomEcho', 'ArcaneCodex'],
};

/** Pick a species for this universe: 3x weight when the blueprint matches. */
export function selectSpecies(rng, blueprintName) {
    const weights = FAMILIAR_SPECIES.map(sp =>
        (SPECIES_AFFINITY[sp.name] || []).includes(blueprintName) ? 3 : 1);
    let total = 0;
    for (const w of weights) total += w;
    let roll = rng() * total;
    for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return FAMILIAR_SPECIES[i];
    }
    return FAMILIAR_SPECIES[0];
}
