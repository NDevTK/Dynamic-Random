// Observatory tests: the star-chart layout is deterministic and meaningful,
// and the journal correctly merges visited universes with met-travelers'
// home worlds.
const JS = new URL('../js', import.meta.url).pathname;

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ── DOM/storage stubs ────────────────────────────────────────────────────────
const noop = () => {};
const ctxStub = new Proxy({}, {
    get: (o, p) => (p === 'canvas' ? { width: 680, height: 460 } : (p === 'measureText' ? () => ({ width: 40 }) : (o[p] ??= noop))),
    set: (o, p, v) => { o[p] = v; return true; },
});
globalThis.window = {
    innerWidth: 1280, innerHeight: 800,
    matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop,
};
globalThis.document = {
    createElement: () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0,
        addEventListener: noop, appendChild: noop, classList: { add: noop, remove: noop } }),
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

const { chartLayout, drawChart, hitTest, blueprintHue } = await import('../js/observatory_chart.js');
const { journal } = await import('../js/journal.js');
const { loreCodex } = await import('../js/lore_codex.js');
const { mulberry32 } = await import('../js/utils.js');

// ── 1. Layout: deterministic, bounded, lineages cluster and link ────────────
{
    const entries = [
        { seed: 'COSMIC-DRIFT-1234', blueprint: 'Classical', visits: 3, ts: 100, kind: 'visited' },
        { seed: 'COSMIC-DRIFT-1234-II', blueprint: 'Classical', visits: 1, ts: 200, kind: 'visited' },
        { seed: 'COSMIC-DRIFT-1234-III', blueprint: 'Classical', visits: 1, ts: 300, kind: 'visited' },
        { seed: 'VOID-MAW-9000', blueprint: 'Eldritch', visits: 1, ts: 250, kind: 'visited' },
        { seed: 'AETHER-VEIL-5555', metName: 'Ilbra', ts: 400, kind: 'met' },
    ];
    const a = chartLayout(entries, 680, 460, 'VOID-MAW-9000');
    const b = chartLayout(entries, 680, 460, 'VOID-MAW-9000');
    for (let i = 0; i < a.stars.length; i++) {
        if (a.stars[i].x !== b.stars[i].x || a.stars[i].y !== b.stars[i].y) { fail('layout not deterministic'); break; }
    }
    for (const s of a.stars) {
        if (s.x < 0 || s.x > 680 || s.y < 0 || s.y > 460) fail(`star out of bounds: ${s.x},${s.y}`);
    }
    // Lineage: three generations → two links, descendants near the founder
    if (a.lineageLinks.length !== 2) fail(`expected 2 lineage links, got ${a.lineageLinks.length}`);
    const founder = a.stars.find((s) => s.entry.seed === 'COSMIC-DRIFT-1234');
    const gen3 = a.stars.find((s) => s.entry.seed === 'COSMIC-DRIFT-1234-III');
    const d = Math.hypot(founder.x - gen3.x, founder.y - gen3.y);
    if (d > 80) fail(`gen III drifted ${d.toFixed(0)}px from its founder`);
    // Journey: 4 visited stars in time order → 3 links, met stars excluded
    if (a.journeyLinks.length !== 3) fail(`expected 3 journey links, got ${a.journeyLinks.length}`);
    if (a.journeyLinks[0].a.entry.ts > a.journeyLinks[0].b.entry.ts) fail('journey not time-ordered');
    // Met star is hollow, current star flagged
    const met = a.stars.find((s) => s.entry.seed === 'AETHER-VEIL-5555');
    if (!met.met) fail('met entry should be a hollow star');
    if (!a.stars.find((s) => s.current && s.entry.seed === 'VOID-MAW-9000')) fail('current seed not highlighted');
    // Different blueprints land on different hues
    if (blueprintHue('Classical') === blueprintHue('Eldritch')) fail('blueprint hues should differ');
    // Render + hit-test paths execute
    drawChart(ctxStub, a, 680, 460, null);
    const hit = hitTest(a, founder.x + 3, founder.y - 3);
    if (!hit || hit.entry.seed !== 'COSMIC-DRIFT-1234') fail('hitTest missed the founder star');
    if (hitTest(a, -200, -200) !== null) fail('hitTest should miss empty sky');
    console.log(`layout: deterministic, ${a.stars.length} stars bounded, lineage clustered (gen III ${d.toFixed(0)}px from founder), journey time-ordered`);
}

// ── 2. Journal: met homes chart as hollow stars, upgrade on real visit ──────
{
    store.clear();
    journal._entries = [];
    journal.init();
    loreCodex.generate(mulberry32(8), 'Aetherial');
    journal.recordMet('AETHER-VEIL-5555-II', 'Ilbra');
    journal.recordMet('AETHER-VEIL-5555-II', 'Ilbra'); // duplicate ignored
    if (journal._entries.length !== 1) fail('duplicate met entry should be ignored');
    if (journal._entries[0].kind !== 'met') fail('met entry kind wrong');
    if (journal._entries[0].generation !== 2) fail('met entry lineage not parsed');

    // Actually visiting the traveler's home upgrades the hollow star
    journal.record('AETHER-VEIL-5555-II', 'Aetherial');
    if (journal._entries.length !== 1) fail('visit should upgrade, not duplicate');
    const en = journal._entries[0];
    if (en.kind !== 'visited' || en.visits !== 1) fail(`upgrade failed: ${JSON.stringify(en)}`);
    if (!en.epithet || !en.epithet.startsWith('“')) fail('upgraded entry missing epithet');

    // A met entry never blocks normal visited bookkeeping
    journal.record('AETHER-VEIL-5555-II', 'Aetherial');
    if (journal._entries[0].visits !== 2) fail('revisit count broken after upgrade');
    console.log('journal: met homes chart once, upgrade to visited on arrival, revisit counting intact');
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
