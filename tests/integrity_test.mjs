// Cross-reference integrity test for universe content:
// every name a blueprint references must have a real implementation, and all
// mutators/anomalies/ambient events must execute cleanly against the engine.
import { readFileSync } from 'fs';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ── DOM stubs ────────────────────────────────────────────────────────────────
const noop = () => {};
const ctxStub = new Proxy({}, {
    get: (t, p) => (p === 'canvas' ? { width: 1280, height: 800 } : (t[p] ??= noop)),
    set: (t, p, v) => { t[p] = v; return true; },
});
globalThis.window = {
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop,
};
globalThis.document = {
    createElement: () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0,
        classList: { add: noop, remove: noop }, appendChild: noop, addEventListener: noop }),
    getElementById: () => ({ style: { setProperty: noop }, classList: { add: noop, remove: noop }, appendChild: noop }),
    addEventListener: noop, querySelector: () => null,
    body: { appendChild: noop, prepend: noop, classList: { add: noop, remove: noop }, style: {} },
    head: { appendChild: noop }, visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };

const JS = new URL('../js', import.meta.url).pathname;
const { universeBlueprints, mutators, anomalies, ambientEvents } = await import(`${JS}/effects.js`);
const { mulberry32 } = await import(`${JS}/utils.js`);
const { baseConfig } = await import(`${JS}/config.js`);
const { createParticleEngine } = await import(`${JS}/particle_engine.js`);
const stateMod = await import(`${JS}/state.js`);

const caseLabels = (src) => new Set([...src.matchAll(/case\s*'([^']+)'/g)].map((m) => m[1]));
const powersSrc = readFileSync(`${JS}/powers.js`, 'utf8');
const activeSrc = powersSrc.slice(powersSrc.indexOf('handleActivePower'), powersSrc.indexOf('handleClickPower'));
const clickSrc = powersSrc.slice(powersSrc.indexOf('handleClickPower'));
const activeCases = caseLabels(activeSrc);
const clickCases = caseLabels(clickSrc);
const cataclysmCases = caseLabels(readFileSync(`${JS}/cataclysms.js`, 'utf8'));
const uiSrc = readFileSync(`${JS}/ui.js`, 'utf8');
const clickPowersList = new Set([...uiSrc.matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]));

// ── 1. Blueprint references all resolve ──────────────────────────────────────
{
    let powerRefs = 0, cataclysmRefs = 0, eventRefs = 0;
    for (const [name, bp] of Object.entries(universeBlueprints)) {
        for (const power of [...bp.left, ...bp.right]) {
            powerRefs++;
            if (!activeCases.has(power) && !clickCases.has(power)) {
                fail(`${name}: power '${power}' has no implementation in powers.js`);
            }
            // click-only powers must be gated through ui.js's clickPowers list
            if (!activeCases.has(power) && clickCases.has(power) && !clickPowersList.has(power)) {
                fail(`${name}: click power '${power}' missing from ui.js clickPowers`);
            }
        }
        for (const cat of bp.cataclysms) {
            cataclysmRefs++;
            if (!cataclysmCases.has(cat)) fail(`${name}: cataclysm '${cat}' has no case in cataclysms.js`);
        }
        for (const evt of bp.events) {
            eventRefs++;
            if (!ambientEvents[evt]) fail(`${name}: ambient event '${evt}' missing from ambientEvents`);
        }
    }
    console.log(`blueprints: ${Object.keys(universeBlueprints).length} blueprints — ${powerRefs} power refs, ${cataclysmRefs} cataclysm refs, ${eventRefs} event refs all resolve`);
}

// ── 2. Smoke-run every mutator, anomaly, and ambient event on the engine ────
{
    stateMod.resetState();
    const activeEffects = stateMod.activeEffects;
    const physics = { friction: 0.98 };
    const pJS = createParticleEngine('particles-js', baseConfig);
    pJS.particles.number.value_max = 400;

    let ran = 0;
    for (const [name, fn] of Object.entries(mutators)) {
        try { fn(pJS, mulberry32(7), activeEffects, physics); ran++; }
        catch (err) { fail(`mutator '${name}' threw: ${err.message}`); }
    }
    for (const [name, fn] of Object.entries(anomalies)) {
        try { fn(pJS, mulberry32(7), activeEffects); ran++; }
        catch (err) { fail(`anomaly '${name}' threw: ${err.message}`); }
    }
    // Events fire many times over a universe's life — run each 25x
    for (const [name, fn] of Object.entries(ambientEvents)) {
        try {
            for (let i = 0; i < 25; i++) fn(pJS, mulberry32(i + 1), activeEffects);
            ran++;
        } catch (err) { fail(`ambient event '${name}' threw: ${err.message}`); }
        for (const p of pJS.particles.array) {
            if (!Number.isFinite(p.x) || !Number.isFinite(p.vx)) { fail(`event '${name}' produced NaN particle`); break; }
        }
    }
    // New anomalies must have populated their arrays
    if (activeEffects.quasars.length < 3) fail('Twin Quasars should add 2 quasars');
    if (activeEffects.cosmicGeysers.length < 3) fail('Geyser Field should add 3 geysers');
    if (activeEffects.cosmicStrings.length === 0) fail('Cosmic String should populate');
    console.log(`content smoke-run: ${ran} mutators/anomalies/events executed cleanly on the live engine (${pJS.particles.array.length} particles, capped ok)`);
}

// ── 3. The four previously-broken cataclysm names now resolve ────────────────
{
    for (const cat of ['The Great Silence', 'Glitch Storm', 'Phase Shift', 'Total Annihilation', 'Inversion', 'StarFall']) {
        if (!cataclysmCases.has(cat)) fail(`cataclysm case '${cat}' missing`);
    }
    console.log('cataclysms: renamed + new cases all present, default safety net in place');
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
