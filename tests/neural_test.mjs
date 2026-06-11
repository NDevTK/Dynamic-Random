// Neuroevolution tests: the TinyBrain MLP, the traveler gene pool, and the
// evolution loop (departed visitors seed offspring with incremented
// generations).
const JS = new URL('../js', import.meta.url).pathname;

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ── DOM/storage stubs ────────────────────────────────────────────────────────
const noop = () => {};
const ctxStub = new Proxy({}, {
    get: (o, p) => (p === 'canvas' ? { width: 1280, height: 800 } : (o[p] ??= noop)),
    set: (o, p, v) => { o[p] = v; return true; },
});
globalThis.window = {
    innerWidth: 1280, innerHeight: 800,
    matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop,
};
globalThis.document = {
    createElement: () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0 }),
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

const { mulberry32, stringToSeed } = await import('../js/utils.js');
const { TinyBrain } = await import('../js/neural_brain.js');
const { travelerMinds } = await import('../js/traveler_minds.js');

// ── 1. TinyBrain: shape, determinism, bounds, mutation ──────────────────────
{
    const size = TinyBrain.genomeSize(10, 8, 4);
    if (size !== 10 * 8 + 8 + 8 * 4 + 4) fail(`genomeSize wrong: ${size}`);

    const g1 = TinyBrain.randomGenome(mulberry32(99), 10, 8, 4);
    const g2 = TinyBrain.randomGenome(mulberry32(99), 10, 8, 4);
    if (g1.some((v, i) => v !== g2[i])) fail('randomGenome not deterministic for the same rng seed');

    const brain = new TinyBrain(10, 8, 4, g1);
    const inputs = [0.5, -0.3, 0.1, 0.9, -1, 1, 0.2, -0.2, 0, 0.7];
    const a = [...brain.think(inputs)];
    const b = [...brain.think(inputs)];
    if (a.some((v, i) => v !== b[i])) fail('think not deterministic');
    if (a.some((v) => !Number.isFinite(v) || v < -1 || v > 1)) fail(`outputs out of [-1,1]: ${a}`);

    const child = TinyBrain.mutate(g1, mulberry32(5), 0.12, 0.35);
    if (child.length !== g1.length) fail('mutation changed genome length');
    const changed = child.reduce((n, v, i) => n + (v !== g1[i] ? 1 : 0), 0);
    if (changed === 0 || changed > g1.length * 0.4) fail(`mutation changed ${changed}/${g1.length} weights`);
    if (g1.some((v, i) => v !== g2[i])) fail('mutate must not modify the parent genome');
    console.log(`brain: ${size}-weight MLP — deterministic, bounded, mutation touched ${changed} weights`);
}

// ── 2. Gene pool: record, cap, fitness-weighted sampling, persistence ───────
{
    const len = TinyBrain.genomeSize(10, 8, 4);
    for (let i = 0; i < 20; i++) {
        travelerMinds.record(TinyBrain.randomGenome(mulberry32(i), 10, 8, 4), i * 0.5, i % 5);
    }
    if (travelerMinds.size > 12) fail(`pool exceeded cap: ${travelerMinds.size}`);
    const minF = Math.min(...travelerMinds._entries.map((e) => e.f));
    if (minF < 3.5) fail(`cap should evict weakest minds, kept fitness ${minF}`);

    const sampled = travelerMinds.sample(mulberry32(3), len);
    if (!sampled || sampled.g.length !== len) fail('sample should return a stored mind');
    if (travelerMinds.sample(mulberry32(3), 999) !== null) fail('sample must reject stale genome layouts');

    // Survives a "reload"
    travelerMinds._entries = [];
    travelerMinds._loaded = false;
    travelerMinds.load();
    if (travelerMinds.size === 0) fail('pool should persist across reloads');
    console.log(`gene pool: capped at ${travelerMinds.size}, weakest evicted, persists, stale layouts rejected`);
}

// ── 3. Evolution loop: departures feed the pool, offspring inherit ──────────
{
    const { travelers } = await import('../js/travelers.js');
    const { pointsOfInterest } = await import('../js/points_of_interest.js');

    // Plant one dominant ancestor so offspring are overwhelmingly likely
    store.clear();
    travelerMinds._entries = [];
    travelerMinds._loaded = false;
    const ancestor = TinyBrain.randomGenome(mulberry32(42), 10, 8, 4);
    travelerMinds.record(ancestor, 9, 3);

    travelers.configure(mulberry32(stringToSeed('EVOLVE')), [{ h: 210, s: 80, l: 60 }], 'Classical');
    travelers._nextArrivalAt = 5;

    // Several spawn attempts: at least one must be a gen-4 descendant
    let sawOffspring = false;
    for (let attempt = 0; attempt < 10 && !sawOffspring; attempt++) {
        travelers._travelers.length = 0;
        travelers._spawn();
        const t = travelers._travelers[0];
        if (t.mindGen === 4) {
            sawOffspring = true;
            const diffs = t.brain.genome.reduce((n, v, i) => n + (Math.abs(v - ancestor[i]) > 1e-9 ? 1 : 0), 0);
            if (diffs === 0) fail('offspring should be mutated, not a clone');
        }
    }
    if (!sawOffspring) fail('descendants of the dominant ancestor never spawned');

    // A full visit feeds the pool on departure
    const poolBefore = travelerMinds.size;
    const t = travelers._travelers[0];
    for (let f = 0; f < 900; f++) {
        pointsOfInterest.beginFrame();
        pointsOfInterest.publish(700, 400, 'planet', 1);
        travelers.update(640, 400, false);
        if (!Number.isFinite(t.x) || !Number.isFinite(t.vx)) { fail('brain-driven traveler went non-finite'); break; }
    }
    t.leaveAt = 0;
    for (let f = 0; f < 900 && travelers.count > 0; f++) {
        pointsOfInterest.beginFrame();
        travelers.update(640, 400, false);
    }
    if (travelers.count !== 0) fail('traveler should depart');
    if (travelerMinds.size <= poolBefore) fail('departure should record the mind in the gene pool');
    const last = travelerMinds._entries[travelerMinds._entries.length - 1];
    if (!Number.isFinite(last.f) || last.f < 0) fail(`recorded fitness invalid: ${last.f}`);
    console.log(`evolution: gen-4 offspring spawned from the ancestor, visit scored ${last.f}, pool grew to ${travelerMinds.size}`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
