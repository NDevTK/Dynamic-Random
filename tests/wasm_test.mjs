// Hand-forged WebAssembly tests: the forge emits valid binaries, the alchemy
// kernel matches its JS reference implementation CELL-FOR-CELL across many
// chaotic worlds and chemistries, conservation holds in closed systems, and
// the simulation is deterministic.
const JS = new URL('../js', import.meta.url).pathname;

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL:', msg); };

const { Asm, buildModule, uleb, sleb } = await import('../js/wasm_forge.js');
const { stepRef, buildKernelBytes, GRID_BASE, EL, PARAM } = await import('../js/alchemy_kernel.js');
const { mulberry32, stringToSeed } = await import('../js/utils.js');

// ── 1. Forge: encodings and a working module ─────────────────────────────────
{
    const cases = [[0, [0]], [127, [127]], [128, [0x80, 1]], [624485, [0xe5, 0x8e, 0x26]]];
    for (const [n, expect] of cases) {
        const got = uleb(n);
        if (got.join() !== expect.join()) fail(`uleb(${n}) = ${got}, want ${expect}`);
    }
    if (sleb(-1).join() !== '127') fail(`sleb(-1) = ${sleb(-1)}`);
    if (sleb(-64).join() !== '64') fail(`sleb(-64) = ${sleb(-64)}`);

    const A = new Asm();
    A.get(2); A.get(0); A.get(1); A.add(); A.store8();
    const bytes = buildModule({ params: 3, locals: 0, body: A.bytes });
    if (!WebAssembly.validate(bytes)) fail('trivial forge module is invalid');
    const mem = new WebAssembly.Memory({ initial: 1 });
    const { instance } = await WebAssembly.instantiate(bytes, { env: { mem } });
    instance.exports.step(19, 23, 5);
    if (new Uint8Array(mem.buffer)[5] !== 42) fail('forge module computed wrong result');
    console.log(`forge: LEB128 vectors, ${bytes.length}-byte module validates and runs`);
}

// ── 2. The kernel binary validates ───────────────────────────────────────────
const kernelBytes = buildKernelBytes();
if (!WebAssembly.validate(kernelBytes)) fail('alchemy kernel binary is INVALID');
console.log(`kernel: ${kernelBytes.length} hand-assembled bytes validate`);

// ── 3. Cross-validation: WASM ≡ JS reference, cell-for-cell ─────────────────
{
    const w = 96, h = 64;
    const size = GRID_BASE + w * h;
    const mem = new WebAssembly.Memory({ initial: Math.ceil(size / 65536) });
    const { instance } = await WebAssembly.instantiate(kernelBytes, { env: { mem } });
    const soup = [EL.EMPTY, EL.EMPTY, EL.EMPTY, EL.ROCK, EL.SAND, EL.SAND,
        EL.WATER, EL.WATER, EL.PLANT, EL.FIRE, EL.SMOKE, EL.LAVA];

    let totalTicks = 0;
    for (let worldSeed = 0; worldSeed < 5 && !failures; worldSeed++) {
        const rng = mulberry32(stringToSeed('WORLD-' + worldSeed));
        const gW = new Uint8Array(mem.buffer);
        const gJ = new Uint8Array(size);
        gW.fill(0, 0, size);
        for (let i = 0; i < 7; i++) {
            const v = Math.floor(rng() * 256);
            gW[i] = v; gJ[i] = v;
        }
        for (let i = 0; i < w * h; i++) {
            const v = soup[Math.floor(rng() * soup.length)];
            gW[GRID_BASE + i] = v;
            gJ[GRID_BASE + i] = v;
        }
        for (let tick = 0; tick < 50; tick++) {
            instance.exports.step(w, h, tick);
            stepRef(gJ, w, h, tick);
            totalTicks++;
            for (let i = 0; i < size; i++) {
                if (gW[i] !== gJ[i]) {
                    const idx = i - GRID_BASE;
                    fail(`world ${worldSeed} tick ${tick}: divergence at (${idx % w},${(idx / w) | 0}) wasm=0x${gW[i].toString(16)} js=0x${gJ[i].toString(16)}`);
                    tick = 99; break;
                }
            }
        }
    }
    if (!failures) console.log(`cross-validation: WASM ≡ JS reference across 5 worlds × 50 ticks (${totalTicks} compared grids)`);
}

// ── 4. Conservation: closed sand/water/rock worlds keep their mass ──────────
{
    const w = 80, h = 60;
    const size = GRID_BASE + w * h;
    const g = new Uint8Array(size);
    const rng = mulberry32(777);
    g[PARAM.WATER_FLOW] = 200;
    const count = () => {
        const c = { [EL.SAND]: 0, [EL.WATER]: 0, [EL.ROCK]: 0 };
        for (let i = 0; i < w * h; i++) {
            const el = g[GRID_BASE + i] & 15;
            if (el in c) c[el]++;
        }
        return c;
    };
    // Walls + floor, random sand/water inside
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const border = x === 0 || x === w - 1 || y === h - 1;
        const r = rng();
        g[GRID_BASE + y * w + x] = border ? EL.ROCK : r < 0.2 ? EL.SAND : r < 0.35 ? EL.WATER : EL.EMPTY;
    }
    const before = count();
    for (let tick = 0; tick < 200; tick++) stepRef(g, w, h, tick);
    const after = count();
    for (const el of [EL.SAND, EL.WATER, EL.ROCK]) {
        if (before[el] !== after[el]) fail(`element ${el} not conserved: ${before[el]} → ${after[el]}`);
    }
    // Everything should have settled out of the air by now
    let floating = 0;
    for (let y = 0; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const el = g[GRID_BASE + y * w + x] & 15;
        const below = g[GRID_BASE + (y + 1) * w + x] & 15;
        if (el === EL.SAND && below === EL.EMPTY) floating++;
    }
    if (floating > 0) fail(`${floating} sand grains still floating after 200 ticks`);
    console.log(`conservation: sand ${before[EL.SAND]}, water ${before[EL.WATER]}, rock ${before[EL.ROCK]} unchanged over 200 ticks; world settled`);
}

// ── 5. Determinism: same seed, same world, twice ─────────────────────────────
{
    const w = 64, h = 48;
    const size = GRID_BASE + w * h;
    const run = () => {
        const g = new Uint8Array(size);
        const rng = mulberry32(31337);
        for (let i = 0; i < 7; i++) g[i] = Math.floor(rng() * 256);
        for (let i = 0; i < w * h; i++) g[GRID_BASE + i] = Math.floor(rng() * 8);
        for (let tick = 0; tick < 80; tick++) stepRef(g, w, h, tick);
        return g;
    };
    const a = run();
    const b = run();
    for (let i = 0; i < size; i++) {
        if (a[i] !== b[i]) { fail('simulation not deterministic'); break; }
    }
    console.log('determinism: identical replay from identical seed');
}

// ── 6. Physics kernel: f64 module validates ──────────────────────────────────
const { buildPhysicsBytes, stepClothRef, stepSoftRef } = await import('../js/physics_kernel.js');
const { wasmPhysics } = await import('../js/wasm_physics.js');
{
    const bytes = buildPhysicsBytes();
    if (!WebAssembly.validate(bytes)) fail('physics module is INVALID');
    console.log(`physics kernel: ${bytes.length} hand-assembled f64 bytes validate (stepCloth + stepSoft)`);
}

// ── 7. Cloth: WASM ≡ JS reference, bit-exact over a turbulent run ────────────
{
    const mk = () => wasmPhysics.createClothGrid(24, 16, 12, 100, 50);
    const A = mk();
    const B = mk();
    const okA = await A.points._phys.ready;
    if (!okA) fail('cloth WASM instance failed to compile');
    B.points._phys.wasmCloth = null; // hold B on the JS reference forever
    B.points._phys.ready.then(() => { B.points._phys.wasmCloth = null; B.points._phys.wasmSoft = null; });

    // Identical perturbations through the public accessor API
    for (const S of [A, B]) {
        S.points[100].pinned = true;
        S.points[40].x += 7.25;
        S.points[41].oldY -= 3.5;
        wasmPhysics.applyForceAt(S.points, 4.5, -2.25, 160, 120, 90);
    }
    for (let f = 0; f < 150; f++) {
        wasmPhysics.stepCloth(A.points, A.constraints, 0.4, 0.985, 4);
        wasmPhysics.stepCloth(B.points, B.constraints, 0.4, 0.985, 4);
        if (f % 30 === 0) {
            for (const S of [A, B]) wasmPhysics.applyForceAt(S.points, -2 + f * 0.01, 1.5, 200, 140, 70);
        }
    }
    const bA = A.points._phys;
    const bB = B.points._phys;
    if (!bA.wasmCloth) fail('cloth A never used the WASM kernel');
    let mismatches = 0;
    for (let i = 0; i < bA.n; i++) {
        if (bA.xs[i] !== bB.xs[i] || bA.ys[i] !== bB.ys[i]
            || bA.oxs[i] !== bB.oxs[i] || bA.oys[i] !== bB.oys[i]) mismatches++;
    }
    if (mismatches > 0) fail(`cloth WASM diverged from reference at ${mismatches}/${bA.n} points`);
    // Pinned points never moved
    if (bA.xs[0] !== 100 || bA.ys[0] !== 50) fail('pinned corner moved');
    if (!Number.isFinite(bA.xs[200])) fail('cloth went non-finite');
    console.log(`cloth: WASM ≡ JS reference bit-exact at all ${bA.n} points over 150 turbulent steps (pins held)`);
}

// ── 8. Soft body: WASM ≡ JS reference with pressure, bit-exact ──────────────
{
    const mk = () => wasmPhysics.createSoftBody(300, 200, 60, 22);
    const A = mk();
    const B = mk();
    await A.points._phys.ready;
    B.points._phys.wasmSoft = null;
    B.points._phys.ready.then(() => { B.points._phys.wasmCloth = null; B.points._phys.wasmSoft = null; });

    for (const S of [A, B]) {
        S.points[5].oldX -= 6;
        wasmPhysics.applyForceAt(S.points, 0, -5, 300, 260, 80);
    }
    for (let f = 0; f < 200; f++) {
        wasmPhysics.stepSoftBody(A.points, A.constraints, 0.6, 0.3, 0.97, 5);
        wasmPhysics.stepSoftBody(B.points, B.constraints, 0.6, 0.3, 0.97, 5);
    }
    const bA = A.points._phys;
    const bB = B.points._phys;
    if (!bA.wasmSoft) fail('softbody A never used the WASM kernel');
    let mismatches = 0;
    for (let i = 0; i < bA.n; i++) {
        if (bA.xs[i] !== bB.xs[i] || bA.ys[i] !== bB.ys[i]) mismatches++;
    }
    if (mismatches > 0) fail(`softbody WASM diverged at ${mismatches}/${bA.n} points`);
    // Pressure keeps the blob inflated: mean radius from centroid stays > half rest
    let cx = 0, cy = 0;
    for (let i = 0; i < bA.n; i++) { cx += bA.xs[i]; cy += bA.ys[i]; }
    cx /= bA.n; cy /= bA.n;
    let meanR = 0;
    for (let i = 0; i < bA.n; i++) meanR += Math.hypot(bA.xs[i] - cx, bA.ys[i] - cy);
    meanR /= bA.n;
    if (!(meanR > 30)) fail(`blob collapsed: mean radius ${meanR}`);
    console.log(`softbody: WASM ≡ JS reference bit-exact at all ${bA.n} points over 200 steps (blob stayed inflated, r̄=${meanR.toFixed(1)})`);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nALL TESTS PASSED');
