// Registry-wide smoke test: every interactive effect must survive
// configure → 60 frames of update/draw with the orchestrator's real call
// signature. The canvas stub validates dimensions like a browser does, so the
// createImageData(NaN) class of crash fails here instead of in production.
import { readFileSync } from 'fs';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

const noop = () => {};

function assertFinite(name, args, count) {
    for (let i = 0; i < count; i++) {
        if (!Number.isFinite(args[i])) {
            throw new TypeError(`${name}: argument ${i} is ${args[i]} (browser would throw)`);
        }
    }
}

function makeCtxStub() {
    const t = {};
    return new Proxy(t, {
        get: (o, p) => {
            if (p === 'canvas') return { width: 1280, height: 800 };
            if (p === 'createImageData') return (...a) => {
                assertFinite('createImageData', a, 2);
                const w = Math.max(1, a[0] | 0), h = Math.max(1, a[1] | 0);
                return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
            };
            if (p === 'getImageData') return (...a) => {
                assertFinite('getImageData', a, 4);
                const w = Math.max(1, a[2] | 0), h = Math.max(1, a[3] | 0);
                return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
            };
            if (p === 'putImageData') return (img, ...a) => assertFinite('putImageData', a, 2);
            if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createConicGradient') {
                return (...a) => {
                    assertFinite(String(p), a, a.length);
                    return { addColorStop: noop };
                };
            }
            if (p === 'createPattern') return () => ({ setTransform: noop });
            if (p === 'measureText') return () => ({ width: 12 });
            if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
            if (p === 'drawImage') return noop;
            if (!(p in o)) o[p] = noop;
            return o[p];
        },
        set: (o, p, v) => { o[p] = v; return true; },
    });
}

globalThis.window = {
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop,
};
globalThis.document = {
    createElement: () => {
        const el = { style: {}, width: 0, height: 0, classList: { add: noop, remove: noop },
            appendChild: noop, addEventListener: noop };
        el.getContext = () => makeCtxStub();
        return el;
    },
    getElementById: () => ({ style: { setProperty: noop }, classList: { add: noop, remove: noop }, appendChild: noop }),
    addEventListener: noop, querySelector: () => null,
    body: { appendChild: noop, prepend: noop, classList: { add: noop, remove: noop }, style: {} },
    head: { appendChild: noop }, visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.Path2D = class { moveTo() {} lineTo() {} rect() {} arc() {} closePath() {} quadraticCurveTo() {} bezierCurveTo() {} addPath() {} };

const JS = new URL('../js', import.meta.url).pathname;
const { mulberry32, stringToSeed } = await import(`${JS}/utils.js`);

// ── 1. Source scan: registered effects must use the effect signature ────────
{
    const registrySrc = readFileSync(`${JS}/effect_registry.js`, 'utf8');
    const files = [...registrySrc.matchAll(/from '\.\/([a-z_]+)\.js'/g)].map((m) => m[1]);
    let scanned = 0;
    for (const f of files) {
        const src = readFileSync(`${JS}/${f}.js`, 'utf8');
        scanned++;
        if (/\n    update\(system\)/.test(src)) {
            fail(`${f}.js uses the ARCHITECTURE update(system) signature but is registered as an interactive effect`);
        }
        if (/system\._clickRegistered/.test(src)) {
            fail(`${f}.js reads system._clickRegistered, which no longer exists anywhere`);
        }
    }
    console.log(`signature scan: ${scanned} registered effect modules use the (mx, my, isClicking) contract`);
}

// ── 2. Runtime: configure + 60 frames of update/draw for every effect ───────
{
    const { EFFECT_REGISTRY } = await import(`${JS}/effect_registry.js`);
    const ctx = makeCtxStub();
    const hues = [{ h: 210, s: 80, l: 60 }, { h: 30, s: 90, l: 65 }, { h: 130, s: 70, l: 55 }];
    const system = { width: 1280, height: 800, qualityScale: 1, tick: 0, hue: 200, rng: Math.random, speedMultiplier: 1 };

    let passed = 0;
    for (const entry of EFFECT_REGISTRY) {
        const name = entry.instance.constructor.name;
        try {
            entry.instance.configure(mulberry32(stringToSeed(name)), hues);
            for (let f = 0; f < 60; f++) {
                system.tick = f;
                const mx = 640 + Math.sin(f * 0.2) * 500;
                const my = 400 + Math.cos(f * 0.17) * 350;
                const clicking = f === 20 || f === 21 || f === 45;
                entry.instance.update(mx, my, clicking);
                entry.instance.draw(ctx, system);
            }
            passed++;
        } catch (err) {
            fail(`effect "${name}" threw during simulated frames: ${err.message}`);
        }
    }
    console.log(`runtime smoke: ${passed}/${EFFECT_REGISTRY.length} effects survive configure + 60 frames (update AND draw, with clicks)`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
