// Time-capsule tests: leaving notes, finding them on return, travelers
// ferrying them to their home worlds, Observatory markers, eviction, and
// persistence.
const JS = new URL('../js', import.meta.url).pathname;

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ── DOM/storage stubs ────────────────────────────────────────────────────────
const noop = () => {};
const ctxStub = new Proxy({}, {
    get: (o, p) => (p === 'canvas' ? { width: 680, height: 460 }
        : p === 'measureText' ? () => ({ width: 40 }) : (o[p] ??= noop)),
    set: (o, p, v) => { o[p] = v; return true; },
});
globalThis.window = {
    innerWidth: 1280, innerHeight: 800,
    matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop,
};
globalThis.document = {
    createElement: () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0,
        addEventListener: noop, appendChild: noop, remove: noop, focus: noop,
        classList: { add: noop, remove: noop } }),
    getElementById: () => ({ style: { setProperty: noop }, classList: { add: noop, remove: noop } }),
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

const stateMod = await import('../js/state.js');
const { timeCapsules } = await import('../js/time_capsules.js');
const { chartLayout, drawChart } = await import('../js/observatory_chart.js');

// ── 1. Leave a note; the bottle drifts; clicking opens and keeps it ─────────
{
    stateMod.setCurrentSeed('COSMIC-DRIFT-1234');
    timeCapsules._entries = [];
    timeCapsules._loaded = true;
    const cap = timeCapsules.leave('  hello, future me  ');
    if (!cap) fail('leave() returned nothing');
    if (cap.text !== 'hello, future me') fail(`text not trimmed: "${cap.text}"`);
    if (cap.seed !== 'COSMIC-DRIFT-1234' || cap.writtenIn !== cap.seed) fail('capsule seed wrong');
    if (timeCapsules.leave('') !== null) fail('empty notes should be rejected');
    if (!timeCapsules.capsuleSeeds().has('COSMIC-DRIFT-1234')) fail('capsuleSeeds missing the seed');
    if (timeCapsules._active.length !== 1) fail('bottle should drift immediately after sealing');

    // Drift stays finite and on-path
    for (let t = 0; t < 800; t++) {
        timeCapsules.update(0, 0, false);
        const a = timeCapsules._active[0];
        if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) { fail('bottle went non-finite'); break; }
    }
    timeCapsules.draw(ctxStub, { width: 1280, height: 800 });

    // Click the bottle: move the cursor onto it, then click-edge
    const a = timeCapsules._active[0];
    timeCapsules.update(a.x, a.y, false);
    timeCapsules.update(timeCapsules._active[0].x, timeCapsules._active[0].y, true);
    if (timeCapsules._active.length !== 0) fail('opened bottle should stop drifting');
    if (!cap.found) fail('opening should mark the capsule found');
    if (timeCapsules.capsuleSeeds().has('COSMIC-DRIFT-1234')) fail('found capsule should drop off the chart markers');
    if (!timeCapsules._provenance(cap).includes('You left this here')) fail(`provenance wrong: ${timeCapsules._provenance(cap)}`);
    console.log('capsules: seal → drift (800 finite ticks) → click → open → found');
}

// ── 2. Travelers ferry capsules home (and never spend randomness idly) ──────
{
    stateMod.setCurrentSeed('COSMIC-DRIFT-1234');
    timeCapsules._entries = [];
    const cap = timeCapsules.leave('ride along');

    // No candidates elsewhere / nothing to carry → rand must NOT be consumed
    stateMod.setCurrentSeed('EMPTY-VOID-0001');
    timeCapsules.onUniverse();
    const explodingRand = () => { throw new Error('rand consumed with no candidates'); };
    try {
        if (timeCapsules.ferryWith(explodingRand, 'Ilbra', 'AETHER-VEIL-7777') !== null) fail('nothing to ferry here');
    } catch (err) { fail(err.message); }

    // Back home, a willing traveler takes it
    stateMod.setCurrentSeed('COSMIC-DRIFT-1234');
    timeCapsules.onUniverse();
    const takeRand = (() => { let i = 0; return () => [0.1, 0.0][i++ % 2]; })(); // <0.5 → take, index 0
    const carried = timeCapsules.ferryWith(takeRand, 'Ilbra', 'AETHER-VEIL-7777');
    if (!carried || carried !== cap) fail('traveler should carry the capsule');
    if (cap.seed !== 'AETHER-VEIL-7777' || cap.carriedBy !== 'Ilbra') fail('ferry did not relocate the capsule');
    if (timeCapsules._active.length !== 0) fail('carried bottle must stop drifting here');

    // It now waits in the traveler's home universe
    stateMod.setCurrentSeed('AETHER-VEIL-7777');
    timeCapsules.onUniverse();
    if (timeCapsules._active.length !== 1) fail('capsule should drift in the traveler home world');
    if (!timeCapsules._provenance(cap).includes('carried here by Ilbra')) fail('provenance should credit the courier');

    // Found capsules are never ferried
    cap.found = true;
    if (timeCapsules.ferryWith(() => 0, 'Vesk', 'SOMEWHERE-ELSE-1111') !== null) fail('found capsules must stay put');
    console.log('capsules: ferried by Ilbra to AETHER-VEIL-7777, provenance credited, idle rand untouched');
}

// ── 3. Observatory markers + eviction + persistence ─────────────────────────
{
    const entries = [
        { seed: 'AETHER-VEIL-7777', blueprint: 'Aetherial', visits: 1, ts: 10, kind: 'visited' },
        { seed: 'VOID-MAW-9000', blueprint: 'Eldritch', visits: 1, ts: 20, kind: 'visited' },
    ];
    const layout = chartLayout(entries, 680, 460, 'VOID-MAW-9000', new Set(['AETHER-VEIL-7777']));
    const marked = layout.stars.find((s) => s.entry.seed === 'AETHER-VEIL-7777');
    const unmarked = layout.stars.find((s) => s.entry.seed === 'VOID-MAW-9000');
    if (!marked.hasCapsule || unmarked.hasCapsule) fail('capsule markers misplaced on the chart');
    drawChart(ctxStub, layout, 680, 460, marked); // marker + label path executes

    // Eviction: opened capsules go first, cap respected
    timeCapsules._entries = [];
    stateMod.setCurrentSeed('CAP-TEST-0001');
    for (let i = 0; i < 65; i++) {
        const c = timeCapsules.leave('note ' + i);
        c.writtenAt = i; // deterministic age
        if (i < 30) c.found = true;
    }
    timeCapsules._evict();
    if (timeCapsules._entries.length > 60) fail(`cap exceeded: ${timeCapsules._entries.length}`);
    const unfoundKept = timeCapsules._entries.filter((c) => !c.found).length;
    if (unfoundKept !== 35) fail(`all 35 unopened capsules should survive eviction, kept ${unfoundKept}`);
    timeCapsules._save();

    // Persistence across reload
    timeCapsules._entries = [];
    timeCapsules._loaded = false;
    timeCapsules.load();
    if (timeCapsules._entries.length === 0) fail('capsules should persist');
    console.log(`observatory marker drawn, eviction kept all unopened notes, ${timeCapsules._entries.length} persisted`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
