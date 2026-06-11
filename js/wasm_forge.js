/**
 * @file wasm_forge.js
 * @description An in-house WebAssembly assembler. No toolchain, no build
 * step, no .wasm files: this module emits a valid WebAssembly binary
 * byte-by-byte at runtime (magic, sections, LEB128, opcodes), so the site
 * can carry genuinely compiled compute kernels while staying a plain static
 * page. Used by alchemy_kernel.js for the falling-sand simulation.
 *
 * Scope is deliberately tiny: one exported function over one imported
 * memory, i32 locals only — exactly what a cellular kernel needs. The body
 * is written through a tiny structured assembler with NAMED control labels,
 * so branch depths are computed instead of hand-counted (hand-counted
 * depths are how hand-written WASM dies).
 */

/** Unsigned LEB128. */
export function uleb(n) {
    const out = [];
    do {
        let b = n & 0x7f;
        n >>>= 7;
        if (n !== 0) b |= 0x80;
        out.push(b);
    } while (n !== 0);
    return out;
}

/** Signed LEB128. */
export function sleb(n) {
    const out = [];
    let more = true;
    while (more) {
        let b = n & 0x7f;
        n >>= 7;
        if ((n === 0 && (b & 0x40) === 0) || (n === -1 && (b & 0x40) !== 0)) {
            more = false;
        } else {
            b |= 0x80;
        }
        out.push(b);
    }
    return out;
}

function section(id, bytes) {
    return [id, ...uleb(bytes.length), ...bytes];
}

function vec(items) {
    return [...uleb(items.length), ...items.flat()];
}

/**
 * Structured function-body assembler. All values are i32.
 * Control flow uses named labels: block/loop/iff push a label, br/brIf
 * compute the relative depth from the live control stack.
 */
export class Asm {
    constructor() {
        this.bytes = [];
        this._ctrl = [];
    }

    _depthOf(label) {
        for (let i = this._ctrl.length - 1; i >= 0; i--) {
            if (this._ctrl[i] === label) return this._ctrl.length - 1 - i;
        }
        throw new Error(`unknown label ${label} (live: ${this._ctrl.join(',')})`);
    }

    raw(...b) { this.bytes.push(...b); return this; }

    const(n) { return this.raw(0x41, ...sleb(n | 0)); }
    get(i) { return this.raw(0x20, ...uleb(i)); }
    set(i) { return this.raw(0x21, ...uleb(i)); }
    tee(i) { return this.raw(0x22, ...uleb(i)); }

    load8(offset = 0) { return this.raw(0x2d, 0x00, ...uleb(offset)); }   // i32.load8_u
    store8(offset = 0) { return this.raw(0x3a, 0x00, ...uleb(offset)); }  // i32.store8
    load32(offset = 0) { return this.raw(0x28, 0x02, ...uleb(offset)); }  // i32.load
    loadF(offset = 0) { return this.raw(0x2b, 0x03, ...uleb(offset)); }   // f64.load
    storeF(offset = 0) { return this.raw(0x39, 0x03, ...uleb(offset)); }  // f64.store

    constF(v) { // f64.const
        const b = new Uint8Array(8);
        new DataView(b.buffer).setFloat64(0, v, true);
        return this.raw(0x44, ...b);
    }
    fAdd() { return this.raw(0xa0); }
    fSub() { return this.raw(0xa1); }
    fMul() { return this.raw(0xa2); }
    fDiv() { return this.raw(0xa3); }
    fSqrt() { return this.raw(0x9f); }
    fEq() { return this.raw(0x61); }
    fLt() { return this.raw(0x63); }

    add() { return this.raw(0x6a); }
    sub() { return this.raw(0x6b); }
    mul() { return this.raw(0x6c); }
    and() { return this.raw(0x71); }
    or() { return this.raw(0x72); }
    xor() { return this.raw(0x73); }
    shl() { return this.raw(0x74); }
    shrU() { return this.raw(0x76); }
    eq() { return this.raw(0x46); }
    ne() { return this.raw(0x47); }
    eqz() { return this.raw(0x45); }
    ltS() { return this.raw(0x48); }
    ltU() { return this.raw(0x49); }
    gtS() { return this.raw(0x4a); }
    geS() { return this.raw(0x4e); }
    leS() { return this.raw(0x4c); }

    block(label, fn) {
        this.raw(0x02, 0x40);
        this._ctrl.push(label);
        fn();
        this._ctrl.pop();
        return this.raw(0x0b);
    }

    loop(label, fn) {
        this.raw(0x03, 0x40);
        this._ctrl.push(label);
        fn();
        this._ctrl.pop();
        return this.raw(0x0b);
    }

    /** if (TOS != 0) { thenFn } else { elseFn } — label participates in depth. */
    iff(label, thenFn, elseFn) {
        this.raw(0x04, 0x40);
        this._ctrl.push(label);
        thenFn();
        if (elseFn) {
            this.raw(0x05);
            elseFn();
        }
        this._ctrl.pop();
        return this.raw(0x0b);
    }

    br(label) { return this.raw(0x0c, ...uleb(this._depthOf(label))); }
    brIf(label) { return this.raw(0x0d, ...uleb(this._depthOf(label))); }
}

const TYPE = { i32: 0x7f, f64: 0x7c };

function strBytes(s) {
    return [...uleb(s.length), ...Array.from(s, (c) => c.charCodeAt(0))];
}

/** Group consecutive same-type locals into WASM local declarations. */
function localGroups(types) {
    const groups = [];
    for (const t of types) {
        const last = groups[groups.length - 1];
        if (last && last.t === t) last.n++;
        else groups.push({ t, n: 1 });
    }
    return groups.map((g) => [...uleb(g.n), TYPE[g.t]]);
}

/**
 * Build a complete module over one imported memory env.mem.
 *
 * Two forms:
 *  - Legacy single function (used by alchemy_kernel.js):
 *      { params: <i32 count>, locals: <i32 count>, body }  → exports "step"
 *  - Multi-function with typed signatures:
 *      { funcs: [{ name, params: ['i32','f64',...], locals: [...types], body }] }
 *
 * @returns {Uint8Array} a valid .wasm binary
 */
export function buildModule(spec) {
    const funcs = spec.funcs || [{
        name: 'step',
        params: Array(spec.params).fill('i32'),
        locals: Array(spec.locals).fill('i32'),
        body: spec.body,
    }];

    const typeSec = section(1, vec(funcs.map((f) =>
        [0x60, ...uleb(f.params.length), ...f.params.map((t) => TYPE[t]), 0x00]
    )));
    const importSec = section(2, vec([
        // "env" "mem" memory, limits: min 1 page (instantiation may pass more)
        [...strBytes('env'), ...strBytes('mem'), 0x02, 0x00, ...uleb(1)],
    ]));
    const funcSec = section(3, vec(funcs.map((_, i) => [...uleb(i)])));
    const exportSec = section(7, vec(funcs.map((f, i) =>
        [...strBytes(f.name), 0x00, ...uleb(i)]
    )));
    const codeSec = section(10, vec(funcs.map((f) => {
        const bodyBytes = [...vec(localGroups(f.locals)), ...f.body, 0x0b];
        return [...uleb(bodyBytes.length), ...bodyBytes];
    })));

    return Uint8Array.from([
        0x00, 0x61, 0x73, 0x6d, // \0asm
        0x01, 0x00, 0x00, 0x00, // version 1
        ...typeSec, ...importSec, ...funcSec, ...exportSec, ...codeSec,
    ]);
}
