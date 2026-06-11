// Architecture smoke test: every background architecture must survive
// init + 30 frames of update/draw against a stub BackgroundSystem, and the
// poetic descriptions list must stay in sync with the architecture list.
const JS = new URL('../js', import.meta.url).pathname;

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
                return (...a) => { assertFinite(String(p), a, a.length); return { addColorStop: noop }; };
            }
            if (p === 'createPattern') return () => ({ setTransform: noop });
            if (p === 'measureText') return () => ({ width: 12 });
            if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
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
globalThis.requestAnimationFrame = noop;

const { mulberry32, stringToSeed } = await import('../js/utils.js');
const { ALL_ARCHITECTURES, ARCH_CONSTRUCTOR_NAMES } = await import('../js/architecture_registry.js');
const { ARCH_DESCRIPTIONS } = await import('../js/arch_descriptions.js');

// ── 1. Descriptions stay in sync with the architecture list ─────────────────
if (ARCH_DESCRIPTIONS.length !== ALL_ARCHITECTURES.length) {
    fail(`ARCH_DESCRIPTIONS has ${ARCH_DESCRIPTIONS.length} entries but ALL_ARCHITECTURES has ${ALL_ARCHITECTURES.length} — HUD descriptions will misalign`);
} else {
    console.log(`descriptions: ${ARCH_DESCRIPTIONS.length} entries, in sync with the architecture list`);
}

// ── 2. Every architecture survives init + 30 frames ─────────────────────────
function makeSystem(rng) {
    return {
        ctx: makeCtxStub(),
        width: 1280, height: 800, tick: 0,
        hue: 200, rng,
        isMonochrome: false, isDark: false,
        speedMultiplier: 1, targetSpeed: 1, qualityScale: 1,
        isGravityWell: false, audioHueShift: 0, epochIndex: 0,
        shockwaves: [], sparks: [], trail: [],
        spatialGrid: { clear: noop, insert: noop, getNearby: () => [], updateDimensions: noop },
        offscreenCanvas: { width: 1280, height: 800 },
        offscreenCtx: makeCtxStub(),
        canvas: { width: 1280, height: 800, style: {} },
        deviceTilt: { x: 0, y: 0 }, deviceShake: 0, multiMonitorX: 0,
        gamepad: { connected: false, leftStick: { x: 0, y: 0 }, rightStick: { x: 0, y: 0 }, triggers: { left: 0, right: 0 }, buttons: {} },
        mic: { active: false, bass: 0, treble: 0, volume: 0, beat: false },
        tabSync: { tabCount: 0, isLeader: false },
        speech: { active: false, lastWord: '', words: [] },
        camera: { active: false },
        pinchScale: 1, touchRotation: 0,
        createShockwave: noop,
    };
}

let passed = 0;
for (let i = 0; i < ALL_ARCHITECTURES.length; i++) {
    const name = ARCH_CONSTRUCTOR_NAMES[i];
    try {
        const arch = ALL_ARCHITECTURES[i]();
        const system = makeSystem(mulberry32(stringToSeed(name)));
        arch.init(system);
        for (let f = 0; f < 30; f++) {
            system.tick++;
            if (f === 10) system.shockwaves.push({ x: 640, y: 400, radius: 50, maxRadius: 800, speed: 10, strength: 2, alpha: 1 });
            arch.update(system);
            arch.draw(system);
        }
        passed++;
    } catch (err) {
        fail(`architecture "${name}" threw: ${err.message}`);
    }
}
console.log(`runtime smoke: ${passed}/${ALL_ARCHITECTURES.length} architectures survive init + 30 frames (with a shockwave)`);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
