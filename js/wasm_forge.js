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

/**
 * Build a complete module: one exported function `step` over one imported
 * memory env.mem.
 * @param {object} spec
 * @param {number} spec.params - number of i32 parameters
 * @param {number} spec.locals - number of extra i32 locals
 * @param {number[]} spec.body - function body bytes (without the final end)
 * @returns {Uint8Array} a valid .wasm binary
 */
export function buildModule({ params, locals, body }) {
    const typeSec = section(1, vec([
        [0x60, ...uleb(params), ...Array(params).fill(0x7f), 0x00],
    ]));
    const importSec = section(2, vec([
        // "env" "mem" memory, limits: min 1 page (instantiation may pass more)
        [...uleb(3), 0x65, 0x6e, 0x76, ...uleb(3), 0x6d, 0x65, 0x6d, 0x02, 0x00, ...uleb(1)],
    ]));
    const funcSec = section(3, vec([[0x00]]));
    const exportSec = section(7, vec([
        [...uleb(4), 0x73, 0x74, 0x65, 0x70, 0x00, 0x00], // "step" func 0
    ]));
    const bodyBytes = [
        ...vec(locals > 0 ? [[...uleb(locals), 0x7f]] : []),
        ...body,
        0x0b,
    ];
    const codeSec = section(10, vec([[...uleb(bodyBytes.length), ...bodyBytes]]));

    return Uint8Array.from([
        0x00, 0x61, 0x73, 0x6d, // \0asm
        0x01, 0x00, 0x00, 0x00, // version 1
        ...typeSec, ...importSec, ...funcSec, ...exportSec, ...codeSec,
    ]);
}
