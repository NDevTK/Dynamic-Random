/**
 * @file wasm_physics.js
 * @description Verlet cloth/soft-body physics — now REAL WebAssembly. This
 * file long carried a pure-JS placeholder whose header promised "swap for
 * real WASM later without changing callers"; that promise is kept: same
 * factories, same step functions, same point objects, but the points now
 * live as f64 planes inside per-structure WebAssembly memory, and the hot
 * loops (Verlet integration + constraint relaxation) run in a kernel
 * hand-emitted through wasm_forge.js.
 *
 * Points returned by the factories are accessor objects over that memory,
 * so callers keep mutating `p.x`, `p.oldY`, `p.pinned` exactly as before.
 * The typed-array JS reference in physics_kernel.js is the spec and the
 * fallback: it is BIT-EXACT with the WASM kernel (proven in
 * tests/wasm_test.mjs), so simulation starts on it instantly and the WASM
 * kernel takes over whenever compilation lands — with zero trajectory
 * change. Plain object arrays from non-factory callers still work via the
 * legacy path.
 */

import { buildPhysicsBytes, layout, stepClothRef, stepSoftRef } from './physics_kernel.js';

const wasmPhysics = (() => {
    const hasWasm = typeof WebAssembly !== 'undefined';
    let _modulePromise = null;

    function getModule() {
        if (!_modulePromise) {
            _modulePromise = WebAssembly.compile(buildPhysicsBytes());
        }
        return _modulePromise;
    }

    function init() { /* kept for API compatibility */ }

    // -------------------------------------------------------------------------
    // Structure buffers: f64 planes in (WASM) memory + accessor point objects
    // -------------------------------------------------------------------------
    function makeBuffers(n, m) {
        const lay = layout(n, m);
        let memory = null;
        let raw;
        if (hasWasm) {
            memory = new WebAssembly.Memory({ initial: Math.max(1, Math.ceil(lay.bytes / 65536)) });
            raw = memory.buffer;
        } else {
            raw = new ArrayBuffer(lay.bytes);
        }
        const b = {
            n, m, lay,
            pin: new Uint8Array(raw, lay.pin, n),
            xs: new Float64Array(raw, lay.x, n),
            ys: new Float64Array(raw, lay.y, n),
            oxs: new Float64Array(raw, lay.ox, n),
            oys: new Float64Array(raw, lay.oy, n),
            ci: new Int32Array(raw, lay.ci, m * 2),
            rest: new Float64Array(raw, lay.rest, m),
            wasmCloth: null,
            wasmSoft: null,
        };
        b.ready = hasWasm
            ? getModule()
                .then((mod) => WebAssembly.instantiate(mod, { env: { mem: memory } }))
                .then((inst) => {
                    b.wasmCloth = inst.exports.stepCloth;
                    b.wasmSoft = inst.exports.stepSoft;
                    return true;
                })
                .catch(() => false)
            : Promise.resolve(false);
        return b;
    }

    function makePoint(b, i) {
        return {
            get x() { return b.xs[i]; }, set x(v) { b.xs[i] = v; },
            get y() { return b.ys[i]; }, set y(v) { b.ys[i] = v; },
            get oldX() { return b.oxs[i]; }, set oldX(v) { b.oxs[i] = v; },
            get oldY() { return b.oys[i]; }, set oldY(v) { b.oys[i] = v; },
            get pinned() { return b.pin[i] !== 0; }, set pinned(v) { b.pin[i] = v ? 1 : 0; },
        };
    }

    function finalize(b, pointDefs, constraintDefs) {
        const points = [];
        for (let i = 0; i < pointDefs.length; i++) {
            const d = pointDefs[i];
            b.xs[i] = d.x; b.ys[i] = d.y;
            b.oxs[i] = d.x; b.oys[i] = d.y;
            b.pin[i] = d.pinned ? 1 : 0;
            points.push(makePoint(b, i));
        }
        for (let c = 0; c < constraintDefs.length; c++) {
            const d = constraintDefs[c];
            b.ci[c * 2] = d.p1Index;
            b.ci[c * 2 + 1] = d.p2Index;
            b.rest[c] = d.restLength;
        }
        Object.defineProperty(points, '_phys', { value: b });
        return { points, constraints: constraintDefs };
    }

    // -------------------------------------------------------------------------
    // Factory: cloth grid
    // -------------------------------------------------------------------------
    function createClothGrid(cols, rows, spacing, startX, startY) {
        const pointDefs = [];
        const constraints = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                pointDefs.push({
                    x: startX + c * spacing,
                    y: startY + r * spacing,
                    pinned: r === 0, // top row pinned by default
                });
            }
        }
        // Horizontal constraints
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols - 1; c++) {
                constraints.push({ p1Index: r * cols + c, p2Index: r * cols + c + 1, restLength: spacing });
            }
        }
        // Vertical constraints
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols; c++) {
                constraints.push({ p1Index: r * cols + c, p2Index: (r + 1) * cols + c, restLength: spacing });
            }
        }
        // Diagonal shear constraints (stiffness / shape preservation)
        const diagLen = spacing * Math.SQRT2;
        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                constraints.push({ p1Index: r * cols + c, p2Index: (r + 1) * cols + c + 1, restLength: diagLen });
                constraints.push({ p1Index: r * cols + c + 1, p2Index: (r + 1) * cols + c, restLength: diagLen });
            }
        }

        return finalize(makeBuffers(pointDefs.length, constraints.length), pointDefs, constraints);
    }

    // -------------------------------------------------------------------------
    // Factory: soft body
    // -------------------------------------------------------------------------
    function createSoftBody(centerX, centerY, radius, numPoints) {
        const pointDefs = [];
        const constraints = [];
        const TWO_PI = Math.PI * 2;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * TWO_PI;
            pointDefs.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                pinned: false,
            });
        }
        // Edge constraints (perimeter)
        const perimLen = 2 * radius * Math.sin(Math.PI / numPoints);
        for (let i = 0; i < numPoints; i++) {
            constraints.push({ p1Index: i, p2Index: (i + 1) % numPoints, restLength: perimLen });
        }
        // Cross constraints for structural stiffness
        const skip = Math.max(2, Math.floor(numPoints / 4));
        for (let i = 0; i < numPoints; i++) {
            for (let s = 2; s <= skip; s++) {
                const j = (i + s) % numPoints;
                if (j <= i) continue;
                const dx = pointDefs[i].x - pointDefs[j].x;
                const dy = pointDefs[i].y - pointDefs[j].y;
                constraints.push({ p1Index: i, p2Index: j, restLength: Math.sqrt(dx * dx + dy * dy) });
            }
        }

        return finalize(makeBuffers(pointDefs.length, constraints.length), pointDefs, constraints);
    }

    // -------------------------------------------------------------------------
    // Steps: WASM kernel once compiled, bit-exact JS reference until then
    // -------------------------------------------------------------------------
    function stepCloth(points, constraints, gravity, damping, iterations) {
        const b = points._phys;
        if (!b) return legacyStepCloth(points, constraints, gravity, damping, iterations);
        if (b.wasmCloth) {
            b.wasmCloth(b.n, b.m, iterations, b.lay.pin, b.lay.x, b.lay.y,
                b.lay.ox, b.lay.oy, b.lay.ci, b.lay.rest, gravity, damping);
        } else {
            stepClothRef(b, gravity, damping, iterations);
        }
    }

    function stepSoftBody(points, constraints, pressure, gravity, damping, iterations) {
        const b = points._phys;
        if (!b) return legacyStepSoftBody(points, constraints, pressure, gravity, damping, iterations);
        // Centroid (JS-side for both kernels — identical input either way)
        let cx = 0, cy = 0;
        for (let i = 0; i < b.n; i++) { cx += b.xs[i]; cy += b.ys[i]; }
        cx /= b.n;
        cy /= b.n;
        if (b.wasmSoft) {
            b.wasmSoft(b.n, b.m, iterations, b.lay.pin, b.lay.x, b.lay.y,
                b.lay.ox, b.lay.oy, b.lay.ci, b.lay.rest, gravity, damping, pressure, cx, cy);
        } else {
            stepSoftRef(b, pressure, gravity, damping, iterations, cx, cy);
        }
    }

    /**
     * Apply an impulse force to all points within `radius` of (atX, atY).
     * Force falls off linearly with distance. (Cheap and call-rate-bound, so
     * it runs in JS through the accessors for both kernel paths.)
     */
    function applyForceAt(points, forceX, forceY, atX, atY, radius) {
        const r2 = radius * radius;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;
            const dx = p.x - atX;
            const dy = p.y - atY;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
                const falloff = 1 - Math.sqrt(d2) / radius;
                // Modify oldX/oldY to inject velocity into Verlet
                p.oldX -= forceX * falloff;
                p.oldY -= forceY * falloff;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Legacy path: plain object arrays from non-factory callers keep working
    // -------------------------------------------------------------------------
    function legacySatisfy(points, constraints, iterations) {
        for (let iter = 0; iter < iterations; iter++) {
            for (let ci = 0; ci < constraints.length; ci++) {
                const c = constraints[ci];
                const p1 = points[c.p1Index];
                const p2 = points[c.p2Index];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
                const diff = (dist - c.restLength) / dist * 0.5;
                const offsetX = dx * diff;
                const offsetY = dy * diff;
                if (!p1.pinned) { p1.x += offsetX; p1.y += offsetY; }
                if (!p2.pinned) { p2.x -= offsetX; p2.y -= offsetY; }
            }
        }
    }

    function legacyStepCloth(points, constraints, gravity, damping, iterations) {
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;
            const vx = (p.x - p.oldX) * damping;
            const vy = (p.y - p.oldY) * damping;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy + gravity;
        }
        legacySatisfy(points, constraints, iterations);
    }

    function legacyStepSoftBody(points, constraints, pressure, gravity, damping, iterations) {
        let cx = 0, cy = 0;
        for (let i = 0; i < points.length; i++) { cx += points[i].x; cy += points[i].y; }
        cx /= points.length;
        cy /= points.length;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;
            const vx = (p.x - p.oldX) * damping;
            const vy = (p.y - p.oldY) * damping;
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const px = (dx / dist) * pressure;
            const py = (dy / dist) * pressure;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx + px;
            p.y += vy + py + gravity;
        }
        legacySatisfy(points, constraints, iterations);
    }

    return {
        init,
        createClothGrid,
        createSoftBody,
        stepCloth,
        stepSoftBody,
        applyForceAt,
    };
})();

export { wasmPhysics };
