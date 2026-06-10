/**
 * @file particle_engine.js
 * @description In-house particle engine replacing the particles.js 2.0.0 CDN
 * dependency. Exposes the exact pJS-shaped API surface the rest of the
 * codebase consumes (pJS.particles.*, pJS.canvas.*, pJS.fn.*), so the
 * simulation, powers, mutators, anomalies, and cataclysms run unchanged —
 * while fixing what the old library got wrong:
 *
 *  - particlesDraw() no longer secretly runs a second physics update per
 *    frame (particles.js v2 called particlesUpdate() inside particlesDraw(),
 *    doubling motion). update and draw are now honestly separate; the
 *    integration factor matches the old *net* displacement so the tuned
 *    universe speeds feel identical.
 *  - move.trail actually works. The old config asked for trails that
 *    particles.js v2 never supported (its internal clearRect wiped the
 *    fade fill every frame). Trails now fade via destination-out, so they
 *    composite correctly over the background instead of smearing black.
 *  - DPR-aware rendering: logic stays in CSS pixels (matching mouse
 *    coordinates everywhere), the backing store scales by devicePixelRatio.
 *    The old retina path put particles in device pixels while the app's
 *    powers aimed in CSS pixels, so interactions missed on hi-DPI screens.
 *  - pushParticles() returns the created particles. Callers (safePush)
 *    always expected an array; the old library returned undefined, so
 *    spawned particles from quasars/geysers/nurseries were never tagged.
 *
 * No DOM strings, no innerHTML — CSP/Trusted Types safe.
 */

import { mouse } from './state.js';

const TAU = Math.PI * 2;

function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m
        ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
        : { r: 255, g: 255, b: 255 };
}

export function createParticleEngine(containerId, config) {
    const container = document.getElementById(containerId);
    const el = document.createElement('canvas');
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.display = 'block';
    if (container) container.appendChild(el);
    const ctx = el.getContext('2d');

    // Deep-copy config so per-universe mutation never corrupts baseConfig
    const particles = structuredClone(config.particles);
    if (particles.number.value_max === undefined) particles.number.value_max = 400;
    if (!particles.line_linked.distance) particles.line_linked.distance = 150;
    if (particles.line_linked.opacity === undefined) particles.line_linked.opacity = 0.4;
    if (!particles.move.attract.rotateX) particles.move.attract.rotateX = 600;
    if (!particles.move.attract.rotateY) particles.move.attract.rotateY = 1200;
    if (!particles.move.trail.length) particles.move.trail.length = 10;
    particles.array = [];

    const interactivity = structuredClone(config.interactivity || {});
    const bubble = interactivity.modes && interactivity.modes.bubble;
    const bubbleOn = !!(interactivity.events && interactivity.events.onhover
        && interactivity.events.onhover.enable && interactivity.events.onhover.mode === 'bubble');

    const pJS = {
        canvas: { el, ctx, w: 0, h: 0, dpr: 1 },
        particles,
        fn: {},
    };

    const pool = [];

    function resize() {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        pJS.canvas.w = window.innerWidth;
        pJS.canvas.h = window.innerHeight;
        pJS.canvas.dpr = dpr;
        el.width = Math.max(1, Math.round(pJS.canvas.w * dpr));
        el.height = Math.max(1, Math.round(pJS.canvas.h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticle(x, y) {
        const p = pool.length > 0 ? pool.pop() : {};
        p.x = x !== undefined ? x : Math.random() * pJS.canvas.w;
        p.y = y !== undefined ? y : Math.random() * pJS.canvas.h;
        p.vx = Math.random() - 0.5;
        p.vy = Math.random() - 0.5;
        const size = particles.size;
        p.radius = Math.max(0.6, (size.random ? Math.random() : 1) * size.value);
        p.radius_initial = p.radius;
        p.opacity = { value: particles.opacity.random ? Math.random() * particles.opacity.value : particles.opacity.value };
        p.color = { rgb: hexToRgb(particles.color.value) };
        p.shape = undefined;       // falls back to particles.shape.type
        p.character = undefined;   // falls back to particles.shape.character
        p.charIndex = (Math.random() * 1024) | 0;
        p.startX = p.x;
        p.startY = p.y;
        p.seed = Math.random() * 1000;
        // Benign defaults for the app's custom tags so hot paths never see undefined
        p.isCrystalized = false;
        p.isInfected = false;
        p.isEntangled = false;
        p.isConsumed = 0;
        p.unravelling = 0;
        p.fading = 0;
        p.colorLocked = false;
        p.isHeavy = false;
        p.isCoral = false;
        p.isStatic = false;
        p.bondPartner = null;
        p.chainParent = null;
        p.chainChild = null;
        return p;
    }

    /** Particle count honoring the density model (config value per value_area px²). */
    function densityCount() {
        const num = particles.number;
        if (!num.density || !num.density.enable) return num.value;
        const area = (pJS.canvas.w * pJS.canvas.h) / 1000;
        const n = Math.round((area * num.value) / num.density.value_area);
        return Math.min(Math.max(n, 30), num.value_max || n);
    }

    pJS.fn.particlesRefresh = function () {
        for (const p of particles.array) {
            if (pool.length < 600) pool.push(p);
        }
        particles.array.length = 0;
        const n = densityCount();
        for (let i = 0; i < n; i++) particles.array.push(createParticle());
    };

    pJS.fn.modes = {
        /** Create `n` particles (at pos if given). Returns the new particles. */
        pushParticles(n, pos) {
            const created = [];
            for (let i = 0; i < n; i++) {
                const p = createParticle(pos ? pos.x : undefined, pos ? pos.y : undefined);
                particles.array.push(p);
                created.push(p);
            }
            return created;
        },
    };

    pJS.fn.particlesUpdate = function () {
        const arr = particles.array;
        const w = pJS.canvas.w;
        const h = pJS.canvas.h;
        // Old library moved at speed/2 per update but updated twice per frame;
        // a single honest update at full speed preserves the tuned feel.
        const ms = particles.move.speed;
        const bounce = particles.move.out_mode === 'bounce';

        for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            if (particles.move.enable !== false && !p.isStatic) {
                p.x += p.vx * ms * 0.5;
                p.y += p.vy * ms * 0.5;
                p.x += p.vx * ms * 0.5;
                p.y += p.vy * ms * 0.5;
            }

            if (bounce) {
                if (p.x - p.radius < 0) { p.x = p.radius; p.vx = Math.abs(p.vx); }
                else if (p.x + p.radius > w) { p.x = w - p.radius; p.vx = -Math.abs(p.vx); }
                if (p.y - p.radius < 0) { p.y = p.radius; p.vy = Math.abs(p.vy); }
                else if (p.y + p.radius > h) { p.y = h - p.radius; p.vy = -Math.abs(p.vy); }
            } else {
                // 'out': wrap to the opposite edge
                if (p.x - p.radius > w) p.x = -p.radius;
                else if (p.x + p.radius < 0) p.x = w + p.radius;
                if (p.y - p.radius > h) p.y = -p.radius;
                else if (p.y + p.radius < 0) p.y = h + p.radius;
            }

            // Bubble hover: particles swell near the cursor and relax via the
            // simulation's existing radius decay
            if (bubbleOn && bubble) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                const bd = bubble.distance;
                if (distSq < bd * bd) {
                    const target = p.radius_initial + (bubble.size || 8) * (1 - Math.sqrt(distSq) / bd);
                    if (p.radius < target) p.radius += (target - p.radius) * 0.08;
                }
            }
        }

        // Mutual attraction (rarely enabled; matches the old library's scale)
        if (particles.move.attract.enable) {
            const ax = 1 / (particles.move.attract.rotateX * 1000);
            const ay = 1 / (particles.move.attract.rotateY * 1000);
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const dx = arr[i].x - arr[j].x;
                    const dy = arr[i].y - arr[j].y;
                    arr[i].vx -= dx * ax; arr[i].vy -= dy * ay;
                    arr[j].vx += dx * ax; arr[j].vy += dy * ay;
                }
            }
        }
    };

    function tracePolygon(x, y, r, sides, rot) {
        ctx.moveTo(x + r * Math.cos(rot), y + r * Math.sin(rot));
        for (let i = 1; i <= sides; i++) {
            const a = rot + (i / sides) * TAU;
            ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
        }
    }

    function traceStar(x, y, r) {
        const rot = -Math.PI / 2;
        ctx.moveTo(x + r * Math.cos(rot), y + r * Math.sin(rot));
        for (let i = 1; i <= 10; i++) {
            const a = rot + (i / 10) * TAU;
            const rr = i % 2 === 0 ? r : r * 0.45;
            ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
        }
    }

    function drawLinks(arr) {
        const dist = particles.line_linked.distance;
        const distSqMax = dist * dist;
        const baseAlpha = particles.line_linked.opacity;
        // Batch segments into 3 alpha bands to avoid a stroke() per pair
        const bands = [[], [], []];
        for (let i = 0; i < arr.length; i++) {
            const a = arr[i];
            for (let j = i + 1; j < arr.length; j++) {
                const b = arr[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < distSqMax) {
                    const band = d2 < distSqMax * 0.25 ? 0 : d2 < distSqMax * 0.6 ? 1 : 2;
                    bands[band].push(a.x, a.y, b.x, b.y);
                }
            }
        }
        ctx.lineWidth = 1;
        const alphas = [baseAlpha, baseAlpha * 0.55, baseAlpha * 0.25];
        for (let b = 0; b < 3; b++) {
            const seg = bands[b];
            if (seg.length === 0) continue;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alphas[b]})`;
            ctx.beginPath();
            for (let k = 0; k < seg.length; k += 4) {
                ctx.moveTo(seg[k], seg[k + 1]);
                ctx.lineTo(seg[k + 2], seg[k + 3]);
            }
            ctx.stroke();
        }
    }

    pJS.fn.particlesDraw = function () {
        const arr = particles.array;
        const w = pJS.canvas.w;
        const h = pJS.canvas.h;

        // Trails: erase a fraction of the previous frame (keeps the canvas
        // transparent over the background); otherwise clear fully.
        if (particles.move.trail.enable) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, 1 / particles.move.trail.length)})`;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        } else {
            ctx.clearRect(0, 0, w, h);
        }

        if (particles.line_linked.enable && arr.length > 1) drawLinks(arr);

        const globalShape = particles.shape.type;
        const nbSides = particles.shape.polygon.nb_sides || 5;
        const globalChars = particles.shape.character.value;

        for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            const op = p.opacity.value;
            if (op <= 0) continue;
            const rgb = p.color.rgb;
            const r = Math.max(0.4, p.radius);
            const shape = p.shape || globalShape;
            ctx.fillStyle = `rgba(${rgb.r | 0}, ${rgb.g | 0}, ${rgb.b | 0}, ${op})`;

            if (shape === 'character' || shape === 'char') {
                const chars = (p.character && p.character.value) || globalChars || ['*'];
                const c = chars[p.charIndex % chars.length];
                ctx.font = `${Math.max(8, r * 4)}px monospace`;
                ctx.fillText(c, p.x - r, p.y + r);
                continue;
            }
            ctx.beginPath();
            if (shape === 'edge' || shape === 'square') {
                ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
            } else if (shape === 'triangle') {
                tracePolygon(p.x, p.y, r * 1.3, 3, -Math.PI / 2);
            } else if (shape === 'polygon') {
                tracePolygon(p.x, p.y, r * 1.2, nbSides, -Math.PI / 2);
            } else if (shape === 'star') {
                traceStar(p.x, p.y, r * 1.4);
            } else {
                ctx.arc(p.x, p.y, r, 0, TAU);
            }
            ctx.fill();
        }
    };

    // Throttled resize, matching the app's other canvases
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 100);
    });

    resize();
    pJS.fn.particlesRefresh();
    return pJS;
}
