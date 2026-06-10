// Particle engine compatibility + behavior tests, and journal tests.
const JS = new URL('../js', import.meta.url).pathname;
import { readFileSync, readdirSync } from 'fs';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ── DOM stubs ────────────────────────────────────────────────────────────────
const noop = () => {};
function makeCtxStub() {
    const calls = { fillRect: 0, clearRect: 0, arc: 0, rect: 0, fillText: 0, stroke: 0, fill: 0, composites: [] };
    const t = { _calls: calls };
    return new Proxy(t, {
        get: (o, p) => {
            if (p === '_calls') return calls;
            if (p === 'canvas') return { width: 1280, height: 800 };
            if (!(p in o)) {
                o[p] = (...args) => { if (p in calls) calls[p]++; };
            }
            return o[p];
        },
        set: (o, p, v) => {
            if (p === 'globalCompositeOperation') calls.composites.push(v);
            o[p] = v;
            return true;
        },
    });
}
const ctxStub = makeCtxStub();
globalThis.window = {
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2,
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    addEventListener: noop,
};
globalThis.document = {
    createElement: () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0,
        classList: { add: noop, remove: noop }, appendChild: noop, addEventListener: noop }),
    getElementById: () => ({ style: { setProperty: noop }, classList: { add: noop, remove: noop }, appendChild: noop }),
    addEventListener: noop, querySelector: () => null,
    body: { appendChild: noop, prepend: noop, classList: { add: noop, remove: noop } },
    head: { appendChild: noop }, visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

const { baseConfig } = await import(JS + '/config.js');
const { createParticleEngine } = await import(JS + '/particle_engine.js');
const stateMod = await import(JS + '/state.js');

// ── 1. API coverage: every pJS.* path used in the repo must resolve ─────────
{
    const dir = new URL('../js', import.meta.url).pathname;
    const paths = new Set();
    for (const f of readdirSync(dir)) {
        if (!f.endsWith('.js') || f === 'particle_engine.js') continue;
        const src = readFileSync(`${dir}/${f}`, 'utf8');
        for (const m of src.matchAll(/\bpJS\.([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g)) {
            paths.add(m[1]);
        }
    }
    const pJS = createParticleEngine('particles-js', baseConfig);
    let resolved = 0;
    for (const path of paths) {
        let obj = pJS;
        let ok = true;
        for (const seg of path.split('.')) {
            if (obj === null || obj === undefined) { ok = false; break; }
            const next = obj[seg];
            if (next === undefined && !(seg in Object(obj))) { ok = false; break; }
            obj = next;
        }
        if (!ok) fail(`unresolvable pJS path used by app: pJS.${path}`);
        else resolved++;
    }
    console.log(`engine API: ${resolved}/${paths.size} pJS.* paths from the codebase resolve`);
}

// ── 2. Engine behavior ───────────────────────────────────────────────────────
{
    const pJS = createParticleEngine('particles-js', baseConfig);
    const arr = pJS.particles.array;
    if (arr.length < 30) fail(`refresh created only ${arr.length} particles`);
    if (pJS.canvas.w !== 1280 || pJS.canvas.h !== 800) fail('canvas should use CSS pixels');

    // Particle shape sanity
    const p0 = arr[0];
    for (const prop of ['x', 'y', 'vx', 'vy', 'radius', 'radius_initial', 'seed', 'startX']) {
        if (!Number.isFinite(p0[prop])) fail(`particle.${prop} not numeric`);
    }
    if (!p0.opacity || !Number.isFinite(p0.opacity.value)) fail('particle.opacity.value missing');
    if (!p0.color || !p0.color.rgb || p0.color.rgb.r !== 255) fail('particle.color.rgb wrong for #ffffff');

    // pushParticles returns the created particles (the old library returned undefined)
    const born = pJS.fn.modes.pushParticles(3, { x: 100, y: 200 });
    if (!Array.isArray(born) || born.length !== 3) fail('pushParticles must return created array');
    if (born[0].x !== 100 || born[0].y !== 200) fail('pushParticles ignored position');

    // Motion parity: displacement per frame = vx * move.speed
    const p = born[0];
    p.vx = 2; p.vy = 0; pJS.particles.move.speed = 3;
    const x0 = p.x;
    pJS.fn.particlesUpdate();
    if (Math.abs((p.x - x0) - 2 * 3) > 1e-9) fail(`speed parity: moved ${p.x - x0}, expected 6`);

    // Out-mode wrap
    p.x = pJS.canvas.w + p.radius + 1; p.vx = 0;
    pJS.fn.particlesUpdate();
    if (p.x !== -p.radius) fail(`out mode should wrap, got ${p.x}`);

    // Bounce mode clamps and reflects
    pJS.particles.move.out_mode = 'bounce';
    p.x = -5; p.vx = -2;
    pJS.fn.particlesUpdate();
    if (!(p.vx > 0) || p.x < 0) fail(`bounce failed: x=${p.x} vx=${p.vx}`);
    pJS.particles.move.out_mode = 'out';

    // Draw: trail fade uses destination-out; all shape branches execute
    const calls = pJS.canvas.ctx._calls;
    pJS.particles.move.trail.enable = true;
    const shapes = ['circle', 'edge', 'triangle', 'polygon', 'star', 'character'];
    arr.forEach((pp, i) => { pp.shape = shapes[i % shapes.length]; });
    pJS.particles.line_linked.enable = true;
    const fillsBefore = calls.fill;
    pJS.fn.particlesDraw();
    if (!calls.composites.includes('destination-out')) fail('trail fade should use destination-out');
    if (calls.fillText === 0) fail('character shape never drew');
    if (calls.fill <= fillsBefore) fail('no particles drawn');
    // No-trail mode clears instead
    pJS.particles.move.trail.enable = false;
    const clearsBefore = calls.clearRect;
    pJS.fn.particlesDraw();
    if (calls.clearRect <= clearsBefore) fail('clearRect expected when trails off');

    // Attract pulls particles together
    pJS.particles.array.length = 0;
    const a = pJS.fn.modes.pushParticles(1, { x: 0, y: 0 })[0];
    const b = pJS.fn.modes.pushParticles(1, { x: 100, y: 0 })[0];
    a.vx = 0; a.vy = 0; b.vx = 0; b.vy = 0; a.isStatic = true; b.isStatic = true;
    pJS.particles.move.attract.enable = true;
    pJS.fn.particlesUpdate();
    if (!(a.vx > 0 && b.vx < 0)) fail(`attract should pull together (${a.vx}, ${b.vx})`);
    pJS.particles.move.attract.enable = false;

    // Bubble hover swells radius near the cursor
    stateMod.setMouse({ x: 50, y: 50 });
    pJS.particles.array.length = 0;
    const hov = pJS.fn.modes.pushParticles(1, { x: 60, y: 50 })[0];
    hov.vx = 0; hov.vy = 0;
    const r0 = hov.radius;
    for (let i = 0; i < 30; i++) pJS.fn.particlesUpdate();
    if (!(hov.radius > r0)) fail('bubble hover should swell radius near cursor');

    // refresh pools and repopulates; config isolation from baseConfig
    pJS.particles.move.speed = 99;
    if (baseConfig.particles.move.speed === 99) fail('engine must deep-copy config (baseConfig mutated!)');
    pJS.fn.particlesRefresh();
    if (pJS.particles.array.length < 30) fail('refresh after churn failed');

    console.log('engine behavior: density, push-return, speed parity, wrap/bounce, trails, shapes, links, attract, bubble, config isolation — OK');
}

// ── 3. Journal ───────────────────────────────────────────────────────────────
{
    const { loreCodex } = await import(JS + '/lore_codex.js');
    const { journal } = await import(JS + '/journal.js');
    const { mulberry32 } = await import(JS + '/utils.js');
    journal.init();
    loreCodex.generate(mulberry32(1), 'Eldritch');
    journal.record('VOID-MAW-1000', 'Eldritch');
    journal.record('VOID-MAW-1000', 'Eldritch'); // revisit
    journal.record('VOID-MAW-1000-II', 'Eldritch');
    const e0 = journal._entries.find((e) => e.seed === 'VOID-MAW-1000');
    if (!e0 || e0.visits !== 2) fail(`revisit should bump visits, got ${e0 && e0.visits}`);
    const e1 = journal._entries.find((e) => e.seed === 'VOID-MAW-1000-II');
    if (!e1 || e1.generation !== 2) fail('descendant generation not recorded');
    if (!e0.epithet.startsWith('“')) fail('epithet not captured');
    for (let i = 0; i < 200; i++) journal.record('SEED-' + i, 'Classical');
    if (journal._entries.length > 150) fail(`cap exceeded: ${journal._entries.length}`);
    // persistence across reload
    journal._entries = [];
    journal.init();
    if (!journal._entries.some((e) => e.seed === 'VOID-MAW-1000-II') && journal._entries.length === 0) {
        fail('journal should persist');
    }
    console.log(`journal: visits/lineage/epithet recorded, capped at ${journal._entries.length}, persists`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
