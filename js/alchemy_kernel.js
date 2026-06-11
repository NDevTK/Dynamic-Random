/**
 * @file alchemy_kernel.js
 * @description The falling-sand chemistry kernel, twice: a plain-JS
 * reference implementation (the spec, and the fallback) and a WebAssembly
 * transcription emitted through wasm_forge.js. Both read the same memory
 * layout and the same per-universe chemistry parameters, and must produce
 * IDENTICAL grids tick-for-tick — tests/wasm_test.mjs cross-validates them
 * cell-exactly, which is what makes hand-assembled WASM tractable.
 *
 * Memory layout (one buffer):
 *   bytes 0..63   chemistry parameters (probabilities 0-255, see PARAM)
 *   bytes 64..    the grid, w*h cells, row-major
 *
 * Cell byte: [ moved-flag : 1 ][ age : 3 ][ element : 4 ]
 * The moved-flag marks cells written by a move this tick so the single
 * bottom-up scan never double-steps them; it is cleared when next visited.
 *
 * Per-cell randomness is a hash of (index, tick) — no state, so the JS and
 * WASM kernels stay bit-identical and every seed replays deterministically.
 */

import { Asm, buildModule } from './wasm_forge.js';

export const GRID_BASE = 64;

export const EL = {
    EMPTY: 0, ROCK: 1, SAND: 2, WATER: 3, FIRE: 4, PLANT: 5, SMOKE: 6, LAVA: 7,
};

export const PARAM = {
    FIRE_SPREAD: 0, // chance fire/lava ignites an adjacent plant
    FIRE_RISE: 1,   // chance fire licks upward
    SMOKE_DECAY: 2, // chance smoke dissipates this tick
    PLANT_GROW: 3,  // chance a plant converts adjacent water
    WATER_FLOW: 4,  // chance water spreads sideways
    LAVA_FLOW: 5,   // chance lava moves at all (viscosity)
    LAVA_COOL: 6,   // chance lava turns to rock when quenching water
};

const FLAG = 0x80;

// Neighbor probe order: left, right, up, down — with hash bit-slices 2/8/14/20
const N_SHIFT = [2, 8, 14, 20];

/**
 * The reference implementation — this is the spec. `g` is the full memory
 * (params + grid); parameters are read from g[PARAM.*].
 */
export function stepRef(g, w, h, tick) {
    const B = GRID_BASE;
    for (let y = h - 1; y >= 0; y--) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const p = B + idx;
            const c = g[p];
            if (c & FLAG) { g[p] = c & 0x7f; continue; }
            const el = c & 15;
            if (el < EL.SAND) continue;

            let hsh = Math.imul(idx + 1, 0x9E3779B1) ^ Math.imul(tick + 1, 0x85EBCA6B);
            hsh = Math.imul(hsh ^ (hsh >>> 15), 0xC2B2AE35);
            const dx1 = ((hsh >>> 1) & 1) ? 1 : -1;
            const sMove = (hsh >>> 4) & 255;
            const sAlt = (hsh >>> 12) & 255;
            const age = (c >> 4) & 7;

            const swap = (q) => {
                const t = g[q];
                g[q] = (c & 0x7f) | FLAG;
                g[p] = t & 0x7f;
            };

            if (el === EL.SAND) {
                if (y < h - 1) {
                    let q = p + w;
                    let tl = g[q] & 15;
                    if (tl === EL.EMPTY || tl === EL.WATER || tl === EL.SMOKE) { swap(q); continue; }
                    if (x + dx1 >= 0 && x + dx1 < w) {
                        q = p + w + dx1; tl = g[q] & 15;
                        if (tl === EL.EMPTY || tl === EL.WATER || tl === EL.SMOKE) { swap(q); continue; }
                    }
                    if (x - dx1 >= 0 && x - dx1 < w) {
                        q = p + w - dx1; tl = g[q] & 15;
                        if (tl === EL.EMPTY || tl === EL.WATER || tl === EL.SMOKE) { swap(q); continue; }
                    }
                }
            } else if (el === EL.WATER) {
                let moved = false;
                if (y < h - 1) {
                    let q = p + w;
                    let tl = g[q] & 15;
                    if (tl === EL.EMPTY || tl === EL.SMOKE) { swap(q); moved = true; }
                    if (!moved && x + dx1 >= 0 && x + dx1 < w) {
                        q = p + w + dx1; tl = g[q] & 15;
                        if (tl === EL.EMPTY || tl === EL.SMOKE) { swap(q); moved = true; }
                    }
                    if (!moved && x - dx1 >= 0 && x - dx1 < w) {
                        q = p + w - dx1; tl = g[q] & 15;
                        if (tl === EL.EMPTY || tl === EL.SMOKE) { swap(q); moved = true; }
                    }
                }
                if (!moved && sMove < g[PARAM.WATER_FLOW]) {
                    if (x + dx1 >= 0 && x + dx1 < w) {
                        const q = p + dx1;
                        if ((g[q] & 15) === EL.EMPTY) swap(q);
                    }
                }
            } else if (el === EL.FIRE) {
                // Ignite adjacent plants first (even a dying flame spreads)
                for (let k = 0; k < 4; k++) {
                    const q = k === 0 ? p - 1 : k === 1 ? p + 1 : k === 2 ? p - w : p + w;
                    const ok = k === 0 ? x > 0 : k === 1 ? x < w - 1 : k === 2 ? y > 0 : y < h - 1;
                    if (!ok) continue;
                    if ((g[q] & 15) === EL.PLANT && ((hsh >>> N_SHIFT[k]) & 255) < g[PARAM.FIRE_SPREAD]) {
                        g[q] = EL.FIRE | FLAG;
                    }
                }
                if (age >= 7) { g[p] = EL.SMOKE; continue; }
                g[p] = EL.FIRE | ((age + 1) << 4);
                if (y > 0 && sMove < g[PARAM.FIRE_RISE]) {
                    const q = p - w;
                    if ((g[q] & 15) === EL.EMPTY) {
                        g[q] = (EL.FIRE | ((age + 1) << 4)) | FLAG;
                        g[p] = EL.EMPTY;
                    }
                }
            } else if (el === EL.PLANT) {
                for (let k = 0; k < 4; k++) {
                    const q = k === 0 ? p - 1 : k === 1 ? p + 1 : k === 2 ? p - w : p + w;
                    const ok = k === 0 ? x > 0 : k === 1 ? x < w - 1 : k === 2 ? y > 0 : y < h - 1;
                    if (!ok) continue;
                    if ((g[q] & 15) === EL.WATER && ((hsh >>> N_SHIFT[k]) & 255) < g[PARAM.PLANT_GROW]) {
                        g[q] = EL.PLANT | FLAG;
                    }
                }
            } else if (el === EL.SMOKE) {
                if (age >= 7 || sAlt < g[PARAM.SMOKE_DECAY]) { g[p] = EL.EMPTY; continue; }
                const aged = EL.SMOKE | ((age + 1) << 4);
                g[p] = aged;
                if (y > 0) {
                    let q = p - w;
                    if ((g[q] & 15) === EL.EMPTY) { g[q] = aged | FLAG; g[p] = EL.EMPTY; continue; }
                    if (x + dx1 >= 0 && x + dx1 < w) {
                        q = p - w + dx1;
                        if ((g[q] & 15) === EL.EMPTY) { g[q] = aged | FLAG; g[p] = EL.EMPTY; continue; }
                    }
                    if (x - dx1 >= 0 && x - dx1 < w) {
                        q = p - w - dx1;
                        if ((g[q] & 15) === EL.EMPTY) { g[q] = aged | FLAG; g[p] = EL.EMPTY; continue; }
                    }
                }
            } else if (el === EL.LAVA) {
                let cooled = false;
                for (let k = 0; k < 4; k++) {
                    const q = k === 0 ? p - 1 : k === 1 ? p + 1 : k === 2 ? p - w : p + w;
                    const ok = k === 0 ? x > 0 : k === 1 ? x < w - 1 : k === 2 ? y > 0 : y < h - 1;
                    if (!ok) continue;
                    const tl = g[q] & 15;
                    if (tl === EL.WATER) {
                        g[q] = EL.SMOKE | FLAG; // quench → steam
                        if (sAlt < g[PARAM.LAVA_COOL]) { g[p] = EL.ROCK; cooled = true; break; }
                    } else if (tl === EL.PLANT && ((hsh >>> N_SHIFT[k]) & 255) < g[PARAM.FIRE_SPREAD]) {
                        g[q] = EL.FIRE | FLAG;
                    }
                }
                if (cooled) continue;
                if (sMove < g[PARAM.LAVA_FLOW]) {
                    let moved = false;
                    if (y < h - 1) {
                        let q = p + w;
                        if ((g[q] & 15) === EL.EMPTY) { swap(q); moved = true; }
                        if (!moved && x + dx1 >= 0 && x + dx1 < w) {
                            q = p + w + dx1;
                            if ((g[q] & 15) === EL.EMPTY) { swap(q); moved = true; }
                        }
                        if (!moved && x - dx1 >= 0 && x - dx1 < w) {
                            q = p + w - dx1;
                            if ((g[q] & 15) === EL.EMPTY) { swap(q); moved = true; }
                        }
                    }
                    if (!moved && x + dx1 >= 0 && x + dx1 < w) {
                        const q = p + dx1;
                        if ((g[q] & 15) === EL.EMPTY) swap(q);
                    }
                }
            }
        }
    }
}

// ───────────────────────── WASM transcription ───────────────────────────────
// Locals: 0 w, 1 h, 2 tick (params); 3 y, 4 x, 5 idx, 6 p, 7 c, 8 el, 9 age,
// 10 hsh, 11 dx1, 12 q, 13 t, 14 nx, 15 aged
const W = 0, H = 1, TICK = 2, Y = 3, X = 4, IDX = 5, P = 6, C = 7, ELv = 8,
    AGE = 9, HSH = 10, DX1 = 11, Q = 12, T = 13, NX = 14, AGED = 15;

/** Emit a valid .wasm binary implementing exactly stepRef. */
export function buildKernelBytes() {
    const A = new Asm();

    // mem[q] = (c & 0x7f) | FLAG; mem[p] = mem_q_prev & 0x7f   (Q must be set)
    const swap = () => {
        A.get(Q).load8(); A.set(T);
        A.get(Q); A.get(C).const(0x7f).and().const(FLAG).or(); A.store8();
        A.get(P); A.get(T).const(0x7f).and(); A.store8();
    };
    const param = (off) => { A.const(0).load8(off); };
    // tl = mem[Q] & 15  → leaves value on stack
    const neighborEl = () => { A.get(Q).load8().const(15).and(); };
    // x+sign*dx1 in bounds? → leaves i32 bool on stack (also sets NX)
    const diagInBounds = (sign) => {
        A.get(X);
        if (sign > 0) A.get(DX1).add(); else A.get(DX1).sub();
        A.tee(NX).const(0).geS();
        A.get(NX).get(W).ltS();
        A.and();
    };
    // "el is one of" mask check: el==a || el==b || el==c (values on stack)
    const elIs = (vals) => {
        vals.forEach((v, i) => {
            A.get(T).const(15).and().const(v).eq();
            if (i > 0) A.or();
        });
    };
    // load neighbor into T then test membership
    const neighborIn = (vals) => {
        A.get(Q).load8().set(T);
        elIs(vals);
    };

    // y = h - 1
    A.get(H).const(1).sub().set(Y);
    A.block('yEnd', () => {
        A.loop('yLoop', () => {
            A.get(Y).const(0).ltS().brIf('yEnd');
            A.const(0).set(X);
            A.block('xEnd', () => {
                A.loop('xLoop', () => {
                    A.get(X).get(W).geS().brIf('xEnd');
                    A.block('cell', () => {
                        // idx = y*w + x; p = GRID_BASE + idx; c = mem[p]
                        A.get(Y).get(W).mul().get(X).add().set(IDX);
                        A.get(IDX).const(GRID_BASE).add().set(P);
                        A.get(P).load8().set(C);
                        // moved-flag: clear and skip
                        A.get(C).const(FLAG).and();
                        A.iff('fl', () => {
                            A.get(P); A.get(C).const(0x7f).and(); A.store8();
                            A.br('cell');
                        });
                        // el = c & 15; skip EMPTY/ROCK
                        A.get(C).const(15).and().set(ELv);
                        A.get(ELv).const(EL.SAND).ltS().brIf('cell');
                        // hash
                        A.get(IDX).const(1).add().const(0x9E3779B1 | 0).mul();
                        A.get(TICK).const(1).add().const(0x85EBCA6B | 0).mul();
                        A.xor().set(HSH);
                        A.get(HSH).get(HSH).const(15).shrU().xor().const(0xC2B2AE35 | 0).mul().set(HSH);
                        // dx1 = ((hsh>>>1)&1) ? 1 : -1
                        A.get(HSH).const(1).shrU().const(1).and();
                        A.iff('d1', () => { A.const(1).set(DX1); }, () => { A.const(-1).set(DX1); });
                        // age = (c>>4)&7
                        A.get(C).const(4).shrU().const(7).and().set(AGE);

                        // ── SAND ──
                        A.get(ELv).const(EL.SAND).eq();
                        A.iff('sand', () => {
                            A.get(Y).get(H).const(1).sub().ltS();
                            A.iff('sandFall', () => {
                                A.get(P).get(W).add().set(Q);
                                neighborIn([EL.EMPTY, EL.WATER, EL.SMOKE]);
                                A.iff('sd', () => { swap(); A.br('cell'); });
                                diagInBounds(+1);
                                A.iff('sdg1', () => {
                                    A.get(P).get(W).add().get(DX1).add().set(Q);
                                    neighborIn([EL.EMPTY, EL.WATER, EL.SMOKE]);
                                    A.iff('sd1', () => { swap(); A.br('cell'); });
                                });
                                diagInBounds(-1);
                                A.iff('sdg2', () => {
                                    A.get(P).get(W).add().get(DX1).sub().set(Q);
                                    neighborIn([EL.EMPTY, EL.WATER, EL.SMOKE]);
                                    A.iff('sd2', () => { swap(); A.br('cell'); });
                                });
                            });
                            A.br('cell');
                        });

                        // ── WATER ──
                        A.get(ELv).const(EL.WATER).eq();
                        A.iff('water', () => {
                            A.get(Y).get(H).const(1).sub().ltS();
                            A.iff('wFall', () => {
                                A.get(P).get(W).add().set(Q);
                                neighborIn([EL.EMPTY, EL.SMOKE]);
                                A.iff('wd', () => { swap(); A.br('cell'); });
                                diagInBounds(+1);
                                A.iff('wdg1', () => {
                                    A.get(P).get(W).add().get(DX1).add().set(Q);
                                    neighborIn([EL.EMPTY, EL.SMOKE]);
                                    A.iff('wd1', () => { swap(); A.br('cell'); });
                                });
                                diagInBounds(-1);
                                A.iff('wdg2', () => {
                                    A.get(P).get(W).add().get(DX1).sub().set(Q);
                                    neighborIn([EL.EMPTY, EL.SMOKE]);
                                    A.iff('wd2', () => { swap(); A.br('cell'); });
                                });
                            });
                            // horizontal flow
                            A.get(HSH).const(4).shrU().const(255).and();
                            param(PARAM.WATER_FLOW); A.ltU();
                            A.iff('wflow', () => {
                                diagInBounds(+1);
                                A.iff('wh', () => {
                                    A.get(P).get(DX1).add().set(Q);
                                    neighborIn([EL.EMPTY]);
                                    A.iff('whm', () => { swap(); });
                                });
                            });
                            A.br('cell');
                        });

                        // ── FIRE ──
                        A.get(ELv).const(EL.FIRE).eq();
                        A.iff('fire', () => {
                            // ignite the four neighbors
                            const ignite = (k, boundFn, qFn) => {
                                boundFn();
                                A.iff(`fb${k}`, () => {
                                    qFn();
                                    neighborEl(); A.const(EL.PLANT).eq();
                                    A.get(HSH).const(N_SHIFT[k]).shrU().const(255).and();
                                    param(PARAM.FIRE_SPREAD); A.ltU();
                                    A.and();
                                    A.iff(`fi${k}`, () => {
                                        A.get(Q).const(EL.FIRE | FLAG).store8();
                                    });
                                });
                            };
                            ignite(0, () => A.get(X).const(0).gtS(), () => A.get(P).const(1).sub().set(Q));
                            ignite(1, () => A.get(X).get(W).const(1).sub().ltS(), () => A.get(P).const(1).add().set(Q));
                            ignite(2, () => A.get(Y).const(0).gtS(), () => A.get(P).get(W).sub().set(Q));
                            ignite(3, () => A.get(Y).get(H).const(1).sub().ltS(), () => A.get(P).get(W).add().set(Q));
                            // burn out → smoke
                            A.get(AGE).const(7).geS();
                            A.iff('fout', () => {
                                A.get(P).const(EL.SMOKE).store8();
                                A.br('cell');
                            });
                            // age in place
                            A.const(EL.FIRE).get(AGE).const(1).add().const(4).shl().or().set(AGED);
                            A.get(P).get(AGED).store8();
                            // rise
                            A.get(Y).const(0).gtS();
                            A.get(HSH).const(4).shrU().const(255).and();
                            param(PARAM.FIRE_RISE); A.ltU();
                            A.and();
                            A.iff('frise', () => {
                                A.get(P).get(W).sub().set(Q);
                                neighborIn([EL.EMPTY]);
                                A.iff('fr', () => {
                                    A.get(Q).get(AGED).const(FLAG).or().store8();
                                    A.get(P).const(EL.EMPTY).store8();
                                });
                            });
                            A.br('cell');
                        });

                        // ── PLANT ──
                        A.get(ELv).const(EL.PLANT).eq();
                        A.iff('plant', () => {
                            const grow = (k, boundFn, qFn) => {
                                boundFn();
                                A.iff(`pb${k}`, () => {
                                    qFn();
                                    neighborEl(); A.const(EL.WATER).eq();
                                    A.get(HSH).const(N_SHIFT[k]).shrU().const(255).and();
                                    param(PARAM.PLANT_GROW); A.ltU();
                                    A.and();
                                    A.iff(`pg${k}`, () => {
                                        A.get(Q).const(EL.PLANT | FLAG).store8();
                                    });
                                });
                            };
                            grow(0, () => A.get(X).const(0).gtS(), () => A.get(P).const(1).sub().set(Q));
                            grow(1, () => A.get(X).get(W).const(1).sub().ltS(), () => A.get(P).const(1).add().set(Q));
                            grow(2, () => A.get(Y).const(0).gtS(), () => A.get(P).get(W).sub().set(Q));
                            grow(3, () => A.get(Y).get(H).const(1).sub().ltS(), () => A.get(P).get(W).add().set(Q));
                            A.br('cell');
                        });

                        // ── SMOKE ──
                        A.get(ELv).const(EL.SMOKE).eq();
                        A.iff('smoke', () => {
                            A.get(AGE).const(7).geS();
                            A.get(HSH).const(12).shrU().const(255).and();
                            param(PARAM.SMOKE_DECAY); A.ltU();
                            A.or();
                            A.iff('sgone', () => {
                                A.get(P).const(EL.EMPTY).store8();
                                A.br('cell');
                            });
                            A.const(EL.SMOKE).get(AGE).const(1).add().const(4).shl().or().set(AGED);
                            A.get(P).get(AGED).store8();
                            A.get(Y).const(0).gtS();
                            A.iff('sUp', () => {
                                const riseTo = (label, qFn) => {
                                    qFn();
                                    neighborIn([EL.EMPTY]);
                                    A.iff(label, () => {
                                        A.get(Q).get(AGED).const(FLAG).or().store8();
                                        A.get(P).const(EL.EMPTY).store8();
                                        A.br('cell');
                                    });
                                };
                                riseTo('sr0', () => A.get(P).get(W).sub().set(Q));
                                diagInBounds(+1);
                                A.iff('srg1', () => {
                                    riseTo('sr1', () => A.get(P).get(W).sub().get(DX1).add().set(Q));
                                });
                                diagInBounds(-1);
                                A.iff('srg2', () => {
                                    riseTo('sr2', () => A.get(P).get(W).sub().get(DX1).sub().set(Q));
                                });
                            });
                            A.br('cell');
                        });

                        // ── LAVA ──
                        A.get(ELv).const(EL.LAVA).eq();
                        A.iff('lava', () => {
                            const touch = (k, boundFn, qFn) => {
                                boundFn();
                                A.iff(`lb${k}`, () => {
                                    qFn();
                                    A.get(Q).load8().const(15).and().set(T);
                                    A.get(T).const(EL.WATER).eq();
                                    A.iff(`lw${k}`, () => {
                                        A.get(Q).const(EL.SMOKE | FLAG).store8();
                                        A.get(HSH).const(12).shrU().const(255).and();
                                        param(PARAM.LAVA_COOL); A.ltU();
                                        A.iff(`lc${k}`, () => {
                                            A.get(P).const(EL.ROCK).store8();
                                            A.br('cell'); // cooled: done with this cell
                                        });
                                    }, () => {
                                        A.get(T).const(EL.PLANT).eq();
                                        A.get(HSH).const(N_SHIFT[k]).shrU().const(255).and();
                                        param(PARAM.FIRE_SPREAD); A.ltU();
                                        A.and();
                                        A.iff(`lp${k}`, () => {
                                            A.get(Q).const(EL.FIRE | FLAG).store8();
                                        });
                                    });
                                });
                            };
                            touch(0, () => A.get(X).const(0).gtS(), () => A.get(P).const(1).sub().set(Q));
                            touch(1, () => A.get(X).get(W).const(1).sub().ltS(), () => A.get(P).const(1).add().set(Q));
                            touch(2, () => A.get(Y).const(0).gtS(), () => A.get(P).get(W).sub().set(Q));
                            touch(3, () => A.get(Y).get(H).const(1).sub().ltS(), () => A.get(P).get(W).add().set(Q));
                            // viscous movement
                            A.get(HSH).const(4).shrU().const(255).and();
                            param(PARAM.LAVA_FLOW); A.ltU();
                            A.iff('lmv', () => {
                                A.get(Y).get(H).const(1).sub().ltS();
                                A.iff('lFall', () => {
                                    A.get(P).get(W).add().set(Q);
                                    neighborIn([EL.EMPTY]);
                                    A.iff('ld', () => { swap(); A.br('cell'); });
                                    diagInBounds(+1);
                                    A.iff('ldg1', () => {
                                        A.get(P).get(W).add().get(DX1).add().set(Q);
                                        neighborIn([EL.EMPTY]);
                                        A.iff('ld1', () => { swap(); A.br('cell'); });
                                    });
                                    diagInBounds(-1);
                                    A.iff('ldg2', () => {
                                        A.get(P).get(W).add().get(DX1).sub().set(Q);
                                        neighborIn([EL.EMPTY]);
                                        A.iff('ld2', () => { swap(); A.br('cell'); });
                                    });
                                });
                                diagInBounds(+1);
                                A.iff('lh', () => {
                                    A.get(P).get(DX1).add().set(Q);
                                    neighborIn([EL.EMPTY]);
                                    A.iff('lhm', () => { swap(); });
                                });
                            });
                            A.br('cell');
                        });
                    });
                    // x++
                    A.get(X).const(1).add().set(X);
                    A.br('xLoop');
                });
            });
            // y--
            A.get(Y).const(1).sub().set(Y);
            A.br('yLoop');
        });
    });

    return buildModule({ params: 3, locals: 13, body: A.bytes });
}

/**
 * Instantiate the WASM kernel over an imported memory.
 * @param {WebAssembly.Memory} memory
 * @returns {Promise<function(w,h,tick):void>} the compiled step()
 */
export async function instantiateKernel(memory) {
    const bytes = buildKernelBytes();
    const { instance } = await WebAssembly.instantiate(bytes, { env: { mem: memory } });
    return instance.exports.step;
}
