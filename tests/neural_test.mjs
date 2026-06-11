// Neuroevolution tests: the TinyBrain MLP, the traveler gene pool, fairness
// of the fitness function, and — the genuineness proof — convergence of the
// full evolutionary loop against a known objective.
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

const IN = 12, HID = 8, OUT = 4;
const GLEN = TinyBrain.genomeSize(IN, HID, OUT);

// ── 1. TinyBrain: shape, determinism, bounds, mutation, crossover ───────────
{
    if (GLEN !== IN * HID + HID + HID * OUT + OUT) fail(`genomeSize wrong: ${GLEN}`);

    const g1 = TinyBrain.randomGenome(mulberry32(99), IN, HID, OUT);
    const g2 = TinyBrain.randomGenome(mulberry32(99), IN, HID, OUT);
    if (g1.some((v, i) => v !== g2[i])) fail('randomGenome not deterministic for the same rng seed');

    const brain = new TinyBrain(IN, HID, OUT, g1);
    const inputs = [0.5, -0.3, 0.1, 0.9, -1, 1, 0.2, -0.2, 0, 0.7, 0.1, -0.4];
    const a = [...brain.think(inputs)];
    const b = [...brain.think(inputs)];
    if (a.some((v, i) => v !== b[i])) fail('think not deterministic');
    if (a.some((v) => !Number.isFinite(v) || v < -1 || v > 1)) fail(`outputs out of [-1,1]: ${a}`);

    const child = TinyBrain.mutate(g1, mulberry32(5), 0.12, 0.35);
    if (child.length !== g1.length) fail('mutation changed genome length');
    const changed = child.reduce((n, v, i) => n + (v !== g1[i] ? 1 : 0), 0);
    if (changed === 0 || changed > g1.length * 0.4) fail(`mutation changed ${changed}/${g1.length} weights`);
    if (g1.some((v, i) => v !== g2[i])) fail('mutate must not modify the parent genome');

    const other = TinyBrain.randomGenome(mulberry32(7), IN, HID, OUT);
    const x = TinyBrain.crossover(g1, other, mulberry32(11));
    let fromA = 0, fromB = 0, foreign = 0;
    for (let i = 0; i < x.length; i++) {
        if (x[i] === g1[i]) fromA++;
        else if (x[i] === other[i]) fromB++;
        else foreign++;
    }
    if (foreign > 0) fail(`crossover invented ${foreign} weights from neither parent`);
    if (fromA < GLEN * 0.25 || fromB < GLEN * 0.25) fail(`crossover unbalanced: ${fromA}/${fromB}`);
    if (TinyBrain.distance(g1, g1) !== 0) fail('distance(a,a) should be 0');
    if (!(TinyBrain.distance(g1, other) > 0.3)) fail('distance of random genomes should be large');
    console.log(`brain: ${GLEN}-weight recurrent MLP — deterministic, bounded; mutation ${changed} weights; crossover ${fromA}A/${fromB}B`);
}

// ── 2. Gene pool: record, cap, sampling, persistence, niching ───────────────
{
    for (let i = 0; i < 20; i++) {
        travelerMinds.record(TinyBrain.randomGenome(mulberry32(i), IN, HID, OUT), i * 0.04, i % 5);
    }
    if (travelerMinds.size > 12) fail(`pool exceeded cap: ${travelerMinds.size}`);
    const sampled = travelerMinds.sample(mulberry32(3), GLEN);
    if (!sampled || sampled.g.length !== GLEN) fail('sample should return a stored mind');
    if (travelerMinds.sample(mulberry32(3), 999) !== null) fail('sample must reject stale genome layouts');

    // Survives a "reload"
    travelerMinds._entries = [];
    travelerMinds._loaded = false;
    travelerMinds.load();
    if (travelerMinds.size === 0) fail('pool should persist across reloads');

    // Niching: a near-clone only replaces its twin when fitter
    store.clear();
    travelerMinds._entries = [];
    travelerMinds._loaded = true;
    const base = TinyBrain.randomGenome(mulberry32(50), IN, HID, OUT);
    travelerMinds.record(base, 0.5, 1);
    const twin = Float32Array.from(base, (v) => v + 0.004); // mean |Δ| ≈ 0.004 << niche threshold
    travelerMinds.record(twin, 0.3, 2);
    if (travelerMinds.size !== 1) fail(`weaker twin should be rejected (size ${travelerMinds.size})`);
    if (Math.abs(travelerMinds._entries[0].f - 0.5) > 1e-6) fail('weaker twin must not replace');
    travelerMinds.record(twin, 0.8, 2);
    if (travelerMinds.size !== 1) fail('fitter twin should replace, not duplicate');
    if (Math.abs(travelerMinds._entries[0].f - 0.8) > 1e-6) fail('fitter twin should take the niche');
    const distinct = TinyBrain.randomGenome(mulberry32(51), IN, HID, OUT);
    travelerMinds.record(distinct, 0.1, 0);
    if (travelerMinds.size !== 2) fail('a genuinely different mind should join the pool');
    console.log('gene pool: cap, persistence, stale-layout rejection, and niching (twins compete, strangers join)');
}

// ── 3. Fairness: identical behavior scores identically across opportunity ───
{
    const { travelers } = await import('../js/travelers.js');
    // Visit A: an attentive user, no points of interest anywhere
    const visitA = {
        statTicks: 1200, onscreenTicks: 1200, movingTicks: 600,
        cursorActiveTicks: 1000, nearActiveTicks: 500,    // near = 0.5
        poiOppTicks: 0, poiNearTicks: 0,                  // no opportunity
        cellsVisited: 7,                                  // explore = 0.5
    };
    // Visit B: user away, but a POI-rich universe — same behavioral quality
    const visitB = {
        statTicks: 1200, onscreenTicks: 1200, movingTicks: 600,
        cursorActiveTicks: 30, nearActiveTicks: 0,        // no opportunity
        poiOppTicks: 1000, poiNearTicks: 500,             // poi = 0.5
        cellsVisited: 7,
    };
    const fA = travelers._fitness(visitA);
    const fB = travelers._fitness(visitB);
    if (Math.abs(fA - fB) > 1e-9) fail(`fitness should be opportunity-normalized: ${fA} vs ${fB}`);
    if (Math.abs(fA - 0.5) > 1e-9) fail(`expected 0.5, got ${fA}`);
    // A mind hovering beside an idle cursor must not be punished as "frozen"
    const hoverer = {
        statTicks: 1200, onscreenTicks: 1200, movingTicks: 320,  // gentle motion
        cursorActiveTicks: 1000, nearActiveTicks: 900,
        poiOppTicks: 0, poiNearTicks: 0,
        cellsVisited: 3,
    };
    if (!(travelers._fitness(hoverer) > 0.5)) {
        fail(`an affectionate hoverer should score well, got ${travelers._fitness(hoverer)}`);
    }
    console.log(`fairness: equal behavior scores equally across opportunity (${fA.toFixed(3)}), hovering near you is rewarded`);
}

// ── 4. THE PROOF: the evolutionary loop optimizes a known objective ─────────
// Task: steer toward the sensed cursor direction. We evolve through the real
// pool (record/sample with niching) using the real operators (crossover +
// mutation, defaults untouched) and require error to genuinely fall.
{
    const SAMPLES = [];
    for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        SAMPLES.push({ tx: Math.cos(a), ty: Math.sin(a) });
    }
    const inputs = new Float32Array(IN);
    const evalErr = (brain) => {
        let err = 0;
        for (const s of SAMPLES) {
            inputs.fill(0);
            inputs[0] = s.tx;
            inputs[1] = s.ty;
            const out = brain.think(inputs);
            err += (out[0] - s.tx) ** 2 + (out[1] - s.ty) ** 2;
        }
        return err / (2 * SAMPLES.length);
    };
    const fitOf = (err) => 1 / (1 + 4 * err);

    store.clear();
    travelerMinds._entries = [];
    travelerMinds._loaded = true;
    const rand = mulberry32(stringToSeed('CONVERGE'));

    let gen0Best = Infinity;
    for (let i = 0; i < 12; i++) {
        const g = TinyBrain.randomGenome(rand, IN, HID, OUT);
        const err = evalErr(new TinyBrain(IN, HID, OUT, g));
        gen0Best = Math.min(gen0Best, err);
        travelerMinds.record(g, fitOf(err), 0);
    }

    let best = gen0Best;
    const GENERATIONS = 40;
    for (let gen = 1; gen <= GENERATIONS; gen++) {
        for (let c = 0; c < 12; c++) {
            // Same reproduction pathway travelers use
            const parentA = travelerMinds.sample(rand, GLEN);
            let parentB = travelerMinds.size > 1 && rand() < 0.5 ? travelerMinds.sample(rand, GLEN) : null;
            if (parentB === parentA) parentB = null;
            const baseG = parentB ? TinyBrain.crossover(parentA.g, parentB.g, rand) : parentA.g;
            const child = TinyBrain.mutate(baseG, rand);
            const err = evalErr(new TinyBrain(IN, HID, OUT, child));
            best = Math.min(best, err);
            travelerMinds.record(child, fitOf(err), gen);
        }
    }

    const poolBest = Math.max(...travelerMinds._entries.map((e) => e.f));
    if (!(best < gen0Best * 0.55)) {
        fail(`no real convergence: error ${gen0Best.toFixed(3)} → ${best.toFixed(3)} after ${GENERATIONS} generations`);
    }
    if (!(poolBest > fitOf(gen0Best) + 0.1)) {
        fail(`pool best fitness barely moved: ${fitOf(gen0Best).toFixed(3)} → ${poolBest.toFixed(3)}`);
    }
    const topGen = travelerMinds._entries.reduce((m, e) => Math.max(m, e.gen), 0);
    if (topGen < 5) fail(`pool should hold evolved generations, top is gen ${topGen}`);
    console.log(`convergence: steering error ${gen0Best.toFixed(3)} → ${best.toFixed(3)} over ${GENERATIONS} generations (pool best fitness ${poolBest.toFixed(3)}, deepest lineage gen ${topGen})`);
}

// ── 5. Integration: spawn descends from the pool, departure feeds it ────────
{
    const { travelers } = await import('../js/travelers.js');
    const { pointsOfInterest } = await import('../js/points_of_interest.js');

    store.clear();
    travelerMinds._entries = [];
    travelerMinds._loaded = true;
    const ancestor = TinyBrain.randomGenome(mulberry32(42), IN, HID, OUT);
    travelerMinds.record(ancestor, 9, 3);

    travelers.configure(mulberry32(stringToSeed('EVOLVE')), [{ h: 210, s: 80, l: 60 }], 'Classical');
    travelers._nextArrivalAt = 5;

    let sawOffspring = false;
    for (let attempt = 0; attempt < 10 && !sawOffspring; attempt++) {
        travelers._travelers.length = 0;
        travelers._spawn();
        const t = travelers._travelers[0];
        if (t.mindGen === 4) {
            sawOffspring = true;
            if (TinyBrain.distance(t.brain.genome, ancestor) === 0) fail('offspring should be mutated, not a clone');
        }
    }
    if (!sawOffspring) fail('descendants of the dominant ancestor never spawned');

    // Make this visitor genuinely distinct so its departure must ADD a pool
    // entry (a near-twin would merely compete for the ancestor's niche)
    const t = travelers._travelers[0];
    for (let k = 0; k < GLEN; k += 2) t.brain.genome[k] = (k % 4) - 1.5;

    const poolBefore = travelerMinds.size;
    for (let f = 0; f < 900; f++) {
        pointsOfInterest.beginFrame();
        pointsOfInterest.publish(700, 400, 'planet', 1);
        travelers.update(640 + Math.sin(f * 0.05) * 120, 400, false);
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
    if (!Number.isFinite(last.f) || last.f < 0 || last.f > 1) fail(`recorded fitness should be in [0,1]: ${last.f}`);
    console.log(`evolution: gen-4 offspring spawned from the ancestor, visit scored ${last.f}, pool grew to ${travelerMinds.size}`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
