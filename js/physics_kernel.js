/**
 * @file physics_kernel.js
 * @description The Verlet cloth/soft-body solver, twice: a typed-array JS
 * reference (the spec and the fallback) and an f64 WebAssembly transcription
 * emitted through wasm_forge.js. Both run over the same memory and use IEEE
 * double arithmetic in the same operation order, so they are BIT-EXACT —
 * tests cross-validate every coordinate with strict float equality, and the
 * WASM kernel can take over from the JS one mid-simulation with zero
 * trajectory change.
 *
 * Per-structure memory layout (8-byte aligned planes):
 *   pin  : n   × u8    point pinned flags
 *   x,y  : n   × f64   positions
 *   ox,oy: n   × f64   previous positions (Verlet)
 *   ci   : 2m  × i32   constraint endpoint indices
 *   rest : m   × f64   constraint rest lengths
 */

import { Asm, buildModule } from './wasm_forge.js';

const align8 = (n) => (n + 7) & ~7;

/** Compute plane offsets for n points / m constraints. */
export function layout(n, m) {
    const pin = 0;
    const x = align8(n);
    const y = x + n * 8;
    const ox = y + n * 8;
    const oy = ox + n * 8;
    const ci = oy + n * 8;
    const rest = align8(ci + m * 8);
    return { pin, x, y, ox, oy, ci, rest, bytes: rest + m * 8 };
}

// ───────────────────────── JS reference (the spec) ──────────────────────────

/** Shared constraint relaxation — transcribed by the WASM emitter below. */
function satisfyRef(b, iterations) {
    const { n, m, xs, ys, pin, ci, rest } = b;
    for (let iter = 0; iter < iterations; iter++) {
        for (let c = 0; c < m; c++) {
            const i = ci[c * 2];
            const j = ci[c * 2 + 1];
            const dx = xs[j] - xs[i];
            const dy = ys[j] - ys[i];
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) dist = 0.0001;
            const diff = (dist - rest[c]) / dist * 0.5;
            const offX = dx * diff;
            const offY = dy * diff;
            if (pin[i] === 0) { xs[i] += offX; ys[i] += offY; }
            if (pin[j] === 0) { xs[j] -= offX; ys[j] -= offY; }
        }
    }
}

export function stepClothRef(b, gravity, damping, iterations) {
    const { n, xs, ys, oxs, oys, pin } = b;
    for (let i = 0; i < n; i++) {
        if (pin[i] !== 0) continue;
        const vx = (xs[i] - oxs[i]) * damping;
        const vy = (ys[i] - oys[i]) * damping;
        oxs[i] = xs[i];
        oys[i] = ys[i];
        xs[i] += vx;
        ys[i] += vy + gravity;
    }
    satisfyRef(b, iterations);
}

export function stepSoftRef(b, pressure, gravity, damping, iterations, cenX, cenY) {
    const { n, xs, ys, oxs, oys, pin } = b;
    for (let i = 0; i < n; i++) {
        if (pin[i] !== 0) continue;
        const vx = (xs[i] - oxs[i]) * damping;
        const vy = (ys[i] - oys[i]) * damping;
        const dx = xs[i] - cenX;
        const dy = ys[i] - cenY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) dist = 1;
        const px = (dx / dist) * pressure;
        const py = (dy / dist) * pressure;
        oxs[i] = xs[i];
        oys[i] = ys[i];
        xs[i] += vx + px;
        ys[i] += vy + py + gravity;
    }
    satisfyRef(b, iterations);
}

// ───────────────────────── WASM transcription ───────────────────────────────
// stepCloth(n, m, iters, pPin, pX, pY, pOx, pOy, pCi, pRest, gravity, damping)
// stepSoft (… same …, gravity, damping, pressure, cenX, cenY)
//
// Param/local indices (i32 unless noted):
//   0 n, 1 m, 2 iters, 3 pPin, 4 pX, 5 pY, 6 pOx, 7 pOy, 8 pCi, 9 pRest,
//   10 gravity(f64), 11 damping(f64), [12 pressure, 13 cenX, 14 cenY](f64)
// then locals: i, iter, c, j, a (addr scratch), b (addr scratch)  [i32]
//              vx, vy, dx, dy, dist, t1, t2  [f64]

function emitIntegrate(A, L, soft) {
    const { I, A1, A2, VX, VY, DX, DY, DIST, T1 } = L;
    const G = 10, DAMP = 11, PRESS = 12, CENX = 13, CENY = 14;
    A.const(0).set(I);
    A.block('intEnd', () => {
        A.loop('intLoop', () => {
            A.get(I).get(0).geS().brIf('intEnd');
            A.block('skip', () => {
                // pinned?
                A.get(3).get(I).add().load8();
                A.brIf('skip');
                // a = pX + i*8 ; b = pOx + i*8 (reused for the y plane via offsets)
                A.get(I).const(3).shl().set(A1);
                // vx = (x - ox) * damping
                A.get(4).get(A1).add().tee(A2).loadF();
                A.get(6).get(A1).add().loadF();
                A.fSub().get(DAMP).fMul().set(VX);
                // vy = (y - oy) * damping
                A.get(5).get(A1).add().loadF();
                A.get(7).get(A1).add().loadF();
                A.fSub().get(DAMP).fMul().set(VY);
                if (soft) {
                    // dx = x - cenX; dy = y - cenY
                    A.get(A2).loadF().get(CENX).fSub().set(DX);
                    A.get(5).get(A1).add().loadF().get(CENY).fSub().set(DY);
                    // dist = sqrt(dx*dx + dy*dy); if (dist == 0) dist = 1
                    A.get(DX).get(DX).fMul().get(DY).get(DY).fMul().fAdd().fSqrt().set(DIST);
                    A.get(DIST).constF(0).fEq();
                    A.iff('d0', () => { A.constF(1).set(DIST); });
                    // vx += (dx/dist)*pressure ; vy += (dy/dist)*pressure
                    // (folded so x += vx + px keeps the reference's add order:
                    //  t1 = vx + px; later x += t1)
                    A.get(VX).get(DX).get(DIST).fDiv().get(PRESS).fMul().fAdd().set(VX);
                    A.get(VY).get(DY).get(DIST).fDiv().get(PRESS).fMul().fAdd().set(VY);
                }
                // ox = x; oy = y
                A.get(6).get(A1).add().get(A2).loadF().storeF();
                A.get(7).get(A1).add().get(5).get(A1).add().loadF().storeF();
                // x += vx            (cloth)   |  x += (vx + px)   (soft, folded)
                A.get(A2).get(A2).loadF().get(VX).fAdd().storeF();
                // y += vy + gravity  — t1 = vy + gravity, y = y + t1
                A.get(VY).get(G).fAdd().set(T1);
                A.get(5).get(A1).add().tee(A2);
                A.get(A2).loadF().get(T1).fAdd().storeF();
            });
            A.get(I).const(1).add().set(I);
            A.br('intLoop');
        });
    });
}

function emitSatisfy(A, L) {
    const { ITER, C, I, J, A1, A2, DX, DY, DIST, T1, T2 } = L;
    A.const(0).set(ITER);
    A.block('itEnd', () => {
        A.loop('itLoop', () => {
            A.get(ITER).get(2).geS().brIf('itEnd');
            A.const(0).set(C);
            A.block('cEnd', () => {
                A.loop('cLoop', () => {
                    A.get(C).get(1).geS().brIf('cEnd');
                    // i = ci[2c], j = ci[2c+1]
                    A.get(8).get(C).const(3).shl().add().tee(A1).load32().set(I);
                    A.get(A1).load32(4).set(J);
                    // dx = x[j] - x[i]; dy = y[j] - y[i]
                    A.get(4).get(J).const(3).shl().add().loadF();
                    A.get(4).get(I).const(3).shl().add().loadF();
                    A.fSub().set(DX);
                    A.get(5).get(J).const(3).shl().add().loadF();
                    A.get(5).get(I).const(3).shl().add().loadF();
                    A.fSub().set(DY);
                    // dist = sqrt(dx²+dy²); if 0 → 0.0001
                    A.get(DX).get(DX).fMul().get(DY).get(DY).fMul().fAdd().fSqrt().set(DIST);
                    A.get(DIST).constF(0).fEq();
                    A.iff('z', () => { A.constF(0.0001).set(DIST); });
                    // diff = (dist - rest[c]) / dist * 0.5 → t1=offX, t2=offY
                    A.get(DIST);
                    A.get(9).get(C).const(3).shl().add().loadF();
                    A.fSub().get(DIST).fDiv().constF(0.5).fMul().set(T1);
                    A.get(DY).get(T1).fMul().set(T2);   // offY
                    A.get(DX).get(T1).fMul().set(T1);   // offX (t1 reused)
                    // if !pin[i]: x[i]+=offX; y[i]+=offY
                    A.get(3).get(I).add().load8().eqz();
                    A.iff('m1', () => {
                        A.get(4).get(I).const(3).shl().add().tee(A1);
                        A.get(A1).loadF().get(T1).fAdd().storeF();
                        A.get(5).get(I).const(3).shl().add().tee(A1);
                        A.get(A1).loadF().get(T2).fAdd().storeF();
                    });
                    // if !pin[j]: x[j]-=offX; y[j]-=offY
                    A.get(3).get(J).add().load8().eqz();
                    A.iff('m2', () => {
                        A.get(4).get(J).const(3).shl().add().tee(A1);
                        A.get(A1).loadF().get(T1).fSub().storeF();
                        A.get(5).get(J).const(3).shl().add().tee(A1);
                        A.get(A1).loadF().get(T2).fSub().storeF();
                    });
                    A.get(C).const(1).add().set(C);
                    A.br('cLoop');
                });
            });
            A.get(ITER).const(1).add().set(ITER);
            A.br('itLoop');
        });
    });
}

function buildFunc(soft) {
    const nParams = soft ? 15 : 12;
    // locals follow params: 6 × i32 then 7 × f64
    const L = {
        I: nParams, ITER: nParams + 1, C: nParams + 2, J: nParams + 3,
        A1: nParams + 4, A2: nParams + 5,
        VX: nParams + 6, VY: nParams + 7, DX: nParams + 8, DY: nParams + 9,
        DIST: nParams + 10, T1: nParams + 11, T2: nParams + 12,
    };
    const A = new Asm();
    emitIntegrate(A, L, soft);
    emitSatisfy(A, L);
    return {
        name: soft ? 'stepSoft' : 'stepCloth',
        params: [
            'i32', 'i32', 'i32', 'i32', 'i32', 'i32', 'i32', 'i32', 'i32', 'i32',
            'f64', 'f64', ...(soft ? ['f64', 'f64', 'f64'] : []),
        ],
        locals: ['i32', 'i32', 'i32', 'i32', 'i32', 'i32', 'f64', 'f64', 'f64', 'f64', 'f64', 'f64', 'f64'],
        body: A.bytes,
    };
}

/** Emit the physics module: stepCloth + stepSoft over imported memory. */
export function buildPhysicsBytes() {
    return buildModule({ funcs: [buildFunc(false), buildFunc(true)] });
}
