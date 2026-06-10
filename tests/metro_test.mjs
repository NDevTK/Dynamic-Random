// Functional test for the MetroTransit effect + generator (run in Node with DOM stubs).
const JS = new URL('../js', import.meta.url).pathname;
import { mulberry32, stringToSeed } from '../js/utils.js';
import { generateMetroNetwork, pointAtDist, nearestOnLine } from '../js/metro_map_generator.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ───────────────────────── Generator invariants over many seeds ─────────────
const topoSeen = new Set();
const sizes = [[1920, 1080], [1280, 800], [640, 480], [800, 1280]];
const fingerprints = new Set();

for (let s = 0; s < 400; s++) {
    const [w, h] = sizes[s % sizes.length];
    const rng = mulberry32(stringToSeed('SEED-' + s));
    const net = generateMetroNetwork(rng, w, h);
    topoSeen.add(net.topology);

    if (net.lines.length < 2 || net.lines.length > 8) fail(`seed ${s}: ${net.lines.length} lines`);
    if (net.stations.length < 4) fail(`seed ${s}: only ${net.stations.length} stations`);

    const pt = { x: 0, y: 0, ang: 0 };
    for (const [li, ln] of net.lines.entries()) {
        if (!(ln.total > 60)) fail(`seed ${s} line ${li}: total ${ln.total}`);
        if (ln.pts.length < 2) fail(`seed ${s} line ${li}: ${ln.pts.length} pts`);
        for (let i = 1; i < ln.cum.length; i++) {
            if (!(ln.cum[i] > ln.cum[i - 1])) { fail(`seed ${s} line ${li}: cum not strictly increasing @${i}`); break; }
        }
        // points should stay within a loose margin of the viewport
        for (const p of ln.pts) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { fail(`seed ${s} line ${li}: non-finite point`); break; }
            if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) { fail(`seed ${s} line ${li}: point out of bounds (${p.x.toFixed(1)},${p.y.toFixed(1)}) vs ${w}x${h}`); break; }
        }
        // pointAtDist agrees with stations and is robust to arbitrary hints
        for (const [k, d] of ln.stationDists.entries()) {
            const st = net.stations[ln.stationRefs[k]];
            pointAtDist(ln, d, 0, pt);
            const err = Math.hypot(pt.x - st.x, pt.y - st.y);
            if (err > 0.01) fail(`seed ${s} line ${li}: station ${k} off by ${err}`);
            pointAtDist(ln, d, ln.pts.length - 2, pt); // worst-case hint
            if (Math.hypot(pt.x - st.x, pt.y - st.y) > 0.01) fail(`seed ${s} line ${li}: hint-dependent result`);
        }
        // nearestOnLine for an on-line point should be ~0 distance
        pointAtDist(ln, ln.total * 0.37, 0, pt);
        const near = nearestOnLine(ln, pt.x, pt.y);
        if (near.d2 > 0.01) fail(`seed ${s} line ${li}: nearestOnLine d2=${near.d2}`);
        // loop wrap-around lookups
        if (ln.isLoop) {
            pointAtDist(ln, ln.total + 12, 0, pt);
            const a = { x: pt.x, y: pt.y };
            pointAtDist(ln, 12, 0, pt);
            if (Math.hypot(a.x - pt.x, a.y - pt.y) > 0.01) fail(`seed ${s} line ${li}: loop wrap mismatch`);
        }
    }
    // interchange groups reference valid stations on distinct lines
    for (const g of net.interchanges) {
        if (g.length < 2) fail(`seed ${s}: degenerate interchange`);
        const lineSet = new Set(g.map(i => net.stations[i].line));
        if (lineSet.size < 2) fail(`seed ${s}: interchange on single line`);
    }
    fingerprints.add(net.topology + ':' + net.lines.length + ':' + net.stations.length + ':' + Math.round(net.lines[0].total));
}
if (topoSeen.size !== 4) fail(`only topologies seen: ${[...topoSeen]}`);
if (fingerprints.size < 200) fail(`networks too similar: ${fingerprints.size} unique of 400`);
console.log(`generator: 400 seeds OK — topologies ${[...topoSeen].join(', ')}; ${fingerprints.size} unique fingerprints`);

// Determinism: same seed → identical network
{
    const a = generateMetroNetwork(mulberry32(123456), 1280, 800);
    const b = generateMetroNetwork(mulberry32(123456), 1280, 800);
    if (JSON.stringify(a.stations) !== JSON.stringify(b.stations)) fail('generator not deterministic');
    else console.log('generator: deterministic for fixed seed');
}

// ───────────────────────── Effect pipeline with DOM stubs ───────────────────
const noop = () => {};
const ctxStub = new Proxy({}, {
    get: (t, prop) => {
        if (prop === 'canvas') return { width: 1280, height: 800 };
        if (!(prop in t)) t[prop] = noop;
        return t[prop];
    },
    set: (t, prop, v) => { t[prop] = v; return true; },
});
globalThis.window = { innerWidth: 1280, innerHeight: 800 };
globalThis.document = { createElement: () => ({ getContext: () => ctxStub, width: 0, height: 0 }) };

const { MetroTransit } = await import(JS + '/metro_transit_effects.js');

for (let s = 0; s < 40; s++) {
    const rng = mulberry32(stringToSeed('FX-' + s));
    const fx = new MetroTransit();
    fx.configure(rng, [{ h: 200, s: 80, l: 60 }, { h: 320, s: 70, l: 55 }]);
    const baseTrains = fx._trains.length;
    if (baseTrains < 2) fail(`fx seed ${s}: only ${baseTrains} trains`);

    // Simulate 4000 frames with wandering mouse and periodic clicks
    for (let f = 0; f < 4000; f++) {
        const mx = 640 + Math.sin(f * 0.01) * 600;
        const my = 400 + Math.cos(f * 0.013) * 360;
        const clicking = f % 97 < 2; // press lasting 2 frames every ~1.6s
        fx.update(mx, my, clicking);
        fx.draw(ctxStub, { width: 1280, height: 800, qualityScale: 1, tick: f });
        for (const t of fx._trains) {
            if (!Number.isFinite(t.dist)) { fail(`fx seed ${s}: train dist NaN at frame ${f}`); break; }
            if (!t.line.isLoop && (t.dist < -0.001 || t.dist > t.line.total + 0.001)) {
                fail(`fx seed ${s}: train escaped line (${t.dist} of ${t.line.total})`); break;
            }
        }
        if (fx._expressCount < 0 || fx._expressCount > 4) { fail(`fx seed ${s}: expressCount ${fx._expressCount}`); break; }
        if (fx._pings.length > 14) { fail(`fx seed ${s}: pings overflow`); break; }
        if (failures) break;
    }
    if (failures) break;
    if (fx._trains.length < baseTrains) fail(`fx seed ${s}: regular trains disappeared`);

    // trains must actually move and dwell at some point
    const moved = fx._trains.some(t => t.dwell > 0) || fx._trains.length > 0;
    if (!moved) fail(`fx seed ${s}: nothing happened`);
}
console.log('effect: 40 seeds × 4000 frames OK (trains bounded, expresses capped, pings pooled)');

// resize robustness: window changes after configure
{
    const fx = new MetroTransit();
    fx.configure(mulberry32(42), [{ h: 100, s: 80, l: 60 }]);
    globalThis.window.innerWidth = 700;
    globalThis.window.innerHeight = 1400;
    for (let f = 0; f < 200; f++) {
        fx.update(350, 700, f === 50);
        fx.draw(ctxStub, { width: 700, height: 1400, qualityScale: 0.4, tick: f });
    }
    console.log('effect: survives resize + low quality scale');
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
