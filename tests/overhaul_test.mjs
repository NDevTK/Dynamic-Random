// Functional tests for the overhaul modules (Node with DOM stubs).
const JS = new URL('../js', import.meta.url).pathname;
import { mulberry32, stringToSeed } from '../js/utils.js';

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

// ── DOM stubs ────────────────────────────────────────────────────────────────
const noop = () => {};
const ctxStub = new Proxy({}, {
    get: (t, prop) => {
        if (prop === 'canvas') return { width: 1280, height: 800 };
        if (!(prop in t)) t[prop] = noop;
        return t[prop];
    },
    set: (t, prop, v) => { t[prop] = v; return true; },
});
globalThis.window = {
    innerWidth: 1280, innerHeight: 800,
    matchMedia: () => ({ matches: false, addEventListener: noop }),
};
globalThis.document = {
    createElement: () => ({ getContext: () => ctxStub, style: {}, width: 0, height: 0,
        addEventListener: noop, appendChild: noop, classList: { add: noop, remove: noop } }),
    getElementById: () => ({ style: { setProperty: noop }, classList: { add: noop, remove: noop } }),
    addEventListener: noop, querySelector: () => null,
    body: { appendChild: noop, prepend: noop, classList: { add: noop, remove: noop } },
    head: { appendChild: noop }, visibilityState: 'visible',
};
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: noop, removeItem: noop };
// Node 22 exposes a read-only navigator getter — shadow it via defineProperty
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

// ── lore_codex ───────────────────────────────────────────────────────────────
{
    const { loreCodex } = await import(JS + '/lore_codex.js');
    const a = loreCodex.generate(mulberry32(777), 'Eldritch');
    const b = loreCodex.generate(mulberry32(777), 'Eldritch');
    if (a.epithet !== b.epithet || a.note !== b.note) fail('lore not deterministic');

    const blueprints = ['Classical', 'Eldritch', 'Digital', 'CoralReef', 'MoltenHeart', 'SonicScapes',
        'Papercraft', 'GlacialDrift', 'Aetherial', 'ChronoVerse', 'TotallyUnknownBlueprint'];
    const seen = new Set();
    for (let s = 0; s < 200; s++) {
        const bp = blueprints[s % blueprints.length];
        const lore = loreCodex.generate(mulberry32(stringToSeed('L' + s)), bp);
        if (!lore.epithet.startsWith('“The ') || lore.epithet.length < 10) fail(`bad epithet: ${lore.epithet}`);
        if (lore.note.length < 30) fail(`thin note: ${lore.note}`);
        seen.add(lore.epithet + lore.note);
    }
    if (seen.size < 150) fail(`lore too repetitive: ${seen.size}/200 unique`);
    console.log(`lore_codex: deterministic, ${seen.size}/200 unique entries`);
    console.log('  sample:', loreCodex.generate(mulberry32(42), 'AbyssalZone').epithet,
        '—', loreCodex.current.note);
}

// ── cursor familiar: every species, full behavior cycle ─────────────────────
{
    const { cursorFamiliar } = await import(JS + '/cursor_familiar.js');
    const { FAMILIAR_SPECIES, selectSpecies } = await import(JS + '/familiar_species.js');

    // Species selection must reach all 6 across seeds and respect determinism
    const counts = {};
    for (let s = 0; s < 600; s++) {
        const sp = selectSpecies(mulberry32(stringToSeed('S' + s)), 'Classical');
        counts[sp.name] = (counts[sp.name] || 0) + 1;
    }
    if (Object.keys(counts).length !== 6) fail(`species missing: ${JSON.stringify(counts)}`);
    // Affinity bias: oculus should be ~3x likelier in Eldritch than baseline
    let eldritchOculus = 0;
    for (let s = 0; s < 600; s++) {
        if (selectSpecies(mulberry32(stringToSeed('S' + s)), 'Eldritch').name === 'oculus') eldritchOculus++;
    }
    if (eldritchOculus < counts.oculus * 1.5) fail(`affinity bias weak: ${eldritchOculus} vs ${counts.oculus}`);
    console.log(`familiar: all 6 species selectable ${JSON.stringify(counts)}; Eldritch oculus bias ${counts.oculus}→${eldritchOculus}`);

    // Drive each species through follow → startle → doze
    for (let s = 0; s < FAMILIAR_SPECIES.length * 6; s++) {
        const rng = mulberry32(stringToSeed('F' + s));
        cursorFamiliar.configure(rng, [{ h: 210, s: 80, l: 60 }, { h: 30, s: 90, l: 65 }], 'Classical');
        let sawDoze = false;
        let sawStartle = false;
        for (let f = 0; f < 2600; f++) {
            // Phase 1: wander. Phase 2: click. Phase 3: hold still (doze).
            const moving = f < 900;
            const mx = moving ? 640 + Math.sin(f * 0.05) * 400 : 640;
            const my = moving ? 400 + Math.cos(f * 0.04) * 300 : 400;
            const clicking = f === 950 || f === 951;
            cursorFamiliar.update(mx, my, clicking);
            cursorFamiliar.draw(ctxStub, { width: 1280, height: 800, qualityScale: 1 });
            if (cursorFamiliar.mode === 'startle') sawStartle = true;
            if (cursorFamiliar.mode === 'doze') sawDoze = true;
            if (!Number.isFinite(cursorFamiliar.x) || !Number.isFinite(cursorFamiliar.y)) {
                fail(`${cursorFamiliar.species.name}: position NaN at frame ${f}`);
                break;
            }
            if (cursorFamiliar._trail.length > 70) { fail(`${cursorFamiliar.species.name}: trail overflow`); break; }
        }
        if (!sawStartle) fail(`${cursorFamiliar.species.name} (seed ${s}): never startled`);
        if (!sawDoze) fail(`${cursorFamiliar.species.name} (seed ${s}): never dozed`);
        if (failures) break;
    }
    if (!failures) console.log(`familiar: ${FAMILIAR_SPECIES.length * 6} runs × 2600 frames — follow/startle/doze all reached, positions finite, trail bounded`);
}

// ── midi_input message handling ──────────────────────────────────────────────
{
    const { midiInput } = await import(JS + '/midi_input.js');
    // CC learn order: 74 → slot 0, 71 → slot 1; mod wheel (cc 1) is special
    midiInput._onMessage({ data: new Uint8Array([0xB0, 74, 64]) });
    midiInput._onMessage({ data: new Uint8Array([0xB0, 71, 127]) });
    midiInput._onMessage({ data: new Uint8Array([0xB0, 1, 100]) });
    if (Math.abs(midiInput.knobs[0] - 64 / 127) > 1e-6) fail('cc 74 should learn slot 0');
    if (Math.abs(midiInput.knobs[1] - 1) > 1e-6) fail('cc 71 should learn slot 1');
    if (Math.abs(midiInput.modWheel - 100 / 127) > 1e-6) fail('mod wheel not tracked');
    // Notes accumulate and drain
    midiInput._onMessage({ data: new Uint8Array([0x90, 60, 100]) });
    midiInput._onMessage({ data: new Uint8Array([0x90, 64, 80]) });
    midiInput._onMessage({ data: new Uint8Array([0x80, 60, 0]) }); // note off ignored
    const notes = midiInput.drainNotes();
    if (notes.length !== 2 || notes[0].note !== 60) fail(`note drain wrong: ${JSON.stringify(notes)}`);
    if (midiInput.drainNotes().length !== 0) fail('notes not cleared after drain');
    // Pitch bend center and extremes
    midiInput._onMessage({ data: new Uint8Array([0xE0, 0, 64]) });
    if (Math.abs(midiInput.pitchBend) > 0.01) fail(`pitch bend center: ${midiInput.pitchBend}`);
    midiInput._onMessage({ data: new Uint8Array([0xE0, 127, 127]) });
    if (midiInput.pitchBend < 0.98) fail(`pitch bend max: ${midiInput.pitchBend}`);
    console.log('midi_input: CC learn, mod wheel, note drain, pitch bend OK');
}

// ── environment_sense init without browser APIs ─────────────────────────────
{
    const { environmentSense } = await import(JS + '/environment_sense.js');
    environmentSense.init(); // no getBattery, no wakeLock — must not throw
    await environmentSense.requestWakeLock(); // unsupported — must resolve quietly
    if (environmentSense.qualityCap !== 1) fail('default quality cap should be 1');
    console.log('environment_sense: degrades gracefully without browser APIs');
}

// ── familiar curiosity via the points-of-interest bus ───────────────────────
{
    const { pointsOfInterest } = await import(JS + '/points_of_interest.js');
    const { cursorFamiliar } = await import(JS + '/cursor_familiar.js');
    cursorFamiliar.configure(mulberry32(stringToSeed('CURIOUS')), [{ h: 210, s: 80, l: 60 }], 'Classical');

    // Settle at the cursor, then go idle while something interesting happens
    for (let f = 0; f < 200; f++) {
        pointsOfInterest.beginFrame();
        cursorFamiliar.update(600, 400, false);
    }
    for (let f = 0; f < 1400; f++) {
        pointsOfInterest.beginFrame();
        pointsOfInterest.publish(950, 300, 'train', 1);
        cursorFamiliar.update(600, 400, false);
    }
    const drift = Math.hypot(cursorFamiliar.x - 950, cursorFamiliar.y - 300);
    if (drift > 90) fail(`idle familiar should visit the point of interest (ended ${drift | 0}px away)`);
    if (!cursorFamiliar.curious) fail('familiar should report curiosity');
    if (cursorFamiliar.mode === 'doze') fail('a curious familiar must not doze');

    // Moving the cursor recalls it
    for (let f = 0; f < 600; f++) {
        pointsOfInterest.beginFrame();
        pointsOfInterest.publish(950, 300, 'train', 1);
        cursorFamiliar.update(600 + Math.sin(f * 0.3) * 60, 400, false);
    }
    if (Math.abs(cursorFamiliar.x - 950) < 200) fail('familiar should return to a moving cursor');
    console.log(`familiar curiosity: visits points of interest while idle (${drift | 0}px), returns when you move`);
}

// ── travelers: visitors from sibling universes ───────────────────────────────
{
    const { travelers } = await import(JS + '/travelers.js');
    const { pointsOfInterest } = await import(JS + '/points_of_interest.js');
    const { familiarMemory } = await import(JS + '/familiar_memory.js');

    travelers.configure(mulberry32(stringToSeed('VISITORS')), [{ h: 210, s: 80, l: 60 }], 'Classical');
    travelers._nextArrivalAt = 10; // don't wait 2-5 minutes in a test

    const memBefore = familiarMemory.totalActiveTicks;
    let arrived = false;
    let sawAlpha = 0;
    for (let f = 0; f < 600; f++) {
        pointsOfInterest.beginFrame();
        pointsOfInterest.publish(900, 500, 'planet', 1);
        travelers.update(400, 300, false);
        if (travelers.count > 0) {
            arrived = true;
            sawAlpha = Math.max(sawAlpha, travelers._travelers[0].alpha);
            const tr = travelers._travelers[0];
            if (!Number.isFinite(tr.x) || !Number.isFinite(tr.familiar.x)) { fail('traveler state NaN'); break; }
        }
    }
    if (!arrived) fail('a traveler should have arrived');
    if (sawAlpha < 0.9) fail(`traveler should fade fully in (peaked at ${sawAlpha.toFixed(2)})`);
    if (!travelers.current || !travelers.current.name) fail('HUD payload missing');
    if (!/^[A-Z]+-[A-Z]+-\d{4}(-(II|III|IV|V))?$/.test(travelers.current.homeSeed)) {
        fail(`home seed not shareable: "${travelers.current.homeSeed}"`);
    }
    if (familiarMemory.totalActiveTicks !== memBefore) {
        fail('traveler familiars must not feed the player familiar\'s memory');
    }

    // Force departure and confirm the fade-out clears everything
    travelers._travelers[0].leaveAt = 0;
    for (let f = 0; f < 800 && travelers.count > 0; f++) {
        pointsOfInterest.beginFrame();
        travelers.update(400, 300, false);
    }
    if (travelers.count !== 0) fail('traveler should depart and despawn');
    if (travelers.current !== null) fail('HUD payload should clear after departure');
    console.log(`travelers: arrive, roam (alpha ${sawAlpha.toFixed(2)}), shareable home seed, leave cleanly, memory untouched`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
